from typing import Dict, Any

class RecommendationEngine:
    @staticmethod
    def generate_recommendation(
        failure_prob: float, 
        health_score: float, 
        sensor_data: Dict[str, float], 
        operating_hours: float
    ) -> str:
        """
        Generates intelligent, actionable maintenance recommendations 
        based on sensor metrics, health scores, and failure probability.
        """
        # Failure probability is on a 0.0 to 1.0 scale
        prob_pct = failure_prob * 100 if failure_prob <= 1.0 else failure_prob
        
        # 1. Critical Actions (Immediate Shutdown or critical repairs)
        if prob_pct >= 80.0 or health_score < 50.0:
            if sensor_data.get("temperature", 0) > 85.0:
                return "Immediate Shutdown: Critical Overheating. Check cooling loop, verify coolant level, and inspect thermal radiators."
            elif sensor_data.get("vibration", 0) > 8.0:
                return "Immediate Shutdown: Severe Mechanical Vibration. Stop machine immediately to prevent damage. Inspect main bearings, shaft alignment, and stator assembly."
            elif sensor_data.get("pressure", 0) > 6.0:
                return "Immediate Shutdown: Critical Pressure Buildup. Check pressure relief valves, hydraulic lines, and fluid seal integrity."
            elif sensor_data.get("current", 0) > 15.0 or sensor_data.get("voltage", 0) < 180.0:
                return "Immediate Shutdown: Electrical Anomaly. High current draw or severe voltage drop. Inspect motor windings, fuses, and power supply links."
            else:
                return "Immediate Shutdown: High failure risk detected. Perform a comprehensive structural and functional diagnostic inspection."

        # 2. Warning Actions (Preventative checks)
        if prob_pct >= 40.0 or health_score < 75.0:
            recs = []
            if sensor_data.get("temperature", 0) > 75.0:
                recs.append("Clean cooling ducts and inspect ventilation fans.")
            if sensor_data.get("vibration", 0) > 5.0:
                recs.append("Lubricate motor and drive-shaft bearings.")
            if sensor_data.get("pressure", 0) > 4.5:
                recs.append("Replace pressure and air filters.")
            if sensor_data.get("voltage", 0) < 200.0 or sensor_data.get("voltage", 0) > 240.0:
                recs.append("Inspect power conditioner and voltage regulators.")
            if sensor_data.get("current", 0) > 11.0:
                recs.append("Check electrical grounding and load balancing.")
            
            if recs:
                return "Warning Alert: " + " | ".join(recs)
            return "Warning: Degraded machine condition. Schedule inspection within the next 48 operating hours."

        # 3. Scheduled / Time-based Maintenance
        if operating_hours > 5000:
            return "Preventative Maintenance Due: Operating hours exceed 5,000. Replace drive belt, inspect couplers, and recalibrate sensors."
        elif operating_hours > 3000:
            return "Routine Service Advisory: Operating hours exceed 3,000. Schedule lubrication and check electrical termination contacts."

        # 4. Normal operation
        return "System Healthy: No active maintenance required. Continue standard operational schedule."
