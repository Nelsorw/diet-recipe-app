from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date, timedelta
from models.models import User, MealLog, UserProfile
from utils.nutrition import get_user_targets, generate_nutrition_tips

progress_bp = Blueprint('progress', __name__)


def _get_active_profile(user):
    """Return the user's active profile, falling back to their first profile."""
    if user.active_profile_id:
        profile = UserProfile.query.filter_by(
            id=user.active_profile_id, user_id=user.id
        ).first()
        if profile:
            return profile
    return UserProfile.query.filter_by(user_id=user.id).first()


def _calc_streak(user_id: int, profile_id: int) -> int:
    """Count consecutive days with at least one meal logged ending today."""
    streak = 0
    check  = date.today()
    while True:
        logs = MealLog.query.filter_by(user_id=user_id, profile_id=profile_id, log_date=check).first()
        if not logs:
            break
        streak += 1
        check  -= timedelta(days=1)
    return streak


def _perfect_day(consumed: dict, targets: dict) -> bool:
    """True if all 4 macros are within 10% under or any amount over target."""
    def hit(actual, target):
        if not target:
            return True
        return actual >= target * 0.9
    return (
        hit(consumed['calories'], targets.get('daily_calories', 0)) and
        hit(consumed['protein'],  targets.get('protein_g', 0))      and
        hit(consumed['carbs'],    targets.get('carbs_g', 0))        and
        hit(consumed['fat'],      targets.get('fat_g', 0))
    )


@progress_bp.route('', methods=['GET'])
@jwt_required()
def get_progress():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)

    if not profile:
        return jsonify({'error': 'Please complete your profile first.'}), 400

    targets = get_user_targets(profile)
    today   = date.today()
    logs    = MealLog.query.filter_by(user_id=user_id, profile_id=profile.id, log_date=today).all()

    consumed = {
        'calories' : round(sum(l.calories for l in logs), 2),
        'protein'  : round(sum(l.protein  for l in logs), 2),
        'carbs'    : round(sum(l.carbs    for l in logs), 2),
        'fat'      : round(sum(l.fat      for l in logs), 2)
    }

    pct_calories = round((consumed['calories'] / targets['daily_calories']) * 100, 1) if targets['daily_calories'] else 0
    tips         = generate_nutrition_tips(consumed, targets)
    streak       = _calc_streak(user_id, profile.id)
    is_perfect   = _perfect_day(consumed, targets)

    # macros breakdown for donut (% of total calories from each macro)
    protein_cal = consumed['protein'] * 4
    carbs_cal   = consumed['carbs']   * 4
    fat_cal     = consumed['fat']     * 9
    total_macro_cal = protein_cal + carbs_cal + fat_cal or 1

    macros_pct = {
        'protein' : round((protein_cal / total_macro_cal) * 100, 1),
        'carbs'   : round((carbs_cal   / total_macro_cal) * 100, 1),
        'fat'     : round((fat_cal     / total_macro_cal) * 100, 1),
    }

    return jsonify({
        'date'            : today.isoformat(),
        'daily_targets'   : targets,
        'consumed_today'  : consumed,
        'calorie_progress': f"{pct_calories}%",
        'tips'            : tips,
        'streak'          : streak,
        'is_perfect_day'  : is_perfect,
        'macros_pct'      : macros_pct
    }), 200


@progress_bp.route('/weekly', methods=['GET'])
@jwt_required()
def get_weekly_progress():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)

    if not profile:
        return jsonify({'error': 'Please complete your profile first.'}), 400

    targets    = get_user_targets(profile)
    today      = date.today()
    start_date = today - timedelta(days=6)

    logs = MealLog.query.filter(
        MealLog.user_id    == user_id,
        MealLog.profile_id == profile.id,
        MealLog.log_date   >= start_date,
        MealLog.log_date   <= today
    ).all()

    daily_summary = {}
    for i in range(7):
        d = (start_date + timedelta(days=i)).isoformat()
        daily_summary[d] = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}

    for log in logs:
        key = log.log_date.isoformat()
        if key in daily_summary:
            daily_summary[key]['calories'] += log.calories
            daily_summary[key]['protein']  += log.protein
            daily_summary[key]['carbs']    += log.carbs
            daily_summary[key]['fat']      += log.fat

    for day in daily_summary.values():
        for k in day:
            day[k] = round(day[k], 2)

    # weekly averages
    days_with_logs = [d for d in daily_summary.values() if d['calories'] > 0]
    count          = len(days_with_logs) or 1
    weekly_avg     = {
        'calories' : round(sum(d['calories'] for d in days_with_logs) / count, 1),
        'protein'  : round(sum(d['protein']  for d in days_with_logs) / count, 1),
        'carbs'    : round(sum(d['carbs']    for d in days_with_logs) / count, 1),
        'fat'      : round(sum(d['fat']      for d in days_with_logs) / count, 1),
    }

    # best day — closest to hitting all targets
    def day_score(d):
        cal_pct  = min(d['calories'] / (targets['daily_calories'] or 1), 1)
        pro_pct  = min(d['protein']  / (targets['protein_g']      or 1), 1)
        carb_pct = min(d['carbs']    / (targets['carbs_g']        or 1), 1)
        fat_pct  = min(d['fat']      / (targets['fat_g']          or 1), 1)
        return (cal_pct + pro_pct + carb_pct + fat_pct) / 4

    best_day     = None
    best_score   = 0
    for day_str, data in daily_summary.items():
        score = day_score(data)
        if score > best_score:
            best_score = score
            best_day   = day_str

    return jsonify({
        'week_start'     : start_date.isoformat(),
        'week_end'       : today.isoformat(),
        'daily_targets'  : targets,
        'weekly_summary' : daily_summary,
        'weekly_avg'     : weekly_avg,
        'best_day'       : best_day,
        'best_day_score' : round(best_score * 100, 1)
    }), 200