import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="engineer")  # "admin" or "engineer"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    maintenance_logs = relationship("MaintenanceLog", back_populates="performer")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    machines = relationship("Machine", back_populates="department")


class Machine(Base):
    __tablename__ = "machines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    factory_location = Column(String(255), nullable=False)
    manufacturer = Column(String(100), nullable=False)
    installation_date = Column(DateTime, nullable=False)
    status = Column(String(50), nullable=False, default="operational")  # "operational", "maintenance_required", "offline"
    operating_hours = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="machines")
    sensor_data = relationship("SensorData", back_populates="machine", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="machine", cascade="all, delete-orphan")
    maintenance_logs = relationship("MaintenanceLog", back_populates="machine", cascade="all, delete-orphan")


class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(36), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    temperature = Column(Float, nullable=False)
    vibration = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    voltage = Column(Float, nullable=False)
    current = Column(Float, nullable=False)
    rpm = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    machine = relationship("Machine", back_populates="sensor_data")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    health_score = Column(Float, nullable=False)  # 0 to 100
    failure_probability = Column(Float, nullable=False)  # 0.0 to 1.0 (or %)
    remaining_useful_life = Column(Float, nullable=False)  # hours
    recommendation = Column(String(500), nullable=False)
    model_used = Column(String(50), nullable=False)  # "RandomForest" or "XGBoost"
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    machine = relationship("Machine", back_populates="predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # "Critical" or "Warning"
    message = Column(String(500), nullable=False)
    status = Column(String(50), nullable=False, default="active")  # "active" or "resolved"
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    machine = relationship("Machine", back_populates="alerts")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(36), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    performed_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    description = Column(String(500), nullable=False)
    action_taken = Column(String(500), nullable=False)
    service_date = Column(DateTime, default=datetime.utcnow)
    cost = Column(Float, nullable=False, default=0.0)

    # Relationships
    machine = relationship("Machine", back_populates="maintenance_logs")
    performer = relationship("User", back_populates="maintenance_logs")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    report_type = Column(String(100), nullable=False)  # "health", "maintenance", "prediction"
    file_path = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
