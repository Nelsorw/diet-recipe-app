# Diet & Recipe Recommendation System — Flask Backend

## Project Structure
```
flask_backend/
├── run.py                        # Entry point
├── app.py                        # App factory
├── requirements.txt
├── .env                          # Environment variables
├── data/
│   └── diet_and_Recipes.csv      # Recipe dataset
├── models/
│   ├── models.py                 # SQLAlchemy database models
│   └── ml/                       # Trained ML artifacts
│       ├── suitability_lgbm_model.pkl
│       ├── label_encoder_health_condition.pkl
│       ├── label_encoder_dietary_restrictions.pkl
│       ├── label_encoder_dietary_attributes.pkl
│       ├── label_encoder_meal_type.pkl
│       └── feature_cols.json
├── routes/
│   ├── auth.py                   # Register, Login, Logout
│   ├── profile.py                # User profile CRUD
│   ├── recommendations.py        # ML-based recipe recommendations
│   ├── mealplan.py               # Daily & weekly meal plans
│   ├── logging.py                # Meal logging
│   └── progress.py              # Nutrition progress tracking
└── utils/
    ├── nutrition.py              # BMR/TDEE calculator + tips
    ├── recommender.py            # ML model inference
    └── recipes.py                # Recipe dataset loader

```

## Setup
```bash
pip install -r requirements.txt
```

## Place your files
- Copy `diet_and_Recipes.csv` into the `data/` folder
- Copy all `.pkl` and `.json` model files into `models/ml/` folder

## Run
```bash
python run.py
```

## API Endpoints

| Method | Endpoint               | Description                        | Auth |
|--------|------------------------|------------------------------------|------|
| POST   | /auth/register         | Create account                     | No   |
| POST   | /auth/login            | Login and get JWT token            | No   |
| POST   | /auth/logout           | Logout                             | Yes  |
| GET    | /profile               | Get profile + daily targets        | Yes  |
| POST   | /profile               | Create profile                     | Yes  |
| PUT    | /profile               | Update profile                     | Yes  |
| GET    | /recommendations       | Get recipe recommendations         | Yes  |
| GET    | /recommendations?meal_type=breakfast | Filter by meal type  | Yes  |
| POST   | /mealplan/generate     | Generate today's meal plan         | Yes  |
| GET    | /mealplan/daily        | Get daily meal plan                | Yes  |
| GET    | /mealplan/weekly       | Get 7-day meal plan                | Yes  |
| POST   | /log                   | Log a meal eaten                   | Yes  |
| GET    | /log/today             | Get today's logs + nutrition totals| Yes  |
| DELETE | /log/<id>              | Delete a meal log                  | Yes  |
| GET    | /progress              | Today's progress + tips            | Yes  |
| GET    | /progress/weekly       | 7-day nutrition summary            | Yes  |

## Authentication
All protected endpoints require:
```
Authorization: Bearer <token>
```

## Activity Levels
- `low` — sedentary
- `moderate` — light exercise
- `high` — intense exercise

## Health Goals
- `weight_loss` — TDEE minus 500 calories
- `weight_gain` — TDEE plus 500 calories
- `healthy_living` — TDEE unchanged
