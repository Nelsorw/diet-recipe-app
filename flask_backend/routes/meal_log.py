from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from app import db
from models.models import MealLog, User
from routes.notifications import check_streak_milestone, check_perfect_day
from routes.profile import _get_active_profile

logging_bp = Blueprint('logging', __name__)

VALID_MEAL_TYPES = {'breakfast', 'lunch', 'dinner', 'snack'}


def _active_profile_id(user_id: int) -> int | None:
    user = User.query.get(user_id)
    if not user:
        return None
    profile = _get_active_profile(user)
    return profile.id if profile else None


@logging_bp.route('', methods=['POST'])
@jwt_required()
def log_meal():
    user_id    = int(get_jwt_identity())
    profile_id = _active_profile_id(user_id)
    data       = request.get_json()

    if not data or not data.get('recipe_name') or not data.get('meal_type'):
        return jsonify({'error': 'recipe_name and meal_type are required.'}), 400

    if data['meal_type'].lower() not in VALID_MEAL_TYPES:
        return jsonify({'error': f"meal_type must be one of: {', '.join(VALID_MEAL_TYPES)}"}), 400

    # prevent duplicate — same meal type on same day for same profile
    existing = MealLog.query.filter_by(
        user_id    = user_id,
        profile_id = profile_id,
        meal_type  = data['meal_type'].lower(),
        log_date   = date.today()
    ).first()

    if existing:
        return jsonify({
            'message': 'Already logged a meal for this meal type today.',
            'log'    : existing.to_dict()
        }), 200

    log = MealLog(
        user_id     = user_id,
        profile_id  = profile_id,
        recipe_name = data['recipe_name'],
        meal_type   = data['meal_type'].lower(),
        calories    = float(data.get('calories', 0)),
        protein     = float(data.get('protein',  0)),
        carbs       = float(data.get('carbs',    0)),
        fat         = float(data.get('fat',      0)),
        log_date    = date.today()
    )

    db.session.add(log)
    db.session.commit()

    check_streak_milestone(user_id, profile_id)
    check_perfect_day(user_id, profile_id)

    return jsonify({'message': 'Meal logged successfully.', 'log': log.to_dict()}), 201


@logging_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_logs():
    user_id    = int(get_jwt_identity())
    profile_id = _active_profile_id(user_id)
    logs       = MealLog.query.filter_by(
        user_id    = user_id,
        profile_id = profile_id,
        log_date   = date.today()
    ).all()

    return jsonify({
        'date'   : date.today().isoformat(),
        'logs'   : [l.to_dict() for l in logs],
        'totals' : {
            'calories' : round(sum(l.calories for l in logs), 2),
            'protein'  : round(sum(l.protein  for l in logs), 2),
            'carbs'    : round(sum(l.carbs     for l in logs), 2),
            'fat'      : round(sum(l.fat       for l in logs), 2)
        }
    }), 200


@logging_bp.route('/<int:log_id>', methods=['DELETE'])
@jwt_required()
def delete_log(log_id):
    user_id = int(get_jwt_identity())
    log     = MealLog.query.filter_by(id=log_id, user_id=user_id).first()

    if not log:
        return jsonify({'error': 'Log not found.'}), 404

    db.session.delete(log)
    db.session.commit()

    return jsonify({'message': 'Meal log deleted.'}), 200


@logging_bp.route('/by-date', methods=['GET'])
@jwt_required()
def get_logs_by_date():
    user_id    = int(get_jwt_identity())
    profile_id = _active_profile_id(user_id)
    date_str   = request.args.get('date', date.today().isoformat())
    try:
        log_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date format.'}), 400

    logs = MealLog.query.filter_by(
        user_id    = user_id,
        profile_id = profile_id,
        log_date   = log_date
    ).all()

    return jsonify({
        'date'  : log_date.isoformat(),
        'logs'  : [l.to_dict() for l in logs],
        'totals': {
            'calories' : round(sum(l.calories for l in logs), 2),
            'protein'  : round(sum(l.protein  for l in logs), 2),
            'carbs'    : round(sum(l.carbs     for l in logs), 2),
            'fat'      : round(sum(l.fat       for l in logs), 2)
        }
    }), 200
