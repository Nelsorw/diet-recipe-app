from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date, timedelta
import pandas as pd
import random
import os
import requests as http_requests
from app import db
from models.models import User, MealPlan, Recipe
from utils.nutrition import get_user_targets
from utils.recommender import get_recommendations
from routes.notifications import create_notification

mealplan_bp  = Blueprint('mealplan', __name__)
MEAL_TYPES   = ['breakfast', 'lunch', 'dinner']
SAMPLE_SIZE  = 500
TOLERANCE    = 0.20   # day total must be within 80–120% of target
MAX_RETRIES  = 5

# How much of the daily target each meal should contribute
MEAL_CALORIE_SPLIT = {
    'breakfast': 0.30,  # 30% of daily calories
    'lunch'    : 0.35,  # 35% of daily calories
    'dinner'   : 0.35,  # 35% of daily calories
}


def _get_active_profile(user):
    """Return the user's active profile, falling back to their first profile."""
    from models.models import UserProfile
    if user.active_profile_id:
        profile = UserProfile.query.filter_by(
            id=user.active_profile_id, user_id=user.id
        ).first()
        if profile:
            return profile
    return UserProfile.query.filter_by(user_id=user.id).first()


PEXELS_KEY = os.getenv('PEXELS_API_KEY', '')


def _get_sample_df(meal_type, exclude_ids=None, sample_size=SAMPLE_SIZE, prefetched=None):
    """
    If prefetched dict is provided (meal_type -> (df, recipe_map)),
    return from cache instead of hitting the DB again.
    """
    if prefetched and meal_type in prefetched:
        df, recipe_map = prefetched[meal_type]
        if exclude_ids:
            df = df[~df['id'].isin(exclude_ids)]
        return df, recipe_map

    query = Recipe.query.filter(Recipe.meal_type.ilike(meal_type))
    if exclude_ids:
        query = query.filter(~Recipe.id.in_(exclude_ids))
    total = query.count()
    if total == 0:
        return pd.DataFrame(), {}
    offset  = random.randint(0, max(0, total - sample_size))
    recipes = query.offset(offset).limit(sample_size).all()
    # keep id→recipe map for image_url lookup
    recipe_map = {r.id: r for r in recipes}
    df = pd.DataFrame([{
        'id'                : r.id,
        'name'              : r.name,
        'calories'          : r.calories,
        'fat'               : r.fat,
        'sugar'             : r.sugar,
        'sodium'            : r.sodium,
        'protein'           : r.protein,
        'saturated_fat'     : r.saturated_fat,
        'carbs'             : r.carbs,
        'meal_type'         : r.meal_type,
        'dish_type'         : r.dish_type,
        'dietary_attributes': r.dietary_attributes,
        'image_url'         : r.image_url
    } for r in recipes])
    return df, recipe_map


def _prefetch_all_meal_types(sample_size=SAMPLE_SIZE):
    """Fetch one batch per meal type upfront — reused across all 7 days."""
    prefetched = {}
    for meal_type in MEAL_TYPES:
        df, recipe_map = _get_sample_df(meal_type, sample_size=sample_size)
        prefetched[meal_type] = (df, recipe_map)
    return prefetched


def _nutrition_ok(day_plan, targets):
    total_cal  = sum(m['calories'] for m in day_plan)
    total_pro  = sum(m['protein']  for m in day_plan)
    total_carb = sum(m['carbs']    for m in day_plan)
    total_fat  = sum(m['fat']      for m in day_plan)

    target_cal  = targets.get('daily_calories', 2000)
    target_pro  = targets.get('protein_g', 50)
    target_carb = targets.get('carbs_g', 250)
    target_fat  = targets.get('fat_g', 65)

    def within(actual, target):
        if target == 0:
            return True
        ratio = actual / target
        # Must be between 80% and 120% of target
        return 0.80 <= ratio <= 1.20

    # Calories is the most important — must be within range
    # Macros: at least 3 out of 3 must be within range
    return (
        within(total_cal,  target_cal)  and
        within(total_pro,  target_pro)  and
        within(total_carb, target_carb) and
        within(total_fat,  target_fat)
    )


