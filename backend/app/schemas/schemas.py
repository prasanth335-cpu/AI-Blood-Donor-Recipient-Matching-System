from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "engineer"  # "admin" or "engineer"

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str

class TokenData(BaseModel):
    email: Optional[str] = None


# --- Department Schemas ---
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Machine Schemas ---
class MachineBase(BaseModel):
    name: str
    department_id: int
    factory_location: str
    manufacturer: str
    installation_date: datetime
    status: str = "operational"  # "operational", "maintenance_required", "offline"
    operating_hours: float = 0.0

class MachineCreate(MachineBase):
    pass

class MachineUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    factory_location: Optional[str] = None
    manufacturer: Optional[str] = None
    installation_date: Optional[datetime] = None
    status: Optional[str] = None
    operating_hours: Optional[float] = None

class MachineOut(MachineBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- SensorData Schemas ---
class SensorDataBase(BaseModel):
    temperature: float
    vibration: float
    pressure: float
    voltage: float
    current: float
    rpm: float
    humidity: float

class SensorDataCreate(SensorDataBase):
    machine_id: str
    timestamp: Optional[datetime] = None

class SensorDataOut(SensorDataBase):
    id: int
    machine_id: str
    timestamp: datetime

    class Config:
        from_attributes = True


# --- Prediction Schemas ---
class PredictionBase(BaseModel):
    health_score: float
    failure_probability: float
    remaining_useful_life: float
    recommendation: str
    model_used: str

class PredictionCreate(PredictionBase):
    machine_id: str

class PredictionOut(PredictionBase):
    id: str
    machine_id: str
    timestamp: datetime

    class Config:
        from_attributes = True


# --- Alert Schemas ---
class AlertBase(BaseModel):
    type: str  # "Critical" or "Warning"
    message: str
    status: str = "active"  # "active" or "resolved"

class AlertCreate(AlertBase):
    machine_id: str

class AlertOut(AlertBase):
    id: str
    machine_id: str
    timestamp: datetime
    machine_name: Optional[str] = None  # Helper for listing

    class Config:
        from_attributes = True


# --- MaintenanceLog Schemas ---
class MaintenanceLogBase(BaseModel):
    description: str
    action_taken: str
    cost: float = 0.0
    service_date: Optional[datetime] = None

class MaintenanceLogCreate(MaintenanceLogBase):
    machine_id: str

class MaintenanceLogOut(MaintenanceLogBase):
    id: str
    machine_id: str
    performed_by: str
    performer_name: Optional[str] = None
    machine_name: Optional[str] = None
    service_date: datetime

    class Config:
        from_attributes = True


# --- Report Schemas ---
class ReportBase(BaseModel):
    name: str
    report_type: str

class ReportOut(ReportBase):
    id: str
    file_path: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Extended & Nested Schemas ---
class MachineDetailsOut(MachineOut):
    department: DepartmentOut
    recent_predictions: List[PredictionOut] = []
    recent_alerts: List[AlertOut] = []
    recent_logs: List[MaintenanceLogOut] = []

    class Config:
        from_attributes = True


# --- Dashboard Stats Schemas ---
class DashboardOverview(BaseModel):
    total_machines: int
    operational_machines: int
    warning_machines: int
    critical_machines: int
    active_alerts_count: int
    avg_health_score: float
    critical_alerts: List[AlertOut]
    recent_activity: List[dict]  # Custom list of recent logs/alerts
