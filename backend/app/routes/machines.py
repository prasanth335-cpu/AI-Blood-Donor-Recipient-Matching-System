from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_admin_role, check_engineer_role
from backend.app.models.models import Machine, Department, Alert, Prediction, MaintenanceLog
from backend.app.schemas.schemas import MachineCreate, MachineUpdate, MachineOut, MachineDetailsOut

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("", response_model=List[MachineOut])
def list_machines(
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    status: Optional[str] = Query(None, description="Filter by machine status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Lists all machines with optional filtering and pagination.
    """
    query = db.query(Machine)
    if department_id is not None:
        query = query.filter(Machine.department_id == department_id)
    if status is not None:
        query = query.filter(Machine.status == status)
    
    return query.offset(skip).limit(limit).all()

@router.post("", response_model=MachineOut, status_code=status.HTTP_201_CREATED)
def create_machine(
    machine_in: MachineCreate,
    db: Session = Depends(get_db),
    _user = Depends(check_admin_role)
):
    """
    Creates a new machine. Admin privileges required.
    """
    dept = db.query(Department).filter(Department.id == machine_in.department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {machine_in.department_id} does not exist."
        )
    
    machine = Machine(**machine_in.model_dump())
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine

@router.get("/{id}", response_model=MachineDetailsOut)
def get_machine_details(
    id: str,
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Returns complete details of a machine including nested telemetry, prediction history, and recent alerts.
    """
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID {id} not found."
        )
    
    # Fetch recent predictions, alerts, and logs (sorted)
    recent_preds = db.query(Prediction).filter(Prediction.machine_id == id).order_by(Prediction.timestamp.desc()).limit(10).all()
    recent_alerts = db.query(Alert).filter(Alert.machine_id == id).order_by(Alert.timestamp.desc()).limit(10).all()
    recent_logs = db.query(MaintenanceLog).filter(MaintenanceLog.machine_id == id).order_by(MaintenanceLog.service_date.desc()).limit(10).all()
    
    # Custom mapping to fill names inside relations if needed
    for alert in recent_alerts:
        alert.machine_name = machine.name
    for log in recent_logs:
        log.performer_name = log.performer.full_name if log.performer else "Unknown"

    machine.recent_predictions = recent_preds
    machine.recent_alerts = recent_alerts
    machine.recent_logs = recent_logs
    
    return machine

@router.put("/{id}", response_model=MachineOut)
def update_machine(
    id: str,
    machine_in: MachineUpdate,
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Updates details of an existing machine.
    """
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID {id} not found."
        )
    
    update_data = machine_in.model_dump(exclude_unset=True)
    if "department_id" in update_data:
        dept = db.query(Department).filter(Department.id == update_data["department_id"]).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {update_data['department_id']} does not exist."
            )
            
    for field, value in update_data.items():
        setattr(machine, field, value)
        
    db.commit()
    db.refresh(machine)
    return machine

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_machine(
    id: str,
    db: Session = Depends(get_db),
    _user = Depends(check_admin_role)
):
    """
    Deletes a machine. Admin privileges required.
    """
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_44_NOT_FOUND,
            detail=f"Machine with ID {id} not found."
        )
    
    db.delete(machine)
    db.commit()
    return