def _get_recent_recipe_names(user_id, profile_id, days=7):
    since = date.today() - timedelta(days=days)
    plans = MealPlan.query.filter(
        MealPlan.user_id    == user_id,
        MealPlan.profile_id == profile_id,
        MealPlan.plan_date  >= since
    ).all()
    return set(p.recipe_name for p in plans)


def _generate_day_plan(user, profile, targets, plan_date, exclude_names=None, prefetched=None):
    exclude_names = exclude_names or set()

    for attempt in range(MAX_RETRIES):
        day_meals  = []
        recipe_ids = []

        for meal_type in MEAL_TYPES:
            meal_df, recipe_map = _get_sample_df(meal_type, prefetched=prefetched)
            if meal_df.empty:
                continue

            if exclude_names:
                meal_df = meal_df[~meal_df['name'].isin(exclude_names)]
            if meal_df.empty:
                meal_df, recipe_map = _get_sample_df(meal_type)

            # Build per-meal targets based on the split ratios
            split = MEAL_CALORIE_SPLIT.get(meal_type, 0.33)
            meal_targets = {
                'daily_calories': targets.get('daily_calories', 2000) * split * 3,  # *3 so recommender divides by 3 internally
                'protein_g'     : targets.get('protein_g', 50)        * split * 3,
                'carbs_g'       : targets.get('carbs_g', 250)         * split * 3,
                'fat_g'         : targets.get('fat_g', 65)            * split * 3,
            }

            results = get_recommendations(meal_df, profile, meal_targets, top_n=5,
                                          user_id=user.id, source='mealplan')
            if not results:
                continue

            top = random.choice(results[:5])
            day_meals.append((meal_type, top))
            recipe_ids.append(top.get('id'))

        if not day_meals:
            break

        meals_only = [m[1] for m in day_meals]
        if _nutrition_ok(meals_only, targets) or attempt == MAX_RETRIES - 1:
            # On last attempt, check if this is better than nothing
            entries = []
            for meal_type, top in day_meals:
                entry = MealPlan(
                    user_id     = user.id,
                    profile_id  = profile.id,
                    recipe_id   = top.get('id'),
                    plan_date   = plan_date,
                    meal_type   = meal_type,
                    recipe_name = str(top.get('name', 'Unknown')),
                    calories    = float(top.get('calories', 0)),
                    protein     = float(top.get('protein', 0)),
                    carbs       = float(top.get('carbs', 0)),
                    fat         = float(top.get('fat', 0))
                )
                db.session.add(entry)
                entries.append(entry)
            db.session.commit()
            return [e.to_dict() for e in entries]

    return []

def _fetch_pexels(recipe) -> str | None:
    """Fetch image from Pexels and cache it if not already stored."""
    if recipe.image_url:
        return recipe.image_url
    if not PEXELS_KEY:
        return None
    try:
        search_query = recipe.name or ''
        if recipe.ingredients:
            try:
                import json as _json
                cleaned  = recipe.ingredients.replace("'", '"')
                ing_list = _json.loads(cleaned)
                if ing_list:
                    top_ings     = ing_list[:3]
                    search_query = f"{recipe.name} {' '.join(top_ings)}"
            except Exception:
                pass

        res = http_requests.get(
            'https://api.pexels.com/v1/search',
            headers={'Authorization': PEXELS_KEY},
            params={'query': search_query, 'per_page': 1, 'orientation': 'landscape'},
            timeout=5
        )
        if res.status_code == 200:
            photos = res.json().get('photos', [])
            if photos:
                url = photos[0]['src']['medium']
                recipe.image_url = url
                db.session.add(recipe)
                return url
    except Exception:
        pass
    return None


