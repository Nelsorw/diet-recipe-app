from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.models import User, UserProfile
from utils.nutrition import get_user_targets

profile_bp = Blueprint('profile', __name__)

VALID_ACTIVITY   = {'low', 'moderate', 'high'}
VALID_GOALS      = {'weight_loss', 'weight_gain', 'healthy_living'}
VALID_GENDERS    = {'male', 'female'}

VALID_CONDITIONS = {
    'No Specific Condition', 'High Blood Pressure',
    'Type 2 Diabetes', 'Heart Disease', 'Obesity', 'Osteoporosis'
}

VALID_RESTRICTIONS = {
    'Unrestricted', 'Gluten-Free', 'Egg-Free', 'Dairy & Egg Free',
    'Dairy-Free', 'Multiple Allergens', 'Gluten & Egg Free',
    'Gluten & Dairy Free', 'Shellfish-Free', 'Nut-Free'
}


def _validate_profile(data):
    required = ['full_name', 'age', 'gender', 'weight_kg', 'height_cm',
                'activity_level', 'health_goal', 'health_condition', 'dietary_restrictions']
    for field in required:
        if field not in data:
            return f'{field} is required.'

    if data['gender'] not in VALID_GENDERS:
        return f"gender must be one of: {', '.join(VALID_GENDERS)}"
    if data['activity_level'] not in VALID_ACTIVITY:
        return f"activity_level must be one of: {', '.join(VALID_ACTIVITY)}"
    if data['health_goal'] not in VALID_GOALS:
        return f"health_goal must be one of: {', '.join(VALID_GOALS)}"
    if data['health_condition'] not in VALID_CONDITIONS:
        return f"health_condition must be one of: {', '.join(VALID_CONDITIONS)}"
    if data['dietary_restrictions'] not in VALID_RESTRICTIONS:
        return f"dietary_restrictions must be one of: {', '.join(VALID_RESTRICTIONS)}"
    if not (1 <= int(data['age']) <= 120):
        return 'age must be between 1 and 120.'

    return None


@profile_bp.route('', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if not user.profile:
        return jsonify({'error': 'Profile not found. Please complete your profile.'}), 404

    targets = get_user_targets(user.profile)
    return jsonify({
        'profile'       : user.profile.to_dict(),
        'username'      : user.username,
        'daily_targets' : targets
    }), 200


@profile_bp.route('', methods=['POST'])
@jwt_required()
def create_profile():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if user.profile:
        return jsonify({'error': 'Profile already exists. Use PUT to update.'}), 409

    data  = request.get_json()
    error = _validate_profile(data)
    if error:
        return jsonify({'error': error}), 400

    profile = UserProfile(
        user_id              = user_id,
        full_name            = data['full_name'],
        age                  = int(data['age']),
        gender               = data['gender'],
        weight_kg            = float(data['weight_kg']),
        height_cm            = float(data['height_cm']),
        activity_level       = data['activity_level'],
        health_goal          = data['health_goal'],
        health_condition     = data['health_condition'],
        dietary_restrictions = data['dietary_restrictions']
    )

    db.session.add(profile)
    db.session.commit()

    targets = get_user_targets(profile)
    return jsonify({'message': 'Profile created.', 'profile': profile.to_dict(), 'daily_targets': targets}), 201


@profile_bp.route('', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if not user.profile:
        return jsonify({'error': 'Profile not found. Use POST to create one.'}), 404

    data  = request.get_json()
    error = _validate_profile(data)
    if error:
        return jsonify({'error': error}), 400

    p = user.profile
    p.full_name            = data['full_name']
    p.age                  = int(data['age'])
    p.gender               = data['gender']
    p.weight_kg            = float(data['weight_kg'])
    p.height_cm            = float(data['height_cm'])
    p.activity_level       = data['activity_level']
    p.health_goal          = data['health_goal']
    p.health_condition     = data['health_condition']
    p.dietary_restrictions = data['dietary_restrictions']

    # optional: update profile_image_url if provided
    if 'profile_image_url' in data:
        p.profile_image_url = data['profile_image_url']

    # optional: update username if provided
    if 'username' in data:
        existing = User.query.filter_by(username=data['username']).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'Username already taken.'}), 409
        user.username = data['username']

    db.session.commit()

    targets = get_user_targets(p)
    return jsonify({'message': 'Profile updated.', 'profile': p.to_dict(), 'daily_targets': targets}), 200


@profile_bp.route('/image', methods=['PUT'])
@jwt_required()
def update_profile_image():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if not user.profile:
        return jsonify({'error': 'Profile not found.'}), 404

    data = request.get_json()
    if not data or 'profile_image_url' not in data:
        return jsonify({'error': 'profile_image_url is required.'}), 400

    user.profile.profile_image_url = data['profile_image_url']
    db.session.commit()

    return jsonify({'message': 'Profile image updated.', 'profile_image_url': user.profile.profile_image_url}), 200