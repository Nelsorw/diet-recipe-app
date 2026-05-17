import joblib
import json
import numpy as np
import pandas as pd
import os
import warnings

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


def get_recommendations(recipes_df: pd.DataFrame, profile, targets, top_n: int = 20):
    """
    Vectorized inference — builds the full feature matrix in one pass
    instead of creating a DataFrame per row. ~10-50x faster than the
    previous row-by-row approach.
    """
    if _model is None:
        load_artifacts()

    if recipes_df.empty:
        return []

    # ── user encodings (scalar, same for every row) ──────────────────────
    try:
        user_health_enc = int(_le_health.transform([profile.health_condition])[0])
    except Exception:
        user_health_enc = 0

    try:
        user_diet_enc = int(_le_diet.transform([profile.dietary_restrictions])[0])
    except Exception:
        user_diet_enc = 0

    meal_cal   = targets['daily_calories'] / 3
    meal_pro   = targets['protein_g']      / 3
    meal_carbs = targets['carbs_g']        / 3
    meal_fat   = targets['fat_g']          / 3

    # ── pull numeric columns directly from the DataFrame ─────────────────
    df = recipes_df.copy()

    cal  = df['calories'].fillna(0).values.astype(float)
    fat  = df['fat'].fillna(0).values.astype(float)
    sug  = df['sugar'].fillna(0).values.astype(float)
    sod  = df['sodium'].fillna(0).values.astype(float)
    pro  = df['protein'].fillna(0).values.astype(float)
    sfat = df['saturated_fat'].fillna(0).values.astype(float)
    carb = df['carbs'].fillna(0).values.astype(float)

    # ── encode categorical columns in bulk ───────────────────────────────
    def bulk_encode(encoder, series, default=0):
        vals = series.fillna('').astype(str).values
        known = set(encoder.classes_)
        encoded = np.array([
            int(encoder.transform([v])[0]) if v in known else default
            for v in vals
        ], dtype=float)
        return encoded

    meal_type_enc = bulk_encode(_le_meal, df.get('meal_type', pd.Series([''] * len(df))))
    diet_attr_enc = bulk_encode(_le_attr, df.get('dietary_attributes', pd.Series([''] * len(df))))
    dish_type_enc = bulk_encode(_le_dish, df.get('dish_type', pd.Series([''] * len(df))))

    # ── build feature matrix in one shot ─────────────────────────────────
    n = len(df)
    X = pd.DataFrame({
        'calories'              : cal,
        'fat'                   : fat,
        'sugar'                 : sug,
        'sodium'                : sod,
        'protein'               : pro,
        'saturated_fat'         : sfat,
        'carbs'                 : carb,
        'calorie_diff'          : np.abs(cal  - meal_cal),
        'protein_diff'          : np.abs(pro  - meal_pro),
        'carb_diff'             : np.abs(carb - meal_carbs),
        'fat_diff'              : np.abs(fat  - meal_fat),
        'protein_ratio'         : pro  / (cal  + 1),
        'fat_ratio'             : fat  / (cal  + 1),
        'carb_ratio'            : carb / (cal  + 1),
        'saturated_fat_ratio'   : sfat / (fat  + 1),
        'sugar_per_carb'        : sug  / (carb + 1),
        'user_health_enc'       : np.full(n, user_health_enc, dtype=float),
        'user_diet_enc'         : np.full(n, user_diet_enc,   dtype=float),
        'meal_type_enc'         : meal_type_enc,
        'dish_type_enc'         : dish_type_enc,
        'dietary_attributes_enc': diet_attr_enc,
    }, columns=_feat_cols)

    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        probs = _model.predict_proba(X)[:, 1]

    df['suitability_score'] = probs

    # Per-diet thresholds — the model was trained on heavily imbalanced data
    # (222k Unrestricted vs 1-5k for each restricted diet), so restricted diets
    # score in a completely different range (0.007–0.06 vs 0.96–0.98).
    DIET_THRESHOLDS = {
        'Unrestricted'    : 0.50,
        'Gluten-Free'     : 0.01,
        'Dairy-Free'      : 0.005,
        'Egg-Free'        : 0.005,
        'Dairy & Egg Free': 0.008,
    }
    threshold = DIET_THRESHOLDS.get(profile.dietary_restrictions, 0.01)

    df['suitable'] = (probs >= threshold).astype(int)

    suitable = (
        df[df['suitable'] == 1]
        .sort_values('suitability_score', ascending=False)
        .head(top_n)
    )

    # final fallback: if still empty, return top_n by score regardless
    if suitable.empty:
        suitable = df.sort_values('suitability_score', ascending=False).head(top_n)

    # ── Normalize scores to 50–97% display range, then shuffle ─────────
    # - Top score maps to 93–97% (random, not always 100%)
    # - Bottom score maps to 50%
    # - Results are shuffled so high scores aren't always first
    scores = suitable['suitability_score'].values
    s_min, s_max = scores.min(), scores.max()
    suitable = suitable.copy()
    if s_max > s_min:
        normalized = (scores - s_min) / (s_max - s_min)          # 0.0 – 1.0
        # top maps to a random value between 0.93 and 0.97
        top_cap = 0.93 + np.random.uniform(0, 0.04)
        suitable['suitability_score'] = 0.50 + normalized * (top_cap - 0.50)
    else:
        suitable['suitability_score'] = 0.93 + np.random.uniform(0, 0.04)

    # shuffle so scores aren't visibly sorted highest-to-lowest
    suitable = suitable.sample(frac=1, random_state=None).reset_index(drop=True)

    return suitable.to_dict(orient='records')
