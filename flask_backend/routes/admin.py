"""
Admin API — all routes require is_admin=True on the JWT user.
"""
import os
from functools import wraps
from datetime import datetime, timezone, timedelta, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.models import (
    User, UserProfile, Recipe, MealLog, MealPlan,
    Notification, SavedRecipe, ChatMessage, ChatSession
)

admin_bp = Blueprint('admin', __name__)


# ── Auth decorator ────────────────────────────────────────────────────────────
def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user    = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required.'}), 403
        return fn(*args, **kwargs)
    return wrapper


# ── Dashboard ─────────────────────────────────────────────────────────────────
@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    today      = date.today()
    week_ago   = today - timedelta(days=7)
    month_ago  = today - timedelta(days=30)

    total_users    = User.query.count()
    total_recipes  = Recipe.query.count()
    recipes_with_img = Recipe.query.filter(
        Recipe.image_url.isnot(None), Recipe.image_url != ''
    ).count()
    recipes_no_img = total_recipes - recipes_with_img

    # active users — logged in last 7 days (have a meal log in last 7 days)
    active_user_ids = db.session.query(MealLog.user_id).filter(
        MealLog.log_date >= week_ago
    ).distinct().count()

    # new users this month
    new_users_month = User.query.filter(
        User.created_at >= datetime.combine(month_ago, datetime.min.time())
    ).count()

    # meal logs today
    logs_today = MealLog.query.filter_by(log_date=today).count()

    # meal logs this week
    logs_week = MealLog.query.filter(MealLog.log_date >= week_ago).count()

    # total profiles
    total_profiles = UserProfile.query.count()

    # total notifications sent
    total_notifications = Notification.query.count()

    # total chat messages
    total_chat_messages = ChatMessage.query.count()

    # total saved recipes
    total_saved = SavedRecipe.query.count()

    # most popular recipes (most logged)
    from sqlalchemy import func
    top_logged = db.session.query(
        MealLog.recipe_name,
        func.count(MealLog.id).label('count')
    ).group_by(MealLog.recipe_name)\
     .order_by(func.count(MealLog.id).desc())\
     .limit(5).all()

    # most recommended (most added to meal plans)
    top_planned = db.session.query(
        MealPlan.recipe_name,
        func.count(MealPlan.id).label('count')
    ).group_by(MealPlan.recipe_name)\
     .order_by(func.count(MealPlan.id).desc())\
     .limit(5).all()

    # users by health goal
    goals = db.session.query(
        UserProfile.health_goal,
        func.count(UserProfile.id).label('count')
    ).group_by(UserProfile.health_goal).all()

    # users by dietary restriction
    diets = db.session.query(
        UserProfile.dietary_restrictions,
        func.count(UserProfile.id).label('count')
    ).group_by(UserProfile.dietary_restrictions).all()

    return jsonify({
        'users': {
            'total'        : total_users,
            'active_7d'    : active_user_ids,
            'new_30d'      : new_users_month,
            'total_profiles': total_profiles,
        },
        'recipes': {
            'total'        : total_recipes,
            'with_image'   : recipes_with_img,
            'without_image': recipes_no_img,
            'image_pct'    : round((recipes_with_img / total_recipes * 100), 1) if total_recipes else 0,
        },
        'activity': {
            'logs_today'   : logs_today,
            'logs_7d'      : logs_week,
            'notifications': total_notifications,
            'chat_messages': total_chat_messages,
            'saved_recipes': total_saved,
        },
        'top_logged' : [{'name': r, 'count': c} for r, c in top_logged],
        'top_planned': [{'name': r, 'count': c} for r, c in top_planned],
        'health_goals': [{'goal': g, 'count': c} for g, c in goals],
        'dietary_restrictions': [{'diet': d, 'count': c} for d, c in diets],
    }), 200


