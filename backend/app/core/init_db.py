from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.core.config import settings
from backend.app.core.security import get_password_hash
from backend.app.models.models import User, Department, Machine

def init_db() -> None:
    # Create all database tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()

def seed_data(db: Session) -> None:
    # 1. Seed Departments
    departments_to_create = [
        {"name": "Assembly", "description": "Mechanical component and assembly operations"},
        {"name": "Packaging", "description": "Final product packaging and palletizing"},
        {"name": "Machining", "description": "Milling, drilling, and high-precision CNC processes"},
        {"name": "Quality Control", "description": "Metrology, inspection, and sensor testing"}
    ]
    
    departments = {}
    for dept_data in departments_to_create:
        dept = db.query(Department).filter(Department.name == dept_data["name"]).first()
        if not dept:
            dept = Department(name=dept_data["name"], description=dept_data["description"])
            db.add(dept)
            db.commit()
            db.refresh(dept)
        departments[dept.name] = dept

    # 2. Seed Default Admin User
    admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
    if not admin:
        admin = User(
            email=settings.ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            full_name="System Administrator",
            role="admin"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    # 3. Seed Default Maintenance Engineer
    engineer_email = "engineer@factory.com"
    engineer = db.query(User).filter(User.email == engineer_email).first()
    if not engineer:
        engineer = User(
            email=engineer_email,
            hashed_password=get_password_hash("EngineerPassword123!"),
            full_name="John Doe (Lead Engineer)",
            role="engineer"
        )
        db.add(engineer)
        db.commit()
        db.refresh(engineer)

    # 4. Seed Default Machines (if database is empty of machines)
    if db.query(Machine).count() == 0:
        machine_templates = [
            {
                "name": "CNC Milling Center A",
                "dept_name": "Machining",
                "factory_location": "Bay 3, Grid A-4",
                "manufacturer": "Mazak",
                "age_days": 720,
                "status": "operational",
                "operating_hours": 3200.5
            },
            {
                "name": "High-Speed Robotic Assembler B",
                "dept_name": "Assembly",
                "factory_location": "Bay 1, Grid C-2",
                "manufacturer": "FANUC",
                "age_days": 450,
                "status": "operational",
                "operating_hours": 1850.2
            },
            {
                "name": "Pneumatic Packing Line 2",
                "dept_name": "Packaging",
                "factory_location": "Bay 2, Grid F-1",
                "manufacturer": "Festool",
                "age_days": 900,
                "status": "maintenance_required",
                "operating_hours": 4500.0
            },
            {
                "name": "Precision Metrology Scanner",
                "dept_name": "Quality Control",
                "factory_location": "Cleanroom Room B",
                "manufacturer": "Keyence",
                "age_days": 210,
                "status": "operational",
                "operating_hours": 890.8
            },
            {
                "name": "Hydraulic Stamping Press 4",
                "dept_name": "Machining",
                "factory_location": "Bay 3, Grid D-1",
                "manufacturer": "Schuler",
                "age_days": 1200,
                "status": "offline",
                "operating_hours": 7100.4
            }
        ]
        
        for m_temp in machine_templates:
            dept = departments.get(m_temp["dept_name"])
            if dept:
                inst_date = datetime.utcnow() - timedelta(days=m_temp["age_days"])
                machine = Machine(
                    name=m_temp["name"],
                    department_id=dept.id,
                    factory_location=m_temp["factory_location"],
                    manufacturer=m_temp["manufacturer"],
                    installation_date=inst_date,
                    status=m_temp["status"],
                    operating_hours=m_temp["operating_hours"]
                )
                db.add(machine)
        db.commit()

if __name__ == "__main__":
    print("Initializing Database...")
    init_db()
    print("Database Initialized Successfully.")
Approved = True
