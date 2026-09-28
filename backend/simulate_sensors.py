import time
import random
import sys
import os
import requests

# Base URL for API requests
API_URL = os.getenv("API_URL", "http://localhost:8000/api")

def get_session_token():
    """
    Logs in as the default engineer to obtain a JWT token for the stream.
    """
    print(f"Logging in to AegisPredict API at {API_URL}...")
    try:
        res = requests.post(f"{API_URL}/auth/login-json", json={
            "email": "engineer@factory.com",
            "password": "EngineerPassword123!"
        })
        res.raise_for_status()
        return res.json()["access_token"]
    except Exception as e:
        print(f"ERROR: Authentication failed. Verify that the FastAPI backend server is running: {str(e)}")
        sys.exit(1)

def run_simulation_loop():
    token = get_session_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Fetch machines list
    print("Fetching active machines list...")
    try:
        res = requests.get(f"{API_URL}/machines", headers=headers)
        res.raise_for_status()
        machines = res.json()
    except Exception as e:
        print(f"ERROR: Failed to retrieve machines: {str(e)}")
        sys.exit(1)

    if not machines:
        print("ERROR: No machines registered in the database. Run backend seeding first.")
        sys.exit(1)

    print(f"Monitoring {len(machines)} machines. Beginning live telemetry stream (press Ctrl+C to terminate)...")
    
    anomalies = [None, "temperature", "vibration", "pressure", "electrical"]
    
    while True:
        try:
            # Pick a random machine
            mach = random.choice(machines)
            mach_id = mach["id"]
            mach_name = mach["name"]
            
            # 5% chance of inducing an anomaly to see dashboard alerts light up
            induce = None
            if random.random() < 0.08:
                induce = random.choice(anomalies[1:])
                print(f"\n[SIMULATOR] Inducing {induce.upper()} anomaly on {mach_name}...")

            # Trigger telemetry simulation endpoint
            sim_url = f"{API_URL}/sensor-data/simulate?machine_id={mach_id}"
            if induce:
                sim_url += f"&induce_anomaly={induce}"
                
            tel_res = requests.post(sim_url, headers=headers)
            tel_res.raise_for_status()
            tel_data = tel_res.json()
            
            # Immediately trigger ML evaluation
            pred_res = requests.post(f"{API_URL}/predictions/predict/{mach_id}", headers=headers)
            pred_res.raise_for_status()
            pred_data = pred_res.json()
            
            print(f"[{mach_name}] Logged -> Temp: {tel_data['temperature']:.1f}°C | Vib: {tel_data['vibration']:.1f} mm/s | ML Health: {pred_data['health_score']:.1f}% (Risk: {pred_data['failure_probability']*100:.1f}%)")
            
            # Sleep 3 seconds before next post
            time.sleep(3.0)
            
        except KeyboardInterrupt:
            print("\nLive sensor simulation terminated by operator.")
            break
        except Exception as e:
            print(f"Simulation cycle warning: {str(e)}. Attempting reconnect in 5s...")
            time.sleep(5.0)
            # Renew token in case it expired
            try:
                token = get_session_token()
                headers = {"Authorization": f"Bearer {token}"}
            except Exception:
                pass

if __name__ == "__main__":
    run_simulation_loop()
