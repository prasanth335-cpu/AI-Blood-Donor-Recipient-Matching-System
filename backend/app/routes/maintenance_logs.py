from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_engineer_role, get_current_user
from backend.app.models.models import MaintenanceLog, Machine, User
from backend.app.schemas.schemas import MaintenanceLogCreate, MaintenanceLogOut

router = APIRouter(prefix="/maintenance-logs", tags=["Maintenance Logs"])

@router.get("", response_model=List[MaintenanceLogOut])
def list_logs(
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Lists all maintenance service logs in the system.
    """
    logs = db.query(MaintenanceLog).order_by(MaintenanceLog.service_date.desc()).all()
    for log in logs:
        log.performer_name = log.performer.full_name if log.performer else "Unknown Performer"
        log.machine_name = log.machine.name if log.machine else "Unknown Machine"
    return logs

@router.post("", response_model=MaintenanceLogOut, status_code=status.HTTP_201_CREATED)
def create_log(
    log_in: MaintenanceLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Records a new maintenance event for a machine.
    """
    machine = db.query(Machine).filter(Machine.id == log_in.machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID {log_in.machine_id} not found."
        )

    log = MaintenanceLog(
        machine_id=log_in.machine_id,
        performed_by=current_user.id,
        description=log_in.description,
        action_taken=log_in.action_taken,
        cost=log_in.cost,
        service_date=log_in.service_date if log_in.service_date else datetime.utcnow()
    )
    
    # After a successful maintenance event, reset the machine status back to operational
    machine.status = "operational"
    
    db.add(log)
    db.commit()
    db.refresh(log)
    
    log.performer_name = current_user.full_name
    log.machine_name = machine.name
    return log
