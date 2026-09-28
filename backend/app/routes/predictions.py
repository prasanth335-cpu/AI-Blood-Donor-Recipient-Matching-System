from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_engineer_role
from backend.app.models.models import Machine, SensorData, Prediction
from backend.app.schemas.schemas import PredictionOut
from backend.app.services.ml_inference import MLInferenceService

router = APIRouter(prefix="/predictions", tags=["Predictions"])

@router.get("", response_model=List[PredictionOut])
def list_predictions(
    machine_id: Optional[str] = Query(None, description="Filter by machine ID"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Retrieves the system's prediction log history.
    """
    query = db.query(Prediction)
    if machine_id:
        query = query.filter(Prediction.machine_id == machine_id)
        
    return query.order_by(Prediction.timestamp.desc()).limit(limit).all()

@router.post("/predict/{machine_id}", response_model=PredictionOut)
def run_prediction(
    machine_id: str,
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Runs an on-demand ML evaluation based on the latest available telemetry.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID {machine_id} not found."
        )

    # Get latest sensor data point
    latest_sensor = db.query(SensorData).filter(SensorData.machine_id == machine_id).order_by(SensorData.timestamp.desc()).first()
    if not latest_sensor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No telemetry data found for machine '{machine.name}'. Please simulate telemetry or upload CSV records first."
        )

    # Perform inference (saves Prediction to DB internally and updates machine status if needed)
    prediction = MLInferenceService.predict(db=db, machine=machine, sensor_record=latest_sensor)
    return prediction
