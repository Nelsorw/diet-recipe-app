from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.models import SavedRecipe, Recipe, User
from routes.profile import _get_active_profile

favorites_bp = Blueprint('favorites', __name__)


def _profile_id(user_id: int) -> int | None:
    user    = User.query.get(user_id)
    profile = _get_active_profile(user) if user else None
    return profile.id if profile else None


@favorites_bp.route('', methods=['GET'])
@jwt_required()
def get_favorites():
    user_id    = int(get_jwt_identity())
    profile_id = _profile_id(user_id)

    saved = SavedRecipe.query.filter_by(
        user_id=user_id, profile_id=profile_id
    ).order_by(SavedRecipe.saved_at.desc()).all()

    recipe_ids = [s.recipe_id for s in saved]
    recipes    = {r.id: r for r in Recipe.query.filter(Recipe.id.in_(recipe_ids)).all()}

    result = []
    for s in saved:
        r = recipes.get(s.recipe_id)
        if r:
            d = r.to_dict()
            d['saved_at'] = s.saved_at.isoformat()
            result.append(d)

    return jsonify({'favorites': result, 'count': len(result)}), 200


@favorites_bp.route('/<int:recipe_id>', methods=['POST'])
@jwt_required()
def save_recipe(recipe_id):
    user_id    = int(get_jwt_identity())
    profile_id = _profile_id(user_id)

    if not Recipe.query.get(recipe_id):
        return jsonify({'error': 'Recipe not found.'}), 404

    existing = SavedRecipe.query.filter_by(
        user_id=user_id, profile_id=profile_id, recipe_id=recipe_id
    ).first()
    if existing:
        return jsonify({'message': 'Already saved.', 'saved': True}), 200

    entry = SavedRecipe(user_id=user_id, profile_id=profile_id, recipe_id=recipe_id)
    db.session.add(entry)
    db.session.commit()
    return jsonify({'message': 'Recipe saved.', 'saved': True}), 201


@favorites_bp.route('/<int:recipe_id>', methods=['DELETE'])
@jwt_required()
def unsave_recipe(recipe_id):
    user_id    = int(get_jwt_identity())
    profile_id = _profile_id(user_id)

    entry = SavedRecipe.query.filter_by(
        user_id=user_id, profile_id=profile_id, recipe_id=recipe_id
    ).first()
    if not entry:
        return jsonify({'error': 'Not saved.'}), 404

    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Recipe removed from favorites.', 'saved': False}), 200


@favorites_bp.route('/ids', methods=['GET'])
@jwt_required()
def get_saved_ids():
    """Returns just the list of saved recipe IDs — fast check for the UI."""
    user_id    = int(get_jwt_identity())
    profile_id = _profile_id(user_id)
    ids = [s.recipe_id for s in SavedRecipe.query.filter_by(
        user_id=user_id, profile_id=profile_id
    ).all()]
    return jsonify({'ids': ids}), 200
