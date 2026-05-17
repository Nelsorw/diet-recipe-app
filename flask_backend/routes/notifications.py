from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, date, timezone
import os

notifications_bp = Blueprint('notifications', __name__)

MEAL_ICONS = {
    'breakfast': '🌅',
    'lunch'    : '☀️',
    'dinner'   : '🌙',
    'snack'    : '🍎'
}

MEAL_REMINDER_TIMES = {
    'breakfast': 6,
    'lunch'    : 11,
    'dinner'   : 17,
}


def _get_active_profile(user):
    from models.models import UserProfile
    if user.active_profile_id:
        profile = UserProfile.query.filter_by(
            id=user.active_profile_id, user_id=user.id
        ).first()
        if profile:
            return profile
    return UserProfile.query.filter_by(user_id=user.id).first()


def create_notification(user_id: int, title: str, body: str, type: str,
                        profile_id: int = None, extra_data: dict = None):
    from app import db
    from models.models import Notification, User
    from utils.email_sender import send_notification_email

    user  = User.query.get(user_id)

    # resolve profile_id if not provided
    if profile_id is None and user:
        profile = _get_active_profile(user)
        profile_id = profile.id if profile else None

    notif = Notification(
        user_id    = user_id,
        profile_id = profile_id,
        title      = title,
        body       = body,
        type       = type
    )
    db.session.add(notif)
    db.session.commit()

    if user and user.email:
        username = user.username or user.email.split('@')[0]
        # inject profile_name so the email greeting identifies which profile
        from models.models import UserProfile
        profile_obj  = UserProfile.query.get(profile_id) if profile_id else None
        profile_name = profile_obj.profile_name if profile_obj else ''
        merged_extra = {'profile_name': profile_name, **(extra_data or {})}
        send_notification_email(
            user_email = user.email,
            username   = username,
            notif_type = type,
            title      = title,
            body       = body,
            extra_data = merged_extra
        )

    return notif


def generate_meal_reminders(user_id: int):
    from app import db
    from models.models import Notification, MealPlan, User
    from datetime import datetime
    today = date.today()
    now   = datetime.now()

    user       = User.query.get(user_id)
    profile    = _get_active_profile(user) if user else None
    profile_id = profile.id if profile else None

    plans = MealPlan.query.filter_by(
        user_id=user_id, profile_id=profile_id, plan_date=today
    ).all()
    if not plans:
        return

    for plan in plans:
        meal_type = plan.meal_type.lower()
        if meal_type not in MEAL_REMINDER_TIMES:
            continue

        reminder_hour  = MEAL_REMINDER_TIMES[meal_type]
        scheduled_time = now.replace(hour=reminder_hour, minute=0, second=0, microsecond=0)
        if not (scheduled_time <= now <= scheduled_time.replace(hour=reminder_hour + 1)):
            continue

        existing = Notification.query.filter(
            Notification.user_id    == user_id,
            Notification.profile_id == profile_id,
            Notification.type       == 'meal_reminder',
            Notification.title.like(f'%{meal_type.capitalize()}%'),
            Notification.created_at >= datetime.combine(today, datetime.min.time())
        ).first()
        if existing:
            continue

        icon  = MEAL_ICONS.get(meal_type, '🍽')
        title = f"{icon} {meal_type.capitalize()} in 2 hours!"
        body  = (
            f"Today's {meal_type}: {plan.recipe_name}\n"
            f"🔥 {round(plan.calories)} kcal\n"
            f"💪 Protein: {round(plan.protein, 1)}g\n"
            f"🌾 Carbs: {round(plan.carbs, 1)}g\n"
            f"🧈 Fat: {round(plan.fat, 1)}g"
        )
        create_notification(user_id, title, body, 'meal_reminder',
                            profile_id=profile_id,
                            extra_data={
                                'meal_type'   : meal_type,
                                'recipe_name' : plan.recipe_name,
                                'calories'    : plan.calories,
                                'protein'     : plan.protein,
                                'carbs'       : plan.carbs,
                                'fat'         : plan.fat,
                            })


def check_streak_milestone(user_id: int, profile_id: int = None):
    from models.models import Notification, MealLog, User
    if profile_id is None:
        user       = User.query.get(user_id)
        profile    = _get_active_profile(user) if user else None
        profile_id = profile.id if profile else None

    streak = 0
    check  = date.today()
    while True:
        logs = MealLog.query.filter_by(
            user_id=user_id, profile_id=profile_id, log_date=check
        ).first()
        if not logs:
            break
        streak += 1
        check  -= timedelta(days=1)

    milestones = {
        3  : ("🔥 3-Day Streak!",  "Amazing! You've logged meals for 3 days in a row. Keep it up!"),
        7  : ("🔥 7-Day Streak!",  "One full week of consistent logging! You're building a great habit."),
        30 : ("🏆 30-Day Streak!", "Incredible! 30 days of consistent meal logging. You're a champion!"),
    }
    if streak in milestones:
        title, body = milestones[streak]
        existing = Notification.query.filter(
            Notification.user_id    == user_id,
            Notification.profile_id == profile_id,
            Notification.type       == 'streak',
            Notification.title      == title,
            Notification.created_at >= datetime.combine(date.today(), datetime.min.time())
        ).first()
        if not existing:
            create_notification(user_id, title, body, 'streak', profile_id=profile_id)


