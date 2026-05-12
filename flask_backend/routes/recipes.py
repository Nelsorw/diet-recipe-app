import os
import requests
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from flask_cors import cross_origin

recipes_bp      = Blueprint('recipes', __name__)
PEXELS_KEY      = os.getenv('PEXELS_API_KEY', '')

MEAL_FALLBACKS = {
    'breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600',
    'lunch'    : 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    'dinner'   : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
    'snack'    : 'https://images.unsplash.com/photo-1559181567-c3190ca9d222?w=600',
    'dessert'  : 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600',
    'soup'     : 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600',
    'condiment': 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=600',
}
DEFAULT_IMG = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600'


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


@recipes_bp.route('/<int:recipe_id>', methods=['GET'])
@cross_origin()
@jwt_required()
def get_recipe(recipe_id):
    from app import db
    from models.models import Recipe

    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({'error': 'Recipe not found.'}), 404

    data = recipe.to_dict()

    if recipe.image_url:
        data['image'] = recipe.image_url
    else:
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

        image_url = search_pexels(search_query)

        if not image_url:
            image_url = MEAL_FALLBACKS.get(
                recipe.meal_type.lower() if recipe.meal_type else '',
                DEFAULT_IMG
            )

        recipe.image_url = image_url
        db.session.commit()

        data['image'] = image_url

    return jsonify(data), 200