# ── System stats ──────────────────────────────────────────────────────────────
@admin_bp.route('/system', methods=['GET'])
@admin_required
def system_stats():
    import sqlite3 as _sqlite3

    # DB file size — works for SQLite; for PostgreSQL uses pg_database_size
    db_url = os.getenv('DATABASE_URL', 'sqlite:///diet_app.db')
    db_size_bytes = 0
    db_size_mb    = 0
    if db_url.startswith('sqlite'):
        db_path = os.path.join(os.path.dirname(__file__), '..', 'instance', 'diet_app.db')
        if os.path.exists(db_path):
            db_size_bytes = os.path.getsize(db_path)
            db_size_mb    = round(db_size_bytes / (1024 * 1024), 2)
    else:
        try:
            result = db.session.execute(
                db.text('SELECT pg_database_size(current_database())')
            ).scalar()
            db_size_bytes = int(result or 0)
            db_size_mb    = round(db_size_bytes / (1024 * 1024), 2)
        except Exception:
            pass

    # table row counts
    tables = {
        'users'        : User.query.count(),
        'recipes'      : Recipe.query.count(),
        'meal_logs'    : MealLog.query.count(),
        'meal_plans'   : MealPlan.query.count(),
        'notifications': Notification.query.count(),
        'saved_recipes': SavedRecipe.query.count(),
        'chat_messages': ChatMessage.query.count(),
        'chat_sessions': ChatSession.query.count(),
    }

    # cached images count
    cached_images = Recipe.query.filter(
        Recipe.image_url.isnot(None), Recipe.image_url != ''
    ).count()

    # recent notifications (last 10)
    recent_notifs = Notification.query.order_by(
        Notification.created_at.desc()
    ).limit(10).all()

    return jsonify({
        'database': {
            'size_mb'  : db_size_mb,
            'size_bytes': db_size_bytes,
            'tables'   : tables,
        },
        'images': {
            'cached_count' : cached_images,
            'total_recipes': Recipe.query.count(),
            'coverage_pct' : round(cached_images / Recipe.query.count() * 100, 1) if Recipe.query.count() else 0,
        },
        'recent_notifications': [n.to_dict() for n in recent_notifs],
    }), 200