@mealplan_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_plan():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    profile = _get_active_profile(user)
    if not profile:
        return jsonify({'error': 'Please complete your profile first.'}), 400

    mode    = request.args.get('mode', 'weekly')
    targets = get_user_targets(profile)
    exclude_names = _get_recent_recipe_names(user_id, profile.id, days=7)

    if mode == 'daily':
        plan_date = date.today()
        MealPlan.query.filter_by(user_id=user_id, profile_id=profile.id, plan_date=plan_date).delete()
        db.session.commit()
        day_plan = _generate_day_plan(user, profile, targets, plan_date, exclude_names)
        return jsonify({
            'mode'         : 'daily',
            'plan_date'    : plan_date.isoformat(),
            'daily_targets': targets,
            'meal_plan'    : day_plan,
            'day_totals'   : {
                'calories': round(sum(m['calories'] for m in day_plan), 2),
                'protein' : round(sum(m['protein']  for m in day_plan), 2),
                'carbs'   : round(sum(m['carbs']    for m in day_plan), 2),
                'fat'     : round(sum(m['fat']      for m in day_plan), 2)
            }
        }), 201

    else:
        start_date = date.today()
        MealPlan.query.filter(
            MealPlan.user_id    == user_id,
            MealPlan.profile_id == profile.id,
            MealPlan.plan_date  >= start_date,
            MealPlan.plan_date  <= start_date + timedelta(days=6)
        ).delete()
        db.session.commit()

        # Prefetch one batch per meal type — reused across all 7 days
        # This reduces DB queries from 21 down to 3 (one per meal type)
        prefetched = _prefetch_all_meal_types()

        weekly_plan = {}
        for i in range(7):
            plan_date = start_date + timedelta(days=i)
            day_plan  = _generate_day_plan(user, profile, targets, plan_date,
                                           exclude_names, prefetched=prefetched)
            weekly_plan[plan_date.isoformat()] = {
                'meals'     : day_plan,
                'day_totals': {
                    'calories': round(sum(m['calories'] for m in day_plan), 2),
                    'protein' : round(sum(m['protein']  for m in day_plan), 2),
                    'carbs'   : round(sum(m['carbs']    for m in day_plan), 2),
                    'fat'     : round(sum(m['fat']      for m in day_plan), 2)
                }
            }
            for m in day_plan:
                exclude_names.add(m['recipe_name'])
        # create notification
        create_notification(
            user_id,
            "📅 Weekly Meal Plan Ready!",
            "Your personalized weekly meal plan has been generated. Check it out and start cooking!",
            'meal_plan'
        )
        # generate meal reminders for today
        # generate_meal_reminders(user_id)

        return jsonify({
            'mode'         : 'weekly',
            'week_start'   : start_date.isoformat(),
            'week_end'     : (start_date + timedelta(days=6)).isoformat(),
            'daily_targets': targets,
            'weekly_plan'  : weekly_plan
        }), 201


@mealplan_bp.route('/daily', methods=['GET'])
@jwt_required()
def get_daily_plan():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None
    date_str   = request.args.get('date', date.today().isoformat())
    try:
        plan_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    plans = MealPlan.query.filter_by(
        user_id=user_id, profile_id=profile_id, plan_date=plan_date
    ).all()
    if not plans:
        return jsonify({'message': 'No meal plan for this date.', 'meal_plan': []}), 200

    return jsonify({
        'plan_date': plan_date.isoformat(),
        'meal_plan': [p.to_dict() for p in plans]
    }), 200


@mealplan_bp.route('/weekly', methods=['GET'])
@jwt_required()
def get_weekly_plan():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None

    # Always show from today forward (7 days), regardless of when plan was generated
    today      = date.today()
    start_date = today
    end_date   = today + timedelta(days=6)

    plans = MealPlan.query.filter(
        MealPlan.user_id    == user_id,
        MealPlan.profile_id == profile_id,
        MealPlan.plan_date  >= start_date,
        MealPlan.plan_date  <= end_date
    ).order_by(MealPlan.plan_date, MealPlan.meal_type).all()

    if not plans:
        return jsonify({
            'week_start' : start_date.isoformat(),
            'week_end'   : end_date.isoformat(),
            'weekly_plan': {},
            'daily_targets': get_user_targets(profile) if profile else {}
        }), 200

    recipe_ids  = [p.recipe_id for p in plans if p.recipe_id]
    recipes_map = {r.id: r for r in Recipe.query.filter(Recipe.id.in_(recipe_ids)).all()}

    for recipe in recipes_map.values():
        _fetch_pexels(recipe)
    db.session.commit()

    weekly = {}
    for p in plans:
        key = p.plan_date.isoformat()
        if key not in weekly:
            weekly[key] = {
                'meals'     : [],
                'day_totals': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
            }
        meal_dict            = p.to_dict()
        recipe               = recipes_map.get(p.recipe_id)
        meal_dict['image_url'] = recipe.image_url if recipe else None
        weekly[key]['meals'].append(meal_dict)
        weekly[key]['day_totals']['calories'] += p.calories or 0
        weekly[key]['day_totals']['protein']  += p.protein  or 0
        weekly[key]['day_totals']['carbs']    += p.carbs    or 0
        weekly[key]['day_totals']['fat']      += p.fat      or 0

    for day in weekly.values():
        for k in day['day_totals']:
            day['day_totals'][k] = round(day['day_totals'][k], 2)

    return jsonify({
        'week_start'   : start_date.isoformat(),
        'week_end'     : end_date.isoformat(),
        'daily_targets': get_user_targets(profile) if profile else {},
        'weekly_plan'  : weekly
    }), 200


