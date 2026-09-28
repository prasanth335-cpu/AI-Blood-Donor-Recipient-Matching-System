import os
import shutil
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

# Try to import XGBoost, or provide warning / fallback if not installed
try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("WARNING: XGBoost package not found. Model training will rely solely on RandomForest.")

def train_pipeline() -> None:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "data", "predictive_maintenance.csv")

    # Generate dataset if it does not exist
    if not os.path.exists(data_path):
        print("Telemetry dataset not found. Invoking generator...")
        try:
            from ml.generate_data import generate_dataset
        except ModuleNotFoundError:
            import sys
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from ml.generate_data import generate_dataset
        generate_dataset()

    # Load dataset
    df = pd.read_csv(data_path)
    print(f"Loaded dataset: {df.shape[0]} samples, {df.shape[1]} columns.")

    # Separate features and labels
    feature_cols = [
        "temperature", "vibration", "pressure", "voltage", 
        "current", "rpm", "humidity", "operating_hours"
    ]
    
    X = df[feature_cols]
    y = df["failure"]

    # 1. Preprocessing Pipeline setup
    # Impute missing, followed by scaling
    preprocessor = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    # 2. Train-Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train set: {X_train.shape[0]} rows | Test set: {X_test.shape[0]} rows.")

    # Fit scaling transform on train data
    X_train_scaled = preprocessor.fit_transform(X_train)
    X_test_scaled = preprocessor.transform(X_test)

    # 3. Model Training & Evaluation
    models_to_evaluate = {}
    
    # RFC Setup
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    models_to_evaluate["RandomForest"] = rf_model

    # XGB Setup if available
    if XGBOOST_AVAILABLE:
        xgb_model = XGBClassifier(n_estimators=100, learning_rate=0.08, max_depth=5, random_state=42, n_jobs=-1)
        models_to_evaluate["XGBoost"] = xgb_model

    best_score = -1.0
    best_model_name = None
    best_model = None

    metrics_summary = {}

    for name, model in models_to_evaluate.items():
        print(f"\n--- Training {name} ---")
        model.fit(X_train_scaled, y_train)
        
        # Predict
        preds = model.predict(X_test_scaled)
        probs = model.predict_proba(X_test_scaled)[:, 1]
        
        # Metrics
        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds, zero_division=0)
        rec = recall_score(y_test, preds, zero_division=0)
        f1 = f1_score(y_test, preds, zero_division=0)
        auc = roc_auc_score(y_test, probs)
        cm = confusion_matrix(y_test, preds)

        print(f"Accuracy:  {acc*100:.2f}%")
        print(f"Precision: {prec*100:.2f}%")
        print(f"Recall:    {rec*100:.2f}%")
        print(f"F1 Score:  {f1*100:.2f}%")
        print(f"ROC-AUC:   {auc*100:.2f}%")
        print(f"Confusion Matrix:\n{cm}")

        metrics_summary[name] = {"f1": f1, "accuracy": acc, "model": model}

        # Compare model performance (Primary key: F1-score, secondary: Accuracy)
        if f1 > best_score:
            best_score = f1
            best_model_name = name
            best_model = model

    print(f"\nChampion Model Chosen: {best_model_name} (F1 Score: {best_score*100:.2f}%)")

    # 4. Save best model and preprocessor scaling pipelines
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    model_save_path = os.path.join(models_dir, "best_model.joblib")
    preprocessor_save_path = os.path.join(models_dir, "preprocessor.joblib")

    joblib.dump(best_model, model_save_path)
    joblib.dump(preprocessor, preprocessor_save_path)
    print(f"Champion model saved to {model_save_path}")
    print(f"Telemetry preprocessor saved to {preprocessor_save_path}")

    # 5. Auto-sync binary files to Backend app location
    backend_model_dir = os.path.join(os.path.dirname(base_dir), "backend", "app", "ml_models")
    os.makedirs(backend_model_dir, exist_ok=True)

    shutil.copy2(model_save_path, os.path.join(backend_model_dir, "best_model.joblib"))
    shutil.copy2(preprocessor_save_path, os.path.join(backend_model_dir, "preprocessor.joblib"))
    print(f"Successfully synced binary assets to backend models cache: {backend_model_dir}")

if __name__ == "__main__":
    train_pipeline()
