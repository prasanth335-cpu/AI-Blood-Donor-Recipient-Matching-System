import pytest
from fastapi.testclient import TestClient

def get_auth_header(client: TestClient, email: str) -> dict:
    response = client.post("/api/auth/login-json", json={
        "email": email,
        "password": "testpassword"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_list_machines_unauthorized(client: TestClient):
    response = client.get("/api/machines")
    assert response.status_code == 401

def test_list_machines_authorized(client: TestClient):
    headers = get_auth_header(client, "engineer@test.com")
    response = client.get("/api/machines", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0
    assert response.json()[0]["name"] == "Test Machine 100"

def test_create_machine_as_engineer_denied(client: TestClient):
    headers = get_auth_header(client, "engineer@test.com")
    response = client.post("/api/machines", headers=headers, json={
        "name": "Should Fail Machine",
        "department_id": 1,
        "factory_location": "Bay 2",
        "manufacturer": "Festool",
        "installation_date": "2026-07-20T12:00:00Z",
        "status": "operational",
        "operating_hours": 0.0
    })
    assert response.status_code == 403 # Forbidden for non-admins

def test_create_machine_as_admin_allowed(client: TestClient):
    headers = get_auth_header(client, "admin@test.com")
    response = client.post("/api/machines", headers=headers, json={
        "name": "Stamping Press D",
        "department_id": 1,
        "factory_location": "Bay 3",
        "manufacturer": "Schuler",
        "installation_date": "2026-07-20T12:00:00Z",
        "status": "operational",
        "operating_hours": 0.0
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Stamping Press D"
    assert "id" in data
