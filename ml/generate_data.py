import os
import pandas as pd
import numpy as np

def generate_dataset(num_samples: int = 10000) -> None:
    """
    Generates a synthetic industrial telemetry dataset containing normal operating logs 
    and realistic failure signatures (overheating, electrical surges, mechanical wear, etc.).
    Saves the output to ml/data/predictive_maintenance.csv.
    """
    print(f"Generating {num_samples} synthetic sensor logs...")
    np.random.seed(42)

    # 1. Base telemetry parameters generated using normal distributions
    temperature = np.random.normal(loc=65.0, scale=8.0, size=num_samples)     # °C
    vibration = np.random.normal(loc=3.0, scale=1.5, size=num_samples)        # mm/s
    pressure = np.random.normal(loc=3.2, scale=0.8, size=num_samples)         # bar
    voltage = np.random.normal(loc=220.0, scale=10.0, size=num_samples)       # V
    current = np.random.normal(loc=8.0, scale=2.0, size=num_samples)          # A
    rpm = np.random.normal(loc=1800.0, scale=250.0, size=num_samples)         # RPM
    humidity = np.random.normal(loc=45.0, scale=10.0, size=num_samples)       # %
    operating_hours = np.random.uniform(low=50.0, high=9000.0, size=num_samples) # Hrs

    # Enforce realistic bounds
    humidity = np.clip(humidity, 0.0, 100.0)
    temperature = np.maximum(temperature, 15.0)
    vibration = np.maximum(vibration, 0.1)
    pressure = np.maximum(pressure, 0.1)
    voltage = np.maximum(voltage, 0.0)
    current = np.maximum(current, 0.0)
    rpm = np.maximum(rpm, 0.0)

    # 2. Define failure modes (ground truth)
    failures = np.zeros(num_samples, dtype=int)
    failure_types = []

    for i in range(num_samples):
        fail = 0
        ftype = "None"
        
        # Mode A: Thermal Dissipation Failure (High Temp + high load)
        if temperature[i] > 88.0 and current[i] > 10.0:
            if np.random.rand() < 0.85:
                fail = 1
                ftype = "Thermal Dissipation"
                
        # Mode B: Mechanical Bearing Failure (Severe Vibration)
        elif vibration[i] > 8.5:
            if np.random.rand() < 0.90:
                fail = 1
                ftype = "Mechanical Wear"
                
        # Mode C: Hydraulic Overstrain Failure (High Pressure)
        elif pressure[i] > 6.2 and rpm[i] > 1900:
            if np.random.rand() < 0.80:
                fail = 1
                ftype = "Hydraulic Overstrain"
                
        # Mode D: Power Surge / Electrical Failure (High current + voltage dip)
        elif current[i] > 14.5 and voltage[i] < 190.0:
            if np.random.rand() < 0.95:
                fail = 1
                ftype = "Electrical Surge"
                
        # Mode E: Aging Wear (Accumulated hours fatigue + moderate vibrations)
        elif operating_hours[i] > 7500.0 and vibration[i] > 5.0:
            if np.random.rand() < 0.70:
                fail = 1
                ftype = "Fatigue Wear"
                
        # General background noise failures (random breakdowns)
        elif np.random.rand() < 0.015:
            fail = 1
            ftype = "Random Breakdown"

        failures[i] = fail
        failure_types.append(ftype)

    # Create Pandas DataFrame
    df = pd.DataFrame({
        "temperature": temperature,
        "vibration": vibration,
        "pressure": pressure,
        "voltage": voltage,
        "current": current,
        "rpm": rpm,
        "humidity": humidity,
        "operating_hours": operating_hours,
        "failure": failures,
        "failure_type": failure_types
    })

    # Save to disk
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    
    file_path = os.path.join(data_dir, "predictive_maintenance.csv")
    df.to_csv(file_path, index=False)
    print(f"Dataset successfully saved with {df.shape[0]} rows (failures: {df['failure'].sum()} or {df['failure'].mean()*100:.2f}%) to {file_path}")

if __name__ == "__main__":
    generate_dataset()
