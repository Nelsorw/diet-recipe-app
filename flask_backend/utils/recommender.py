import joblib
import json
import numpy as np
import pandas as pd
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models', 'ml')

_model      = None
_le_health  = None
_le_diet    = None
_le_attr    = None
_le_meal    = None
_le_dish    = None
_feat_cols  = None


def load_artifacts():
    global _model, _le_health, _le_diet, _le_attr, _le_meal, _le_dish, _feat_cols
    _model     = joblib.load(os.path.join(MODEL_DIR, 'suitability_lgbm_model.pkl'))
    _le_health = joblib.load(os.path.join(MODEL_DIR, 'label_encoder_health_condition.pkl'))
    _le_diet   = joblib.load(os.path.join(MODEL_DIR, 'label_encoder_dietary_restrictions.pkl'))
    _le_attr   = joblib.load(os.path.join(MODEL_DIR, 'label_encoder_dietary_attributes.pkl'))
    _le_meal   = joblib.load(os.path.join(MODEL_DIR, 'label_encoder_meal_type.pkl'))
    _le_dish   = joblib.load(os.path.join(MODEL_DIR, 'label_encoder_dish_type.pkl'))
    with open(os.path.join(MODEL_DIR, 'feature_cols.json')) as f:
        _feat_cols = json.load(f)


def _build_features(recipe, user_health_enc, user_diet_enc, meal_targets):
    calories      = recipe.get('calories', 0)
    fat           = recipe.get('fat', 0)
    sugar         = recipe.get('sugar', 0)
    sodium        = recipe.get('sodium', 0)
    protein       = recipe.get('protein', 0)
    saturated_fat = recipe.get('saturated_fat', 0)
    carbs         = recipe.get('carbs', 0)

    try:
        meal_type_enc = int(_le_meal.transform([recipe.get('meal_type', 'dinner')])[0])
    except Exception:
        meal_type_enc = 0

    try:
        diet_attr_enc = int(_le_attr.transform([recipe.get('dietary_attributes', 'No Nutritional Focus')])[0])
    except Exception:
        diet_attr_enc = 0

    try:
        dish_type_enc = int(_le_dish.transform([recipe.get('dish_type', 'Other')])[0])
    except Exception:
        dish_type_enc = 0

    row = {
        'calories'              : calories,
        'fat'                   : fat,
        'sugar'                 : sugar,
        'sodium'                : sodium,
        'protein'               : protein,
        'saturated_fat'         : saturated_fat,
        'carbs'                 : carbs,
        'calorie_diff'          : abs(calories - meal_targets['meal_calories']),
        'protein_diff'          : abs(protein  - meal_targets['meal_protein']),
        'carb_diff'             : abs(carbs    - meal_targets['meal_carbs']),
        'fat_diff'              : abs(fat      - meal_targets['meal_fat']),
        'protein_ratio'         : protein       / (calories + 1),
        'fat_ratio'             : fat           / (calories + 1),
        'carb_ratio'            : carbs         / (calories + 1),
        'saturated_fat_ratio'   : saturated_fat / (fat + 1),
        'sugar_per_carb'        : sugar         / (carbs + 1),
        'user_health_enc'       : user_health_enc,
        'user_diet_enc'         : user_diet_enc,
        'meal_type_enc'         : meal_type_enc,
        'dish_type_enc'         : dish_type_enc,
        'dietary_attributes_enc': diet_attr_enc
    }
    return pd.DataFrame([row], columns=_feat_cols)


def get_recommendations(recipes_df, profile, targets, top_n=20):
    if _model is None:
        load_artifacts()

    try:
        user_health_enc = int(_le_health.transform([profile.health_condition])[0])
    except Exception:
        user_health_enc = 0

    try:
        user_diet_enc = int(_le_diet.transform([profile.dietary_restrictions])[0])
    except Exception:
        user_diet_enc = 0

    meal_targets = {
        'meal_calories' : targets['daily_calories'] / 3,
        'meal_protein'  : targets['protein_g']      / 3,
        'meal_carbs'    : targets['carbs_g']         / 3,
        'meal_fat'      : targets['fat_g']           / 3
    }

    feature_rows = []
    for _, recipe in recipes_df.iterrows():
        feature_rows.append(
            _build_features(recipe.to_dict(), user_health_enc, user_diet_enc, meal_targets)
        )

    X     = pd.concat(feature_rows, ignore_index=True)
    X.columns = _feat_cols  
    probs = _model.predict_proba(X)[:, 1]

    recipes_df = recipes_df.copy()
    recipes_df['suitability_score'] = probs
    recipes_df['suitable']          = (probs >= 0.3).astype(int)

    suitable = recipes_df[recipes_df['suitable'] == 1].sort_values(
        'suitability_score', ascending=False
    ).head(top_n)

    return suitable.to_dict(orient='records')