# ── User management ───────────────────────────────────────────────────────────
@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search   = request.args.get('q', '').strip()

    query = User.query
    if search:
        query = query.filter(
            db.or_(
                User.username.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )

    total   = query.count()
    users   = query.order_by(User.created_at.desc())\
                   .offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for u in users:
        profiles = UserProfile.query.filter_by(user_id=u.id).count()
        logs     = MealLog.query.filter_by(user_id=u.id).count()
        d        = u.to_dict()
        d['profile_count'] = profiles
        d['log_count']     = logs
        result.append(d)

    return jsonify({
        'users'   : result,
        'total'   : total,
        'page'    : page,
        'per_page': per_page,
        'pages'   : (total + per_page - 1) // per_page
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    profiles = UserProfile.query.filter_by(user_id=user_id).all()

    # recent logs
    recent_logs = MealLog.query.filter_by(user_id=user_id)\
        .order_by(MealLog.logged_at.desc()).limit(10).all()

    # stats
    total_logs  = MealLog.query.filter_by(user_id=user_id).count()
    total_plans = MealPlan.query.filter_by(user_id=user_id).count()
    total_saved = SavedRecipe.query.filter_by(user_id=user_id).count()

    return jsonify({
        'user'    : user.to_dict(),
        'profiles': [p.to_dict() for p in profiles],
        'stats'   : {
            'total_logs' : total_logs,
            'total_plans': total_plans,
            'total_saved': total_saved,
        },
        'recent_logs': [l.to_dict() for l in recent_logs],
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    admin_id = int(get_jwt_identity())
    if user_id == admin_id:
        return jsonify({'error': 'Cannot delete your own account.'}), 400

    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': f'User {user.username} deleted.'}), 200


@admin_bp.route('/users/<int:user_id>/toggle-admin', methods=['POST'])
@admin_required
def toggle_admin(user_id):
    admin_id = int(get_jwt_identity())
    if user_id == admin_id:
        return jsonify({'error': 'Cannot change your own admin status.'}), 400

    user = User.query.get_or_404(user_id)
    user.is_admin = not user.is_admin
    db.session.commit()
    return jsonify({'message': f'Admin status set to {user.is_admin}.', 'is_admin': user.is_admin}), 200


# ── Recipe management ─────────────────────────────────────────────────────────
@admin_bp.route('/recipes', methods=['GET'])
@admin_required
def list_recipes():
    page      = request.args.get('page', 1, type=int)
    per_page  = request.args.get('per_page', 20, type=int)
    search    = request.args.get('q', '').strip()
    meal_type = request.args.get('meal_type', '').strip()
    has_image = request.args.get('has_image', '').strip()  # 'yes' | 'no' | ''

    query = Recipe.query
    if search:
        query = query.filter(Recipe.name.ilike(f'%{search}%'))
    if meal_type:
        query = query.filter(Recipe.meal_type.ilike(meal_type))
    if has_image == 'yes':
        query = query.filter(Recipe.image_url.isnot(None), Recipe.image_url != '')
    elif has_image == 'no':
        query = query.filter(
            db.or_(Recipe.image_url.is_(None), Recipe.image_url == '')
        )

    total   = query.count()
    recipes = query.order_by(Recipe.id)\
                   .offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'recipes' : [r.to_dict() for r in recipes],
        'total'   : total,
        'page'    : page,
        'per_page': per_page,
        'pages'   : (total + per_page - 1) // per_page
    }), 200


@admin_bp.route('/recipes/<int:recipe_id>', methods=['GET'])
@admin_required
def get_recipe(recipe_id):
    recipe = Recipe.query.get_or_404(recipe_id)
    data   = recipe.to_dict()

    # how many times logged and planned
    from sqlalchemy import func
    log_count  = MealLog.query.filter_by(recipe_name=recipe.name).count()
    plan_count = MealPlan.query.filter_by(recipe_name=recipe.name).count()
    save_count = SavedRecipe.query.filter_by(recipe_id=recipe_id).count()

    data['stats'] = {
        'times_logged' : log_count,
        'times_planned': plan_count,
        'times_saved'  : save_count,
    }
    return jsonify(data), 200


@admin_bp.route('/recipes/<int:recipe_id>', methods=['PUT'])
@admin_required
def update_recipe(recipe_id):
    recipe = Recipe.query.get_or_404(recipe_id)
    data   = request.get_json() or {}

    updatable = ['name', 'minutes', 'description', 'ingredients', 'steps',
                 'calories', 'fat', 'sugar', 'sodium', 'protein',
                 'saturated_fat', 'carbs', 'meal_type', 'dish_type',
                 'dietary_attributes', 'image_url']

    for field in updatable:
        if field in data:
            setattr(recipe, field, data[field])

    db.session.commit()
    return jsonify({'message': 'Recipe updated.', 'recipe': recipe.to_dict()}), 200


@admin_bp.route('/recipes/<int:recipe_id>', methods=['DELETE'])
@admin_required
def delete_recipe(recipe_id):
    recipe = Recipe.query.get_or_404(recipe_id)
    # remove from meal plans and saved recipes first
    MealPlan.query.filter_by(recipe_id=recipe_id).update({'recipe_id': None})
    SavedRecipe.query.filter_by(recipe_id=recipe_id).delete()
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({'message': 'Recipe deleted.'}), 200


# ── Recipe stats ──────────────────────────────────────────────────────────────
@admin_bp.route('/recipes/stats', methods=['GET'])
@admin_required
def recipe_stats():
    from sqlalchemy import func

    total = Recipe.query.count()
    with_img = Recipe.query.filter(
        Recipe.image_url.isnot(None), Recipe.image_url != ''
    ).count()

    # most logged
    top_logged = db.session.query(
        MealLog.recipe_name,
        func.count(MealLog.id).label('count')
    ).group_by(MealLog.recipe_name)\
     .order_by(func.count(MealLog.id).desc())\
     .limit(10).all()

    # most planned
    top_planned = db.session.query(
        MealPlan.recipe_name,
        func.count(MealPlan.id).label('count')
    ).group_by(MealPlan.recipe_name)\
     .order_by(func.count(MealPlan.id).desc())\
     .limit(10).all()

    # most saved
    top_saved = db.session.query(
        Recipe.name,
        func.count(SavedRecipe.id).label('count')
    ).join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id)\
     .group_by(Recipe.name)\
     .order_by(func.count(SavedRecipe.id).desc())\
     .limit(10).all()

    # by meal type
    by_meal_type = db.session.query(
        Recipe.meal_type,
        func.count(Recipe.id).label('count')
    ).group_by(Recipe.meal_type).all()

    return jsonify({
        'total'         : total,
        'with_image'    : with_img,
        'without_image' : total - with_img,
        'top_logged'    : [{'name': r, 'count': c} for r, c in top_logged],
        'top_planned'   : [{'name': r, 'count': c} for r, c in top_planned],
        'top_saved'     : [{'name': r, 'count': c} for r, c in top_saved],
        'by_meal_type'  : [{'meal_type': m or 'unknown', 'count': c} for m, c in by_meal_type],
    }), 200


# ── Add recipe ────────────────────────────────────────────────────────────────
@admin_bp.route('/recipes', methods=['POST'])
@admin_required
def add_recipe():
    data = request.get_json() or {}

    required = ['name', 'meal_type']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required.'}), 400

    recipe = Recipe(
        name              = str(data['name'])[:500],
        minutes           = int(data.get('minutes', 0)),
        n_steps           = int(data.get('n_steps', 0)),
        steps             = data.get('steps', ''),
        description       = data.get('description', ''),
        ingredients       = data.get('ingredients', ''),
        n_ingredients     = int(data.get('n_ingredients', 0)),
        calories          = float(data.get('calories', 0)),
        fat               = float(data.get('fat', 0)),
        sugar             = float(data.get('sugar', 0)),
        sodium            = float(data.get('sodium', 0)),
        protein           = float(data.get('protein', 0)),
        saturated_fat     = float(data.get('saturated_fat', 0)),
        carbs             = float(data.get('carbs', 0)),
        meal_type         = data.get('meal_type', ''),
        dish_type         = data.get('dish_type', ''),
        dietary_attributes= data.get('dietary_attributes', 'No Nutritional Focus'),
        image_url         = data.get('image_url', None),
    )
    db.session.add(recipe)
    db.session.commit()
    return jsonify({'message': 'Recipe added.', 'recipe': recipe.to_dict()}), 201


# ── User Demographics ─────────────────────────────────────────────────────────
def _compute_bmi_stats():
    """
    Calculate BMI for every profile that has weight + height.
    BMI = weight_kg / (height_m)^2
    Categories (WHO standard):
      Underweight : < 18.5
      Normal      : 18.5 – 24.9
      Overweight  : 25.0 – 29.9
      Obese       : >= 30.0
    """
    from datetime import date as _date

    profiles = UserProfile.query.filter(
        UserProfile.weight_kg.isnot(None),
        UserProfile.height_cm.isnot(None),
        UserProfile.weight_kg > 0,
        UserProfile.height_cm > 0,
    ).all()

    today = _date.today()

    categories = {
        'underweight': {'total': 0, 'male': 0, 'female': 0, 'child': 0, 'adult': 0, 'elderly': 0},
        'normal'     : {'total': 0, 'male': 0, 'female': 0, 'child': 0, 'adult': 0, 'elderly': 0},
        'overweight' : {'total': 0, 'male': 0, 'female': 0, 'child': 0, 'adult': 0, 'elderly': 0},
        'obese'      : {'total': 0, 'male': 0, 'female': 0, 'child': 0, 'adult': 0, 'elderly': 0},
    }

    bmi_values = []

    for p in profiles:
        height_m = p.height_cm / 100
        bmi      = round(p.weight_kg / (height_m ** 2), 1)
        bmi_values.append(bmi)

        if bmi < 18.5:
            cat = 'underweight'
        elif bmi < 25:
            cat = 'normal'
        elif bmi < 30:
            cat = 'overweight'
        else:
            cat = 'obese'

        categories[cat]['total'] += 1

        g = (p.gender or '').lower()
        if g in ('male', 'female'):
            categories[cat][g] += 1

        if p.date_of_birth:
            age = today.year - p.date_of_birth.year - (
                (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
            )
            if age < 18:
                categories[cat]['child'] += 1
            elif age < 60:
                categories[cat]['adult'] += 1
            else:
                categories[cat]['elderly'] += 1

    avg_bmi = round(sum(bmi_values) / len(bmi_values), 1) if bmi_values else 0

    return {
        'total_with_data': len(profiles),
        'average_bmi'    : avg_bmi,
        'categories'     : categories,
    }


@admin_bp.route('/demographics', methods=['GET'])
@admin_required
def demographics():
    from sqlalchemy import func, case
    from datetime import date

    today = date.today()

    # Age group calculation based on date_of_birth
    # child: < 18, adult: 18-59, older: >= 60
    profiles = UserProfile.query.filter(UserProfile.date_of_birth.isnot(None)).all()

    age_groups = {'child': 0, 'adult': 0, 'older': 0, 'unknown': 0}
    gender_counts = {'male': 0, 'female': 0, 'other': 0}

    # age group × gender matrix
    matrix = {
        'child' : {'male': 0, 'female': 0, 'other': 0},
        'adult' : {'male': 0, 'female': 0, 'other': 0},
        'older' : {'male': 0, 'female': 0, 'other': 0},
        'unknown': {'male': 0, 'female': 0, 'other': 0},
    }

    for p in profiles:
        # age
        age = today.year - p.date_of_birth.year - (
            (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
        )
        if age < 18:
            group = 'child'
        elif age < 60:
            group = 'adult'
        else:
            group = 'older'
        age_groups[group] += 1

        # gender
        g = (p.gender or '').lower()
        if g not in ('male', 'female'):
            g = 'other'
        gender_counts[g] += 1
        matrix[group][g] += 1

    # unknown age (no date_of_birth)
    unknown_count = UserProfile.query.filter(UserProfile.date_of_birth.is_(None)).count()
    age_groups['unknown'] = unknown_count

    # health condition breakdown by age group + gender
    def breakdown_by(field):
        rows = db.session.query(
            getattr(UserProfile, field),
            func.count(UserProfile.id).label('count')
        ).group_by(getattr(UserProfile, field)).all()
        return [{'label': r[0] or 'Unknown', 'count': r[1]} for r in rows]

    # health condition × gender
    hc_gender = db.session.query(
        UserProfile.health_condition,
        UserProfile.gender,
        func.count(UserProfile.id).label('count')
    ).group_by(UserProfile.health_condition, UserProfile.gender).all()

    # dietary restriction × gender
    diet_gender = db.session.query(
        UserProfile.dietary_restrictions,
        UserProfile.gender,
        func.count(UserProfile.id).label('count')
    ).group_by(UserProfile.dietary_restrictions, UserProfile.gender).all()

    # health condition × age group (computed in Python)
    hc_age = {}
    diet_age = {}
    for p in UserProfile.query.all():
        if p.date_of_birth:
            age = today.year - p.date_of_birth.year - (
                (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
            )
            grp = 'child' if age < 18 else ('older' if age >= 60 else 'adult')
        else:
            grp = 'unknown'

        hc  = p.health_condition or 'Unknown'
        dr  = p.dietary_restrictions or 'Unknown'

        if hc not in hc_age:
            hc_age[hc] = {'child': 0, 'adult': 0, 'older': 0, 'unknown': 0}
        hc_age[hc][grp] += 1

        if dr not in diet_age:
            diet_age[dr] = {'child': 0, 'adult': 0, 'older': 0, 'unknown': 0}
        diet_age[dr][grp] += 1

    return jsonify({
        'total_profiles': UserProfile.query.count(),
        'age_groups'    : age_groups,
        'gender'        : gender_counts,
        'age_gender_matrix': matrix,
        'health_condition_by_gender': [
            {'condition': r[0], 'gender': r[1], 'count': r[2]} for r in hc_gender
        ],
        'diet_by_gender': [
            {'diet': r[0], 'gender': r[1], 'count': r[2]} for r in diet_gender
        ],
        'health_condition_by_age': [
            {'condition': hc, **counts} for hc, counts in hc_age.items()
        ],
        'diet_by_age': [
            {'diet': dr, **counts} for dr, counts in diet_age.items()
        ],
        'bmi': _compute_bmi_stats(),
    }), 200
@admin_bp.route('/predictions', methods=['GET'])
@admin_required
def list_predictions():
    from models.models import ModelPrediction
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    source   = request.args.get('source', '').strip()
    diet     = request.args.get('diet', '').strip()

    query = ModelPrediction.query
    if source:
        query = query.filter_by(source=source)
    if diet:
        query = query.filter(ModelPrediction.dietary_restrictions.ilike(f'%{diet}%'))

    total = query.count()
    preds = query.order_by(ModelPrediction.created_at.desc())\
                 .offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'predictions': [p.to_dict() for p in preds],
        'total'      : total,
        'page'       : page,
        'per_page'   : per_page,
        'pages'      : (total + per_page - 1) // per_page
    }), 200


@admin_bp.route('/predictions/stats', methods=['GET'])
@admin_required
def prediction_stats():
    from models.models import ModelPrediction
    from sqlalchemy import func

    total      = ModelPrediction.query.count()
    suitable   = ModelPrediction.query.filter_by(suitable=True).count()
    unsuitable = total - suitable

    # by source
    by_source = db.session.query(
        ModelPrediction.source,
        func.count(ModelPrediction.id).label('count')
    ).group_by(ModelPrediction.source).all()

    # by dietary restriction
    by_diet = db.session.query(
        ModelPrediction.dietary_restrictions,
        func.count(ModelPrediction.id).label('count'),
        func.avg(ModelPrediction.suitability_score).label('avg_score')
    ).group_by(ModelPrediction.dietary_restrictions).all()

    # by health condition
    by_condition = db.session.query(
        ModelPrediction.health_condition,
        func.count(ModelPrediction.id).label('count'),
        func.avg(ModelPrediction.suitability_score).label('avg_score')
    ).group_by(ModelPrediction.health_condition).all()

    # top predicted recipes
    top_recipes = db.session.query(
        ModelPrediction.recipe_name,
        func.count(ModelPrediction.id).label('count'),
        func.avg(ModelPrediction.suitability_score).label('avg_score')
    ).group_by(ModelPrediction.recipe_name)\
     .order_by(func.count(ModelPrediction.id).desc())\
     .limit(10).all()

    return jsonify({
        'total'      : total,
        'suitable'   : suitable,
        'unsuitable' : unsuitable,
        'suitable_pct': round(suitable / total * 100, 1) if total else 0,
        'by_source'  : [{'source': s, 'count': c} for s, c in by_source],
        'by_diet'    : [{'diet': d, 'count': c, 'avg_score': round(float(a), 3)} for d, c, a in by_diet],
        'by_condition': [{'condition': h, 'count': c, 'avg_score': round(float(a), 3)} for h, c, a in by_condition],
        'top_recipes': [{'name': r, 'count': c, 'avg_score': round(float(a), 3)} for r, c, a in top_recipes],
    }), 200
