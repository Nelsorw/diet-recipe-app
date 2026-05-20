from app import create_app
app = create_app()
with app.app_context():
    from utils.recommender import load_artifacts, get_recommendations
    import pandas as pd
    load_artifacts()
    from models.models import Recipe
    recipes = Recipe.query.limit(500).all()
    df = pd.DataFrame([{
        'id': r.id, 'name': r.name,
        'calories': r.calories, 'fat': r.fat, 'sugar': r.sugar,
        'sodium': r.sodium, 'protein': r.protein, 'saturated_fat': r.saturated_fat,
        'carbs': r.carbs, 'meal_type': r.meal_type, 'dish_type': r.dish_type,
        'dietary_attributes': r.dietary_attributes, 'image_url': r.image_url,
    } for r in recipes])
    targets = {'daily_calories': 2000, 'protein_g': 125, 'carbs_g': 225, 'fat_g': 67}
    class Profile:
        health_condition = 'No Specific Condition'
        def __init__(self, diet): self.dietary_restrictions = diet
    for diet in ['Unrestricted', 'Gluten-Free', 'Dairy-Free', 'Egg-Free', 'Dairy & Egg Free']:
        results = get_recommendations(df, Profile(diet), targets, top_n=20)
        print(f"{diet:20s} → {len(results)} results")
