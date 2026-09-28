from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.models import Alert, Machine

class AlertService:
    @staticmethod
    def evaluate_sensor_and_predictions(
        db: Session, 
        machine_id: str, 
        sensor_data: dict, 
        health_score: float = None, 
        failure_probability: float = None
    ) -> list[Alert]:
        """
        Evaluates incoming telemetry and prediction metrics against thresholds,
        creating alerts in the database and updating the machine's state if necessary.
        """
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if not machine:
            return []

        alerts_created = []
        
        # 1. Temperature Threshold Checks
        temp = sensor_data.get("temperature", 0.0)
        if temp >= 90.0:
            alerts_created.append(Alert(
                machine_id=machine_id,
                type="Critical",
                message=f"Critical Overheating: Temperature is {temp:.1f}°C (Threshold: 90.0°C)"
            ))
        elif temp >= 80.0:
            alerts_created.append(Alert(
                machine_id=machine_id,
                type="Warning",
                message=f"High Temperature: Temperature is {temp:.1f}°C (Threshold: 80.0°C)"
            ))

        # 2. Vibration Threshold Checks
        vib = sensor_data.get("vibration", 0.0)
        if vib >= 9.0:
            alerts_created.append(Alert(
                machine_id=machine_id,
                type="Critical",
                message=f"Critical Mechanical Vibration: Vibration is {vib:.1f} mm/s (Threshold: 9.0 mm/s)"
            ))
        elif vib >= 6.0:
            alerts_created.append(Alert(
                machine_id=machine_id,
                type="Warning",
                message=f"Elevated Vibration: Vibration is {vib:.1f} mm/s (Threshold: 6.0 mm/s)"
            ))

        # 3. Pressure Checks
        press = sensor_data.get("pressure", 0.0)
        if press >= 6.5:
            alerts_created.append(Alert(
                machine_id=machine_id,
                type="Critical",
                message=f"Critical High Pressure: Pressure is {press:.1f} bar (Threshold: 6.5 bar)"
            ))
        elif press >= 5.0:
            alerts_created.append(Alert(
                machine_id=machine_id,
                type="Warning",
                message=f"Elevated Pressure: Pressure is {press:.1f} bar (Threshold: 5.0 bar)"
            ))

        # 4. Predictions-based Checks
        if health_score is not None and health_score < 50.0:
            alerts_created.append(Alert(
                machine_id=machine_id,
                type="Critical",
                message=f"Critical Health Score: System Health has degraded to {health_score:.1f}%"
            ))
        
        if failure_probability is not None:
            prob_pct = failure_probability * 100 if failure_probability <= 1.0 else failure_probability
            if prob_pct >= 80.0:
                alerts_created.append(Alert(
                    machine_id=machine_id,
                    type="Critical",
                    message=f"Critical Failure Risk: Machine failure probability is {prob_pct:.1f}%"
                ))

        # Insert alerts and update machine status based on critical levels
        has_critical = any(a.type == "Critical" for a in alerts_created)
        has_warning = any(a.type == "Warning" for a in alerts_created)
        
        if has_critical:
            machine.status = "offline"
        elif has_warning and machine.status == "operational":
            machine.status = "maintenance_required"
        elif not alerts_created and machine.status != "operational":
            # If no alerts and not operational, only reset if no other active critical alerts exist
            active_critical = db.query(Alert).filter(
                Alert.machine_id == machine_id, 
                Alert.type == "Critical", 
                Alert.status == "active"
            ).count()
            if active_critical == 0:
                machine.status = "operational"

        # Persist and refresh
        for alert in alerts_created:
            db.add(alert)
        
        if alerts_created:
            db.commit()
            for alert in alerts_created:
                db.refresh(alert)
                
        return alerts_created
