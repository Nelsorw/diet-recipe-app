import pandas as pd
from app import db
from models.models import Recipe


def get_recipes_df():
    recipes = Recipe.query.with_entities(
        Recipe.id, Recipe.name, Recipe.calories, Recipe.fat,
        Recipe.sugar, Recipe.sodium, Recipe.protein, Recipe.saturated_fat,
        Recipe.carbs, Recipe.meal_type, Recipe.dietary_attributes, Recipe.image_url
    ).all()

    return pd.DataFrame([{
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
        'dietary_attributes': r.dietary_attributes,
        'image_url'         : r.image_url
    } for r in recipes])


def get_recipes_by_meal_type(meal_type):
    recipes = Recipe.query.filter(
        Recipe.meal_type.ilike(meal_type)
    ).with_entities(
        Recipe.id, Recipe.name, Recipe.calories, Recipe.fat,
        Recipe.sugar, Recipe.sodium, Recipe.protein, Recipe.saturated_fat,
        Recipe.carbs, Recipe.meal_type, Recipe.dietary_attributes, Recipe.image_url
    ).all()

    return pd.DataFrame([{
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
        'dietary_attributes': r.dietary_attributes,
        'image_url'         : r.image_url
    } for r in recipes])


def get_recipe_by_id(recipe_id):
    return db.session.get(Recipe, recipe_id)