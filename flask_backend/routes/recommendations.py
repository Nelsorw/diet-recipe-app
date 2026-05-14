import os
import requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.models import User, Recipe
from utils.nutrition import get_user_targets
from utils.recommender import get_recommendations
from app import db
import pandas as pd
from random import randint

recommendations_bp = Blueprint('recommendations', __name__)

SAMPLE_SIZE  = 5000
PEXELS_KEY   = os.getenv('PEXELS_API_KEY', '')


def search_pexels(query: str) -> str | None:
    if not PEXELS_KEY:
        return None
    try:
        res = requests.get(
            'https://api.pexels.com/v1/search',
            headers={'Authorization': PEXELS_KEY},
            params={'query': query, 'per_page': 1, 'orientation': 'landscape'},
            timeout=5
        )
        if res.status_code == 200:
            photos = res.json().get('photos', [])
            if photos:
                return photos[0]['src']['medium']
    except Exception:
        pass
    return None


def get_image_for_recipe(recipe: Recipe) -> str:
    if recipe.image_url:
        return recipe.image_url

    search_query = recipe.name or ''
    if recipe.ingredients:
        try:
            import json as _json
            cleaned  = recipe.ingredients.replace("'", '"')
            ing_list = _json.loads(cleaned)
            if ing_list:
                # use first 3 ingredients
                top_ings     = ing_list[:3]
                search_query = f"{recipe.name} {' '.join(top_ings)}"
        except Exception:
            pass

    image_url = search_pexels(search_query)

    if image_url:
        recipe.image_url = image_url
        db.session.add(recipe)

    return image_url or ''


@recommendations_bp.route('', methods=['GET'])
@jwt_required()
def recommend():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if not user.profile:
        return jsonify({'error': 'Please complete your profile first.'}), 400

    top_n     = request.args.get('top_n', 20, type=int)
    meal_type = request.args.get('meal_type', None)

    targets  = get_user_targets(user.profile)
    results  = []
    attempts = 0
    max_attempts = 5

    while len(results) < top_n and attempts < max_attempts:
        query = Recipe.query
        if meal_type and meal_type.lower() != 'all':
            query = query.filter(Recipe.meal_type.ilike(meal_type))

        total  = query.count()
        if total == 0:
            break

        offset  = randint(0, max(0, total - SAMPLE_SIZE))
        recipes = query.offset(offset).limit(SAMPLE_SIZE).all()

        recipes_df = pd.DataFrame([{
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
            'dietary_attributes': r.dietary_attributes
        } for r in recipes])

        batch_results = get_recommendations(recipes_df, user.profile, targets, top_n=top_n)
        results.extend(batch_results)
        attempts += 1

    # Deduplicate by id
    seen           = set()
    unique_results = []
    for r in results:
        if r['id'] not in seen:
            seen.add(r['id'])
            unique_results.append(r)

    unique_results = unique_results[:top_n]

    # Fetch and cache images for all recommended recipes
    recipe_map = {r.id: r for r in Recipe.query.filter(
        Recipe.id.in_([r['id'] for r in unique_results])
    ).all()}

    for r in unique_results:
        recipe_obj    = recipe_map.get(r['id'])
        r['image_url'] = get_image_for_recipe(recipe_obj) if recipe_obj else ''

    db.session.commit()

    print(f'Recommendations found: {len(unique_results)} after {attempts} attempts')

    return jsonify({
        'user_targets'    : targets,
        'total_results'   : len(unique_results),
        'meal_type_filter': meal_type,
        'recommendations' : unique_results
    }), 200