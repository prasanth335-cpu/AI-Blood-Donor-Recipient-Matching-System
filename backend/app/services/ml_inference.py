import os
import logging
import numpy as np
import joblib
from sqlalchemy.orm import Session
from backend.app.models.models import Machine, SensorData, Prediction
from backend.app.services.recommendation import RecommendationEngine
from backend.app.services.alerts import AlertService

logger = logging.getLogger("ml_inference")

class MLInferenceService:
    _model = None
    _preprocessor = None
    _model_name = "SimulationEngine"

    @classmethod
    def load_model(cls):
        """
        Attempts to load the trained ML model and preprocessor scaling objects from the ml models folder.
        """
        # Look in backend local folder or ml folder
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        model_path = os.path.join(base_dir, "ml", "models", "best_model.joblib")
        preprocessor_path = os.path.join(base_dir, "ml", "models", "preprocessor.joblib")
        
        # Also check alternative path inside app
        if not os.path.exists(model_path):
            model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_models", "best_model.joblib")
            preprocessor_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_models", "preprocessor.joblib")

        if os.path.exists(model_path) and os.path.exists(preprocessor_path):
            try:
                cls._model = joblib.load(model_path)
                cls._preprocessor = joblib.load(preprocessor_path)
                
                # Check model class name
                cls._model_name = type(cls._model).__name__
                logger.info(f"Loaded ML model: {cls._model_name} from {model_path}")
            except Exception as e:
                logger.error(f"Error loading ML model binaries, falling back to simulator: {str(e)}")
                cls._model = None
                cls._preprocessor = None
                cls._model_name = "SimulationEngine"
        else:
            logger.warning("ML model binaries not found. Using mathematical simulation engine.")
            cls._model = None
            cls._preprocessor = None
            cls._model_name = "SimulationEngine"

    @classmethod
    def predict(cls, db: Session, machine: Machine, sensor_record: SensorData) -> Prediction:
        """
        Runs machine learning predictions (or statistical simulation fallback) on current telemetry.
        Persists and returns a Prediction record.
        """
        # Ensure we try to reload model if not loaded yet
        if cls._model is None and cls._model_name == "SimulationEngine":
            cls.load_model()

        sensor_dict = {
            "temperature": sensor_record.temperature,
            "vibration": sensor_record.vibration,
            "pressure": sensor_record.pressure,
            "voltage": sensor_record.voltage,
            "current": sensor_record.current,
            "rpm": sensor_record.rpm,
            "humidity": sensor_record.humidity
        }

        if cls._model is not None and cls._preprocessor is not None:
            try:
                # Prepare features array matching ML pipeline structure
                # Features: [temperature, vibration, pressure, voltage, current, rpm, humidity, operating_hours]
                features = np.array([[
                    sensor_record.temperature,
                    sensor_record.vibration,
                    sensor_record.pressure,
                    sensor_record.voltage,
                    sensor_record.current,
                    sensor_record.rpm,
                    sensor_record.humidity,
                    machine.operating_hours
                ]])
                
                # Preprocess features (e.g. scale)
                processed_features = cls._preprocessor.transform(features)
                
                # Predict Failure Probability (classification output)
                # predict_proba returns [prob_class_0, prob_class_1]
                prob = float(cls._model.predict_proba(processed_features)[0][1])
                
                # Derive Health Score
                health = float(max(0.0, min(100.0, (1.0 - prob) * 100.0)))
                
                # Remaining Useful Life regression estimate
                # Fallback regression formula if no separate regression model is saved:
                base_rul = max(100.0, 10000.0 - machine.operating_hours)
                if prob > 0.5:
                    rul = float(base_rul * (1.0 - prob) * 0.3)
                else:
                    rul = float(base_rul * (1.1 - prob))
                rul = max(0.0, rul)
                
                model_used = cls._model_name
                
            except Exception as e:
                logger.error(f"Inference error: {str(e)}. Falling back to simulation.")
                prob, health, rul, model_used = cls._simulate_inference(sensor_dict, machine.operating_hours)
        else:
            prob, health, rul, model_used = cls._simulate_inference(sensor_dict, machine.operating_hours)

        # Generate intelligent recommendations
        recommendation = RecommendationEngine.generate_recommendation(
            failure_prob=prob, 
            health_score=health, 
            sensor_data=sensor_dict, 
            operating_hours=machine.operating_hours
        )

        # Create Prediction record
        prediction_record = Prediction(
            machine_id=machine.id,
            health_score=health,
            failure_probability=prob,
            remaining_useful_life=rul,
            recommendation=recommendation,
            model_used=model_used
        )
        
        db.add(prediction_record)
        db.commit()
        db.refresh(prediction_record)

        # Trigger Prediction-based Alert checks
        AlertService.evaluate_sensor_and_predictions(
            db=db,
            machine_id=machine.id,
            sensor_data=sensor_dict,
            health_score=health,
            failure_probability=prob
        )

        return prediction_record

    @staticmethod
    def _simulate_inference(sensor_data: dict, operating_hours: float) -> tuple[float, float, float, str]:
        """
        A highly realistic simulation backup that mimics model evaluations based on physical variables.
        """
        temp = sensor_data.get("temperature", 65.0)
        vib = sensor_data.get("vibration", 3.0)
        press = sensor_data.get("pressure", 3.0)
        curr = sensor_data.get("current", 8.0)
        
        # Calculate risk scores based on bounds
        risk = 0.02
        
        # Temperature risks
        if temp > 80.0:
            risk += 0.25 + (temp - 80.0) * 0.03
        if temp > 90.0:
            risk += 0.30
            
        # Vibration risks
        if vib > 6.0:
            risk += 0.20 + (vib - 6.0) * 0.05
        if vib > 9.0:
            risk += 0.30

        # Pressure risks
        if press > 5.0:
            risk += 0.15
        if press > 6.5:
            risk += 0.25

        # Electrical risks
        if curr > 12.0:
            risk += 0.20
            
        # Age-based degradation
        if operating_hours > 5000:
            risk += 0.10
        elif operating_hours > 8000:
            risk += 0.25

        # Boundary checks
        failure_prob = float(max(0.01, min(0.99, risk)))
        health_score = float(max(1.0, min(100.0, (1.0 - failure_prob) * 100.0)))
        
        # Calculate Remaining Useful Life (RUL)
        base_rul = max(20.0, 8000.0 - operating_hours)
        if failure_prob > 0.8:
            rul = float(base_rul * 0.02)
        elif failure_prob > 0.4:
            rul = float(base_rul * (1.0 - failure_prob) * 0.3)
        else:
            rul = float(base_rul * (1.0 - failure_prob))
        
        return failure_prob, health_score, max(0.0, rul), "SimulationEngine"