def check_perfect_day(user_id: int, profile_id: int = None):
    from models.models import Notification, MealLog, User
    from utils.nutrition import get_user_targets

    user = User.query.get(user_id)
    if not user:
        return

    profile = _get_active_profile(user)
    if not profile:
        return

    if profile_id is None:
        profile_id = profile.id

    targets = get_user_targets(profile)
    today   = date.today()
    logs    = MealLog.query.filter_by(
        user_id=user_id, profile_id=profile_id, log_date=today
    ).all()

    consumed = {
        'calories': sum(l.calories for l in logs),
        'protein' : sum(l.protein  for l in logs),
        'carbs'   : sum(l.carbs    for l in logs),
        'fat'     : sum(l.fat      for l in logs),
    }

    def hit(actual, target):
        if not target: return True
        return actual >= target * 0.9

    is_perfect = (
        hit(consumed['calories'], targets.get('daily_calories', 0)) and
        hit(consumed['protein'],  targets.get('protein_g', 0))      and
        hit(consumed['carbs'],    targets.get('carbs_g', 0))        and
        hit(consumed['fat'],      targets.get('fat_g', 0))
    )

    if is_perfect:
        existing = Notification.query.filter(
            Notification.user_id    == user_id,
            Notification.profile_id == profile_id,
            Notification.type       == 'perfect_day',
            Notification.created_at >= datetime.combine(today, datetime.min.time())
        ).first()
        if not existing:
            create_notification(
                user_id,
                "🏆 Perfect Day!",
                f"You've hit all your nutrition targets today!\n"
                f"Calories: {round(consumed['calories'])} kcal\n"
                f"Protein: {round(consumed['protein'], 1)}g\n"
                f"Carbs: {round(consumed['carbs'], 1)}g\n"
                f"Fat: {round(consumed['fat'], 1)}g",
                'perfect_day',
                profile_id=profile_id,
                extra_data={'consumed': consumed}
            )


def send_log_reminder(user_id: int):
    from models.models import Notification, MealLog, User
    today = date.today()

    user       = User.query.get(user_id)
    profile    = _get_active_profile(user) if user else None
    profile_id = profile.id if profile else None

    logged_today = MealLog.query.filter_by(
        user_id=user_id, profile_id=profile_id, log_date=today
    ).first()
    if logged_today:
        return

    existing = Notification.query.filter(
        Notification.user_id    == user_id,
        Notification.profile_id == profile_id,
        Notification.type       == 'log_reminder',
        Notification.created_at >= datetime.combine(today, datetime.min.time())
    ).first()
    if existing:
        return

    create_notification(
        user_id,
        "Don't forget to log your meals!",
        "You haven't logged any meals today. Keep your streak going and track what you eat!",
        'log_reminder',
        profile_id=profile_id
    )


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    from app import db
    from models.models import Notification, User

    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None

    try:
        cutoff       = datetime.now(timezone.utc) - timedelta(days=30)
        cutoff_naive = cutoff.replace(tzinfo=None)
        Notification.query.filter(
            Notification.user_id    == user_id,
            Notification.profile_id == profile_id,
            Notification.created_at <  cutoff_naive
        ).delete(synchronize_session=False)
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        notifications = Notification.query.filter_by(
            user_id=user_id, profile_id=profile_id
        ).order_by(Notification.created_at.desc()).all()
        unread_count = sum(1 for n in notifications if not n.is_read)
        return jsonify({
            'notifications': [n.to_dict() for n in notifications],
            'unread_count' : unread_count
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({'notifications': [], 'unread_count': 0}), 200


@notifications_bp.route('/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(notif_id):
    from app import db
    from models.models import Notification
    user_id = int(get_jwt_identity())
    notif   = Notification.query.filter_by(id=notif_id, user_id=user_id).first()
    if not notif:
        return jsonify({'error': 'Notification not found.'}), 404
    notif.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read.'}), 200


@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    from app import db
    from models.models import Notification, User
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None
    Notification.query.filter_by(
        user_id=user_id, profile_id=profile_id, is_read=False
    ).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read.'}), 200
