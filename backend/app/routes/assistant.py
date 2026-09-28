from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_engineer_role
from backend.app.models.models import Machine, Alert, MaintenanceLog

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])

class ChatRequest(BaseModel):
    message: str
    machine_id: Optional[str] = None

@router.post("/chat")
def chat_assistant(
    request: ChatRequest,
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Intelligent chatbot that acts as an industrial maintenance expert.
    Contextualizes responses based on the active machine's parameters and alert logs.
    """
    msg = request.message.lower()
    reply = ""

    # 1. Gather Context if a specific machine is mentioned or passed
    machine = None
    if request.machine_id:
        machine = db.query(Machine).filter(Machine.id == request.machine_id).first()
    else:
        # Try to extract machine name from string
        machines = db.query(Machine).all()
        for m in machines:
            if m.name.lower() in msg:
                machine = m
                break

    # 2. Expert diagnostic responder
    if machine:
        latest_alert = db.query(Alert).filter(
            Alert.machine_id == machine.id,
            Alert.status == "active"
        ).order_by(Alert.timestamp.desc()).first()
        
        last_service = db.query(MaintenanceLog).filter(
            MaintenanceLog.machine_id == machine.id
        ).order_by(MaintenanceLog.service_date.desc()).first()

        # Build custom diagnostics depending on status
        status_info = f"Machine: **{machine.name}**\nDepartment: {machine.department.name if machine.department else 'Unknown'}\nLocation: {machine.factory_location}\nStatus: **{machine.status.upper()}**\nOperating Hours: {machine.operating_hours:.1f} hrs."
        
        if "fix" in msg or "repair" in msg or "troubleshoot" in msg or "help" in msg or "recommend" in msg:
            if machine.status == "offline" or (latest_alert and latest_alert.type == "Critical"):
                alert_msg = latest_alert.message if latest_alert else "high failure probability"
                reply = (
                    f"### AI Maintenance Assistant - Diagnostics for {machine.name}\n\n"
                    f"{status_info}\n\n"
                    f"⚠️ **Active Critical Issue**: `{alert_msg}`\n\n"
                    f"Here is your step-by-step diagnostic playbook:\n"
                    f"1. **Isolate Power**: Lock out and tag out (LOTO) power connections for security.\n"
                )
                
                if "temp" in alert_msg.lower() or "overheat" in alert_msg.lower():
                    reply += (
                        f"2. **Check Cooling radiator**: Verify the radiator fan is functional and check for blocked airways.\n"
                        f"3. **Coolant Level**: Check the hydraulic and spindle fluid levels. Replenish if low.\n"
                        f"4. **Bearing Inspection**: Check if bearings are dry or showing mechanical wear. Lubrication may be required."
                    )
                elif "vibrat" in alert_msg.lower() or "mechanical" in alert_msg.lower():
                    reply += (
                        f"2. **Check Alignments**: Verify structural alignments of the shaft and coupler using a dial indicator.\n"
                        f"3. **Torque Bolts**: Check foundation mounting bolts. Loose anchorings often induce high vibration harmonics.\n"
                        f"4. **Bearing Wear**: Run ultrasonic checks on bearings for signs of micro-spalling or raceway fatigue."
                    )
                elif "press" in alert_msg.lower():
                    reply += (
                        f"2. **Relief Valves**: Check the pressure relief bypass valve settings.\n"
                        f"3. **Filter Check**: Replace inline fluid/air filters which might be clogged and causing back-pressure.\n"
                        f"4. **Check Hydraulic Seals**: Visually inspect connections for structural leaks or air intrusion."
                    )
                else:
                    reply += (
                        f"2. **Inspect Electrical Contacts**: Check terminal strips for heat discoloration or loose wires.\n"
                        f"3. **Verify Operating Conditions**: Run calibration cycles and ensure metrics align with baseline specifications."
                    )
                    
            elif machine.status == "maintenance_required":
                reply = (
                    f"### AI Maintenance Assistant - Diagnostics for {machine.name}\n\n"
                    f"{status_info}\n\n"
                    f"🔧 **Status: Maintenance Required** (Elevated warnings).\n\n"
                    f"**Suggested Preventive Inspections**:\n"
                    f"- Lubricate motor spindle bearings.\n"
                    f"- Inspect driving belts for cracks and wear.\n"
                    f"- Clear dust and debris from cooling radiator slots.\n"
                    f"- Ensure electrical voltage supply is clean and stable."
                )
            else:
                reply = (
                    f"### AI Maintenance Assistant - Status of {machine.name}\n\n"
                    f"{status_info}\n\n"
                    f"✅ **Status: Healthy**. The machine is running within optimal bounds.\n"
                    f"No active warnings. Next routine maintenance is estimated in **{max(10.0, 1000.0 - (machine.operating_hours % 1000.0)):.1f} operating hours**."
                )
        else:
            # General info about the machine
            reply = (
                f"### AI Maintenance Assistant - Status of {machine.name}\n\n"
                f"{status_info}\n\n"
                f"How can I help you today? You can ask me to **'fix {machine.name}'** to see custom diagnostic workflows, or ask about its alerts history."
            )
            if last_service:
                reply += f"\n\n*Last serviced on: {last_service.service_date.strftime('%Y-%m-%d')} (Action: {last_service.action_taken})*"

    # 3. Fallbacks if no specific machine context matches
    if not reply:
        if "hello" in msg or "hi" in msg:
            reply = (
                "### AI Maintenance Assistant\n\n"
                "Hello! I am your AI-powered Industrial Maintenance Assistant.\n\n"
                "I can help you:\n"
                "- Troubleshoot specific machines (e.g. ask **'How do I fix CNC Milling Center A?'**)\n"
                "- Get maintenance checklists based on sensor anomalies.\n"
                "- Explain warning levels and what critical tolerances mean.\n\n"
                "Tell me which machine or anomaly you are working on!"
            )
        elif "status" in msg or "summary" in msg or "report" in msg:
            # Query machine counts
            total = db.query(Machine).count()
            offline = db.query(Machine).filter(Machine.status == "offline").count()
            warn = db.query(Machine).filter(Machine.status == "maintenance_required").count()
            reply = (
                f"### AI Maintenance Assistant - Factory Summary\n\n"
                f"Currently monitoring **{total}** machines across the facility.\n"
                f"- 🔴 **Critical/Offline**: {offline} machines\n"
                f"- 🟡 **Warning/Maintenance**: {warn} machines\n"
                f"- 🟢 **Healthy/Operational**: {total - offline - warn} machines\n\n"
                f"To diagnose an offline machine, type its name or ask me how to troubleshoot it."
            )
        else:
            reply = (
                "### AI Maintenance Assistant\n\n"
                "I didn't quite catch that. You can ask me questions like:\n"
                "- *'How do I fix the CNC machine?'*\n"
                "- *'What should I check for high vibration alerts?'*\n"
                "- *'Give me a status summary of the factory.'*\n\n"
                "I stand ready to assist your maintenance team."
            )

    return {"response": reply}
