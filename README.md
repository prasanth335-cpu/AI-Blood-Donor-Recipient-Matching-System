# AegisPredict - Industrial Predictive Maintenance System

AegisPredict is a production-ready, full-stack industrial predictive maintenance platform designed to monitor manufacturing assets, predict structural and thermal machinery failures using Machine Learning, generate intelligent recommendation playbooks, and raise active notifications for plant engineers.

---

## Key Features

*   **Real-time Sensor Monitoring**: Track Temperature, Vibration, Pressure, Voltage, Current, RPM, and Humidity.
*   **Machine Learning Failure Oracle**: Ensembles RandomForest and XGBoost models to classify failure risks, calculate health scores, and estimate Remaining Useful Life (RUL).
*   **Actionable Recommendation Engine**: Generates step-by-step diagnostic and lockout playbooks for technicians (e.g. bearing lubrication, cooling system flushes, spindle calibrations).
*   **Dynamic Alarms & Escalations**: Automatically flags telemetry breaches, alerts operators, and overrides machinery states in the database.
*   **Analytics Dashboard**: Visualizes time-series timelines, average health indices, and department performance comparisons.
*   **AI Maintenance Assistant**: Contextual diagnostics expert system that helps operators query asset health and plan repairs.
*   **Role-Based Security**: Restricts core administrative actions (e.g. registering equipment, deactivating users) to Administrators while granting diagnostic permissions to Maintenance Engineers.

---

## System Architecture

```text
               +-------------------------------------------------+
               |              React.js Frontend Client           |
               |     (Vite, Tailwind CSS, Chart.js Dashboard)    |
               +-----------------------+-------------------------+
                                       | HTTPS (JWT Bearer Token)
                                       v
               +-------------------------------------------------+
               |                FastAPI Backend                  |
               |   (DB Session Scopes, Role Authorization Guards) |
               +--------+--------------------+-------------+-----+
                        |                    |             |
                        | SQLAlchemy         | Joblib      | rule-based
                        v                    v             v
            +-----------------------+  +-----------+  +----------------------+
            |    Database Layer     |  | ML Oracle |  | Recommendation       |
            | (PostgreSQL / SQLite) |  | Predictor |  | Engine               |
            +-----------------------+  +-----------+  +----------------------+
```

---

## Project Directory Structure

```text
Industrial-Predictive-Maintenance/
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration, security, database engines
│   │   ├── models/         # SQLAlchemy database models
│   │   ├── schemas/        # Pydantic schemas (validations)
│   │   ├── routes/         # FastAPI endpoints (auth, machines, alerts, etc.)
│   │   ├── services/       # ML inference, recommendations, PDF reports
│   │   └── main.py         # Application entrypoint & CORS setup
│   ├── tests/              # pytest unit test cases
│   ├── simulate_sensors.py # Telemetry streaming simulator script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout scaffolding (Sidebar, Header, Layout)
│   │   ├── context/        # Session Auth and Theme (Dark Mode) managers
│   │   ├── pages/          # Viewports (Dashboard, Inventory, Alerts, Admin)
│   │   ├── services/       # Axios API client config
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── ml/
│   ├── data/               # Raw generated CSV data
│   ├── models/             # joblib model and scaler weights
│   ├── generate_data.py    # Physical failure mode dataset generator
│   └── train.py            # Model training & champion validation pipeline
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.conf          # Nginx reverse proxy configuration
├── docker-compose.yml      # Multi-container orchestration
└── README.md
```

---

## Local Development Setup

### Prerequisite Dependencies
*   Python 3.10+
*   Node.js 18+

### 1. Database & Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  On initial startup, the backend will automatically generate an SQLite database `maintenance.db` inside the folder and seed default departments, operators, and machine templates.
4.  Launch the FastAPI server:
    ```bash
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    ```
    *API documentation is served at:* [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Train the Machine Learning Classifier
To generate the dataset and dump the model weight files (`best_model.joblib`) into the app cache, run:
```bash
python ml/train.py
```
*Note: If XGBoost is missing, the script gracefully falls back to RandomForest classification and copies the model to the API models cache.*

### 3. Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install --legacy-peer-deps
    ```
3.  Launch the Vite development server:
    ```bash
    npm run dev
    ```
    *Access the client app at:* [http://localhost:5173](http://localhost:5173)

### 4. Default Credentials (Seeded Records)
*   **System Administrator**:
    *   Email: `admin@factory.com`
    *   Password: `AdminPassword123!`
*   **Maintenance Engineer**:
    *   Email: `engineer@factory.com`
    *   Password: `EngineerPassword123!`

---

## Running Live Telemetry Simulation
To showcase real-time updates and trigger failure classifications on the dashboard charts, start the sensor simulator script:
```bash
python backend/simulate_sensors.py
```
This script will authenticate as the engineer and stream telemetry logs for randomly chosen machines every 3 seconds, injecting random failures like overheating or mechanical wear at an 8% chance.

---

## Docker Compose Deployment

To build and launch the entire stack using Docker (which mounts a production PostgreSQL database instance, compiles static React assets via Nginx, and starts the FastAPI server):

1.  From the project root directory, execute:
    ```bash
    docker-compose up --build
    ```
2.  The application will be accessible at:
    *   **Frontend client interface**: [http://localhost](http://localhost) (Port 80)
    *   **Backend FastAPI API**: [http://localhost:8000](http://localhost:8000) (Port 8000)
    *   **Swagger documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Key API Endpoints Reference

*   `POST /api/auth/login-json`: JSON login. Returns JWT and role authorization.
*   `GET /api/machines`: Lists all machinery with status parameters.
*   `POST /api/machines`: Logs a new machine (Restricted: Admin).
*   `POST /api/sensor-data`: Ingests single telemetry log and runs alert scans.
*   `POST /api/predictions/predict/{machine_id}`: Triggers an on-demand ML evaluation on the latest telemetry point.
*   `PUT /api/alerts/{id}/resolve`: Resolves an alarm and resets machinery status.
*   `POST /api/reports/generate`: Generates downloadable PDF or CSV summaries.
*   `POST /api/assistant/chat`: Contextual chatbot for maintenance troubleshooting playbooks.
