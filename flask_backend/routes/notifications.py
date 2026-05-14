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


def create_notification(user_id: int, title: str, body: str, type: str, extra_data: dict = None):
    from app import db
    from models.models import Notification, User
    from utils.email_sender import send_notification_email

    user  = User.query.get(user_id)
    notif = Notification(
        user_id = user_id,
        title   = title,
        body    = body,
        type    = type
    )
    db.session.add(notif)
    db.session.commit()

    # send email
    if user and user.email:
        username = user.username or user.email.split('@')[0]
        send_notification_email(
            user_email = user.email,
            username   = username,
            notif_type = type,
            title      = title,
            body       = body,
            extra_data = extra_data or {}
        )

    return notif


def generate_meal_reminders(user_id: int):
    from app import db
    from models.models import Notification, MealPlan
    today = date.today()
    plans = MealPlan.query.filter_by(user_id=user_id, plan_date=today).all()
    if not plans:
        return

    for plan in plans:
        meal_type = plan.meal_type.lower()
        if meal_type not in MEAL_REMINDER_TIMES:
            continue

        existing = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.type    == 'meal_reminder',
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
        create_notification(user_id, title, body, 'meal_reminder', extra_data={
            'meal_type'   : meal_type,
            'recipe_name' : plan.recipe_name,
            'calories'    : plan.calories,
            'protein'     : plan.protein,
            'carbs'       : plan.carbs,
            'fat'         : plan.fat,
        })


def check_streak_milestone(user_id: int):
    from models.models import Notification, MealLog
    streak = 0
    check  = date.today()
    while True:
        logs = MealLog.query.filter_by(user_id=user_id, log_date=check).first()
        if not logs:
            break
        streak += 1
        check  -= timedelta(days=1)

    milestones = {
        3  : ("🔥 3-Day Streak!",  "Amazing! You've logged meals for 3 days in a row. Keep it up!"),
        7  : ("🔥 7-Day Streak!",  "One full week of consistent logging! You're building a great habit."),
        30 : ("🏆 30-Day Streak!", "Incredible! 30 days of consistent meal logging. You're a NutriGuide champion!"),
    }
    if streak in milestones:
        title, body = milestones[streak]
        existing = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.type    == 'streak',
            Notification.title   == title,
            Notification.created_at >= datetime.combine(date.today(), datetime.min.time())
        ).first()
        if not existing:
            create_notification(user_id, title, body, 'streak')


def check_perfect_day(user_id: int):
    from models.models import Notification, MealLog, User
    from utils.nutrition import get_user_targets

    user = User.query.get(user_id)
    if not user or not user.profile:
        return

    targets = get_user_targets(user.profile)
    today   = date.today()
    logs    = MealLog.query.filter_by(user_id=user_id, log_date=today).all()

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
            Notification.user_id == user_id,
            Notification.type    == 'perfect_day',
            Notification.created_at >= datetime.combine(today, datetime.min.time())
        ).first()
        if not existing:
            create_notification(
                user_id,
                "Perfect Day!",
                f"You've hit all your nutrition targets today!\n"
                f"Calories: {round(consumed['calories'])} kcal\n"
                f"Protein: {round(consumed['protein'], 1)}g\n"
                f"Carbs: {round(consumed['carbs'], 1)}g\n"
                f"Fat: {round(consumed['fat'], 1)}g",
                'perfect_day',
                extra_data={'consumed': consumed}
            )


def send_log_reminder(user_id: int):
    from models.models import Notification, MealLog
    today = date.today()

    logged_today = MealLog.query.filter_by(user_id=user_id, log_date=today).first()
    if logged_today:
        return

    existing = Notification.query.filter(
        Notification.user_id == user_id,
        Notification.type    == 'log_reminder',
        Notification.created_at >= datetime.combine(today, datetime.min.time())
    ).first()
    if existing:
        return

    create_notification(
        user_id,
        "Don't forget to log your meals!",
        "You haven't logged any meals today. Keep your streak going and track what you eat!",
        'log_reminder'
    )


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    from app import db
    from models.models import Notification

    user_id = int(get_jwt_identity())

    try:
        cutoff       = datetime.now(timezone.utc) - timedelta(days=30)
        cutoff_naive = cutoff.replace(tzinfo=None)
        Notification.query.filter(
            Notification.user_id    == user_id,
            Notification.created_at <  cutoff_naive
        ).delete(synchronize_session=False)
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        notifications = Notification.query.filter_by(user_id=user_id)\
            .order_by(Notification.created_at.desc()).all()
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
    from models.models import Notification
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read.'}), 200


@notifications_bp.route('/create-meal-plan', methods=['POST'])
@jwt_required()
def notify_meal_plan_generated():
    user_id = int(get_jwt_identity())
    create_notification(
        user_id,
        "Weekly Meal Plan Ready!",
        "Your personalized weekly meal plan has been generated. Check it out and start cooking!",
        'meal_plan'
    )
    return jsonify({'message': 'Notification created.'}), 201


@notifications_bp.route('/test', methods=['POST'])
@jwt_required()
def test_notifications():
    user_id  = int(get_jwt_identity())
    notif_type = request.get_json().get('type', 'all')

    if notif_type in ('meal_reminder', 'all'):
        generate_meal_reminders(user_id)
    if notif_type in ('log_reminder', 'all'):
        send_log_reminder(user_id)
    if notif_type in ('streak', 'all'):
        check_streak_milestone(user_id)
    if notif_type in ('perfect_day', 'all'):
        check_perfect_day(user_id)

    return jsonify({'message': f'Test notifications triggered: {notif_type}'}), 200