@mealplan_bp.route('/regenerate-day', methods=['POST'])
@jwt_required()
def regenerate_day():
    user_id  = int(get_jwt_identity())
    user     = User.query.get_or_404(user_id)
    profile  = _get_active_profile(user)
    date_str = request.args.get('date', date.today().isoformat())

    try:
        plan_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date format.'}), 400

    MealPlan.query.filter_by(user_id=user_id, profile_id=profile.id, plan_date=plan_date).delete()
    db.session.commit()

    targets       = get_user_targets(profile)
    exclude_names = _get_recent_recipe_names(user_id, profile.id, days=7)
    day_plan      = _generate_day_plan(user, profile, targets, plan_date, exclude_names)

    # enrich with image_url
    recipe_ids  = [m['recipe_id'] for m in day_plan if m.get('recipe_id')]
    recipes_map = {r.id: r for r in Recipe.query.filter(Recipe.id.in_(recipe_ids)).all()}
    
    # fetch missing images
    for recipe in recipes_map.values():
        _fetch_pexels(recipe)
    db.session.commit()


    for m in day_plan:
        recipe = recipes_map.get(m.get('recipe_id'))
        m['image_url'] = recipe.image_url if recipe else None

    return jsonify({
        'plan_date' : plan_date.isoformat(),
        'meal_plan' : day_plan,
        'day_totals': {
            'calories': round(sum(m['calories'] for m in day_plan), 2),
            'protein' : round(sum(m['protein']  for m in day_plan), 2),
            'carbs'   : round(sum(m['carbs']    for m in day_plan), 2),
            'fat'     : round(sum(m['fat']      for m in day_plan), 2)
        }
    }), 200


@mealplan_bp.route('/add-recipe', methods=['POST'])
@jwt_required()
def add_recipe():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None
    data       = request.get_json()

    recipe_id     = data.get('recipe_id')
    plan_date_str = data.get('plan_date')
    replace       = data.get('replace', False)

    if not recipe_id or not plan_date_str:
        return jsonify({'error': 'recipe_id and plan_date are required.'}), 400

    try:
        plan_date = date.fromisoformat(plan_date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date format.'}), 400

    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({'error': 'Recipe not found.'}), 404

    # check for conflict on this profile
    existing = MealPlan.query.filter_by(
        user_id    = user_id,
        profile_id = profile_id,
        plan_date  = plan_date,
        meal_type  = recipe.meal_type
    ).first()

    if existing and not replace:
        return jsonify({
            'conflict'    : True,
            'existing'    : existing.to_dict(),
            'message'     : f'{recipe.meal_type.capitalize()} already planned for {plan_date_str}.'
        }), 409

    if existing and replace:
        db.session.delete(existing)
        db.session.commit()

    entry = MealPlan(
        user_id     = user_id,
        profile_id  = profile_id,
        recipe_id   = recipe_id,
        plan_date   = plan_date,
        meal_type   = recipe.meal_type or 'dinner',
        recipe_name = recipe.name,
        calories    = recipe.calories or 0,
        protein     = recipe.protein  or 0,
        carbs       = recipe.carbs    or 0,
        fat         = recipe.fat      or 0
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({'message': 'Recipe added to meal plan.', 'plan': entry.to_dict()}), 201