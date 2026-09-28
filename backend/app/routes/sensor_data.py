import csv
import io
import random
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_engineer_role
from backend.app.models.models import SensorData, Machine
from backend.app.schemas.schemas import SensorDataCreate, SensorDataOut
from backend.app.services.alerts import AlertService

router = APIRouter(prefix="/sensor-data", tags=["Sensor Data"])

@router.get("", response_model=List[SensorDataOut])
def get_sensor_data(
    machine_id: Optional[str] = Query(None, description="Filter by machine ID"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Retrieves sensor data history, optionally filtered by machine ID.
    """
    query = db.query(SensorData)
    if machine_id:
        query = query.filter(SensorData.machine_id == machine_id)
    
    return query.order_by(SensorData.timestamp.desc()).limit(limit).all()

@router.post("", response_model=SensorDataOut, status_code=status.HTTP_201_CREATED)
def post_sensor_data(
    data_in: SensorDataCreate,
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Ingests a single sensor data point and executes threshold-based alert evaluation.
    """
    machine = db.query(Machine).filter(Machine.id == data_in.machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID {data_in.machine_id} not found."
        )

    # Ingest data
    timestamp = data_in.timestamp if data_in.timestamp else datetime.utcnow()
    
    sensor_record = SensorData(
        machine_id=data_in.machine_id,
        temperature=data_in.temperature,
        vibration=data_in.vibration,
        pressure=data_in.pressure,
        voltage=data_in.voltage,
        current=data_in.current,
        rpm=data_in.rpm,
        humidity=data_in.humidity,
        timestamp=timestamp
    )
    
    db.add(sensor_record)
    db.commit()
    db.refresh(sensor_record)
    
    # Update machine operating hours slightly (e.g., adding 0.1 hours for each reading interval)
    machine.operating_hours += 0.1
    db.commit()

    # Trigger threshold alert checks
    sensor_dict = {
        "temperature": data_in.temperature,
        "vibration": data_in.vibration,
        "pressure": data_in.pressure,
        "voltage": data_in.voltage,
        "current": data_in.current,
        "rpm": data_in.rpm,
        "humidity": data_in.humidity
    }
    AlertService.evaluate_sensor_and_predictions(db, data_in.machine_id, sensor_dict)

    return sensor_record

@router.post("/upload-csv", status_code=status.HTTP_201_CREATED)
async def upload_csv_telemetry(
    machine_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Bulk uploads telemetry log histories using a CSV file.
    Expects headers: temperature, vibration, pressure, voltage, current, rpm, humidity, [timestamp].
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID {machine_id} not found."
        )

    content = await file.read()
    file_io = io.StringIO(content.decode("utf-8"))
    reader = csv.DictReader(file_io)
    
    records = []
    row_count = 0
    
    for row in reader:
        try:
            ts_str = row.get("timestamp")
            ts = datetime.fromisoformat(ts_str) if ts_str else datetime.utcnow()
            
            record = SensorData(
                machine_id=machine_id,
                temperature=float(row["temperature"]),
                vibration=float(row["vibration"]),
                pressure=float(row["pressure"]),
                voltage=float(row["voltage"]),
                current=float(row["current"]),
                rpm=float(row["rpm"]),
                humidity=float(row["humidity"]),
                timestamp=ts
            )
            records.append(record)
            row_count += 1
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error parsing row {row_count + 1}: {str(e)}"
            )

    if records:
        db.add_all(records)
        # Update operating hours based on count
        machine.operating_hours += (row_count * 0.1)
        db.commit()

        # Run alert evaluations on the latest point uploaded
        latest = records[-1]
        sensor_dict = {
            "temperature": latest.temperature,
            "vibration": latest.vibration,
            "pressure": latest.pressure,
            "voltage": latest.voltage,
            "current": latest.current,
            "rpm": latest.rpm,
            "humidity": latest.humidity
        }
        AlertService.evaluate_sensor_and_predictions(db, machine_id, sensor_dict)

    return {"detail": f"Successfully ingested {row_count} telemetry records."}

@router.post("/simulate", response_model=SensorDataOut)
def simulate_telemetry(
    machine_id: str,
    induce_anomaly: Optional[str] = Query(None, description="Induce anomaly: 'temperature', 'vibration', 'pressure', 'electrical'"),
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Generates a simulated sensor reading for a machine, optionally inducing a specific anomaly.
    Useful for demonstrating real-time alert updates and ML triggers in dashboards.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID {machine_id} not found."
        )

    # Baselines
    temp = random.normalvariate(65.0, 4.0)
    vib = random.normalvariate(3.0, 0.8)
    press = random.normalvariate(3.2, 0.5)
    volt = random.normalvariate(220.0, 5.0)
    curr = random.normalvariate(8.0, 1.2)
    rpm = random.normalvariate(1800.0, 100.0)
    humidity = random.normalvariate(45.0, 5.0)

    # Induce specific anomalies
    if induce_anomaly == "temperature":
        temp = random.uniform(92.0, 105.0)
    elif induce_anomaly == "vibration":
        vib = random.uniform(9.5, 12.0)
    elif induce_anomaly == "pressure":
        press = random.uniform(6.8, 8.0)
    elif induce_anomaly == "electrical":
        curr = random.uniform(16.0, 22.0)
        volt = random.uniform(170.0, 185.0)

    # Bound percentages
    humidity = max(0.0, min(100.0, humidity))

    sensor_record = SensorData(
        machine_id=machine_id,
        temperature=temp,
        vibration=vib,
        pressure=press,
        voltage=volt,
        current=curr,
        rpm=rpm,
        humidity=humidity,
        timestamp=datetime.utcnow()
    )
    
    db.add(sensor_record)
    # Increment operating hours
    machine.operating_hours += 0.1
    db.commit()
    db.refresh(sensor_record)

    # Run Alert Check
    sensor_dict = {
        "temperature": temp,
        "vibration": vib,
        "pressure": press,
        "voltage": volt,
        "current": curr,
        "rpm": rpm,
        "humidity": humidity
    }
    AlertService.evaluate_sensor_and_predictions(db, machine_id, sensor_dict)

    return sensor_record
