from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_engineer_role
from backend.app.models.models import Alert, Machine
from backend.app.schemas.schemas import AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertOut])
def list_alerts(
    machine_id: Optional[str] = Query(None, description="Filter by machine ID"),
    status: Optional[str] = Query(None, description="Filter by status: active, resolved"),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Lists system alert logs. Support filtering by machine and state.
    """
    query = db.query(Alert)
    if machine_id:
        query = query.filter(Alert.machine_id == machine_id)
    if status:
        query = query.filter(Alert.status == status)
        
    alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()
    
    # Fill in machine names in response
    for alert in alerts:
        alert.machine_name = alert.machine.name if alert.machine else "Unknown Machine"
        
    return alerts

@router.put("/{id}/resolve", response_model=AlertOut)
def resolve_alert(
    id: str,
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Marks an active alert as resolved. Recalculates machine status.
    """
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {id} not found."
        )
        
    alert.status = "resolved"
    db.commit()
    
    # Trigger machine status check
    machine = alert.machine
    if machine:
        # Check if there are other active critical alerts
        active_critical = db.query(Alert).filter(
            Alert.machine_id == machine.id,
            Alert.type == "Critical",
            Alert.status == "active"
        ).count()
        
        active_warnings = db.query(Alert).filter(
            Alert.machine_id == machine.id,
            Alert.type == "Warning",
            Alert.status == "active"
        ).count()
        
        if active_critical == 0:
            if active_warnings > 0:
                machine.status = "maintenance_required"
            else:
                machine.status = "operational"
        db.commit()
        db.refresh(machine)
        
    db.refresh(alert)
    alert.machine_name = machine.name if machine else "Unknown Machine"
    return alert
