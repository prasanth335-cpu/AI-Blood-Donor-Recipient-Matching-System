from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_engineer_role
from backend.app.models.models import Machine, Alert, Prediction, SensorData, Department, MaintenanceLog

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Returns general KPIs for dashboard cards.
    """
    total_machines = db.query(Machine).count()
    operational_machines = db.query(Machine).filter(Machine.status == "operational").count()
    warning_machines = db.query(Machine).filter(Machine.status == "maintenance_required").count()
    critical_machines = db.query(Machine).filter(Machine.status == "offline").count()
    
    active_alerts_count = db.query(Alert).filter(Alert.status == "active").count()
    
    # Calculate average health score from the latest predictions of all machines
    subquery = db.query(
        Prediction.machine_id,
        func.max(Prediction.timestamp).label("max_ts")
    ).group_by(Prediction.machine_id).subquery()
    
    latest_preds = db.query(Prediction).join(
        subquery,
        (Prediction.machine_id == subquery.c.machine_id) & 
        (Prediction.timestamp == subquery.c.max_ts)
    ).all()
    
    avg_health = sum(p.health_score for p in latest_preds) / len(latest_preds) if latest_preds else 100.0

    # Get recent active critical alerts
    critical_alerts = db.query(Alert).filter(
        Alert.status == "active",
        Alert.type == "Critical"
    ).order_by(Alert.timestamp.desc()).limit(5).all()
    
    for alert in critical_alerts:
        alert.machine_name = alert.machine.name if alert.machine else "Unknown"

    # Compile recent activity feed (combining alerts and maintenance logs)
    activities = []
    
    recent_alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(5).all()
    for ra in recent_alerts:
        activities.append({
            "type": "alert",
            "message": f"Alert generated for {ra.machine.name if ra.machine else 'Machine'}: {ra.message}",
            "severity": ra.type,
            "timestamp": ra.timestamp.isoformat()
        })
        
    recent_logs = db.query(MaintenanceLog).order_by(MaintenanceLog.service_date.desc()).limit(5).all()
    for rl in recent_logs:
        activities.append({
            "type": "maintenance",
            "message": f"Service logged for {rl.machine.name if rl.machine else 'Machine'}: {rl.action_taken}",
            "severity": "Info",
            "timestamp": rl.service_date.isoformat()
        })
        
    activities = sorted(activities, key=lambda x: x["timestamp"], reverse=True)[:8]

    return {
        "total_machines": total_machines,
        "operational_machines": operational_machines,
        "warning_machines": warning_machines,
        "critical_machines": critical_machines,
        "active_alerts_count": active_alerts_count,
        "avg_health_score": round(avg_health, 1),
        "critical_alerts": critical_alerts,
        "recent_activity": activities
    }

@router.get("/analytics")
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Returns time-series and aggregate analysis data for charts.
    """
    # 1. Health Trend (last 7 days aggregate)
    health_trends = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        next_day = day + timedelta(days=1)
        
        # Average prediction health score on this day
        avg_h = db.query(func.avg(Prediction.health_score)).filter(
            Prediction.timestamp >= datetime.combine(day, datetime.min.time()),
            Prediction.timestamp < datetime.combine(next_day, datetime.min.time())
        ).scalar()
        
        health_trends.append({
            "date": day.strftime("%b %d"),
            "health": round(avg_h, 1) if avg_h is not None else 100.0
        })

    # 2. Temperature Trend (last 7 days aggregate)
    temp_trends = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        next_day = day + timedelta(days=1)
        
        avg_t = db.query(func.avg(SensorData.temperature)).filter(
            SensorData.timestamp >= datetime.combine(day, datetime.min.time()),
            SensorData.timestamp < datetime.combine(next_day, datetime.min.time())
        ).scalar()
        
        temp_trends.append({
            "date": day.strftime("%b %d"),
            "temperature": round(avg_t, 1) if avg_t is not None else 65.0
        })

    # 3. Department Performance Comparison
    departments = db.query(Department).all()
    dept_comparison = []
    for dept in departments:
        # Get machines in department
        m_ids = [m.id for m in dept.machines]
        if not m_ids:
            dept_comparison.append({
                "department": dept.name,
                "avg_health": 100.0,
                "machine_count": 0
            })
            continue
            
        # Get latest predictions health score
        subquery = db.query(
            Prediction.machine_id,
            func.max(Prediction.timestamp).label("max_ts")
        ).filter(Prediction.machine_id.in_(m_ids)).group_by(Prediction.machine_id).subquery()
        
        avg_dept_health = db.query(func.avg(Prediction.health_score)).join(
            subquery,
            (Prediction.machine_id == subquery.c.machine_id) & 
            (Prediction.timestamp == subquery.c.max_ts)
        ).scalar()
        
        dept_comparison.append({
            "department": dept.name,
            "avg_health": round(avg_dept_health, 1) if avg_dept_health is not None else 100.0,
            "machine_count": len(m_ids)
        })

    # 4. Machine Comparison Table data
    machines = db.query(Machine).all()
    machine_list = []
    for m in machines:
        latest_pred = db.query(Prediction).filter(Prediction.machine_id == m.id).order_by(Prediction.timestamp.desc()).first()
        health = latest_pred.health_score if latest_pred else 100.0
        prob = latest_pred.failure_probability if latest_pred else 0.05
        
        latest_sensor = db.query(SensorData).filter(SensorData.machine_id == m.id).order_by(SensorData.timestamp.desc()).first()
        temp = latest_sensor.temperature if latest_sensor else 65.0
        vib = latest_sensor.vibration if latest_sensor else 3.0
        
        machine_list.append({
            "id": m.id,
            "name": m.name,
            "status": m.status,
            "health_score": round(health, 1),
            "failure_probability": round(prob * 100 if prob <= 1.0 else prob, 1),
            "temperature": round(temp, 1),
            "vibration": round(vib, 1),
            "operating_hours": round(m.operating_hours, 1)
        })

    return {
        "health_trends": health_trends,
        "temperature_trends": temp_trends,
        "department_comparison": dept_comparison,
        "machine_comparison": machine_list
    }
