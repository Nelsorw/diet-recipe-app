"""
Fix wrongly labeled predictions.
Before the logging fix, ALL predictions were labeled 'mealplan'.
This script relabels predictions that don't have a matching meal_plan entry
back to 'recommendation'.
Run once: python fix_predictions.py
"""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur  = conn.cursor()

# Count current state
cur.execute("SELECT source, COUNT(*) FROM model_predictions GROUP BY source ORDER BY source")
print("Before:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]:,}")

# Relabel predictions that have NO matching meal_plan entry as 'recommendation'
# A real mealplan prediction should have a recipe_id that exists in meal_plans for that user
cur.execute("""
    UPDATE model_predictions
    SET source = 'recommendation'
    WHERE source = 'mealplan'
    AND NOT EXISTS (
        SELECT 1 FROM meal_plans p
        WHERE p.recipe_id = model_predictions.recipe_id
        AND   p.user_id   = model_predictions.user_id
    )
""")
updated = cur.rowcount
conn.commit()

# Count after
cur.execute("SELECT source, COUNT(*) FROM model_predictions GROUP BY source ORDER BY source")
print(f"\nAfter (fixed {updated:,} rows):")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]:,}")

conn.close()
print("\nDone!")
