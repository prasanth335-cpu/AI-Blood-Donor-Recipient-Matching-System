import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.core.security import get_password_hash
from backend.app.models.models import User, Department, Machine

# Setup isolated in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    # Create the tables
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    
    # Seed mock user and departments for tests
    admin = User(
        email="admin@test.com",
        hashed_password=get_password_hash("testpassword"),
        full_name="Test Administrator",
        role="admin"
    )
    engineer = User(
        email="engineer@test.com",
        hashed_password=get_password_hash("testpassword"),
        full_name="Test Engineer",
        role="engineer"
    )
    
    dept = Department(name="Test Machining", description="Test Process")
    
    db_session.add_all([admin, engineer, dept])
    db_session.commit()
    db_session.refresh(dept)
    
    # Seed mock machine
    machine = Machine(
        name="Test Machine 100",
        department_id=dept.id,
        factory_location="Bay 1",
        manufacturer="MakerCorp",
        installation_date=Base.metadata.naming_convention.get("install_date", Base.metadata.bind or "") or "", # just a date placeholder
        status="operational",
        operating_hours=150.0
    )
    # Fix install date
    import datetime
    machine.installation_date = datetime.datetime.utcnow()
    db_session.add(machine)
    db_session.commit()

    yield db_session
    
    db_session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
