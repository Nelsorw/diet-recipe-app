#!/usr/bin/env python3
"""
One-time script to import db.csv into SQLite.
Run once: python scripts/import_recipes.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from app import create_app, db
from models.models import Recipe

DATASET_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'db.csv')
BATCH_SIZE   = 1000

def run():
    app = create_app()
    with app.app_context():
        db.create_all()

        existing = Recipe.query.count()
        if existing > 0:
            print(f'Recipes already imported ({existing} records). Skipping.')
            return

        print(f'Reading dataset from {DATASET_PATH}...')
        df = pd.read_csv(DATASET_PATH)
        df.drop_duplicates(inplace=True)
        df.reset_index(drop=True, inplace=True)

        # Fill missing values
        str_cols = ['name', 'steps', 'description', 'ingredients', 'meal_type','dish_type',
                    'dietary_attributes']
        for col in str_cols:
            if col in df.columns:
                df[col] = df[col].fillna('')

        num_cols = ['minutes', 'n_steps', 'n_ingredients', 'calories', 'fat',
                    'sugar', 'sodium', 'protein', 'saturated_fat', 'carbs']
        for col in num_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        total   = len(df)
        batches = (total // BATCH_SIZE) + 1
        print(f'Importing {total} recipes in batches of {BATCH_SIZE}...')

        for i in range(batches):
            batch = df.iloc[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
            if batch.empty:
                continue

            records = []
            for _, row in batch.iterrows():
                records.append(Recipe(
                    name                = str(row.get('name', '')),
                    minutes             = int(row.get('minutes', 0)),
                    n_steps             = int(row.get('n_steps', 0)),
                    steps               = str(row.get('steps', '')),
                    description         = str(row.get('description', '')),
                    ingredients         = str(row.get('ingredients', '')),
                    n_ingredients       = int(row.get('n_ingredients', 0)),
                    calories            = float(row.get('calories', 0)),
                    fat                 = float(row.get('fat', 0)),
                    sugar               = float(row.get('sugar', 0)),
                    sodium              = float(row.get('sodium', 0)),
                    protein             = float(row.get('protein', 0)),
                    saturated_fat       = float(row.get('saturated_fat', 0)),
                    carbs               = float(row.get('carbs', 0)),
                    meal_type           = str(row.get('meal_type', '')),
                    dish_type           = str(row.get('dish_type', '')),                    
                    dietary_attributes  = str(row.get('dietary_attributes', ''))
                ))

            db.session.bulk_save_objects(records)
            db.session.commit()
            print(f'  Batch {i+1}/{batches} imported ({min((i+1)*BATCH_SIZE, total)}/{total})')

        print(f'\n✓ Import complete. {Recipe.query.count()} recipes in database.')

if __name__ == '__main__':
    run()
