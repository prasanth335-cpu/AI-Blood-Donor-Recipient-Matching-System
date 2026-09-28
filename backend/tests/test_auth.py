import pytest
from fastapi.testclient import TestClient

def test_register_user(client: TestClient):
    response = client.post("/api/auth/register", json={
        "email": "newuser@test.com",
        "password": "strongpassword123",
        "full_name": "New Technician",
        "role": "engineer"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "engineer"

def test_register_duplicate_user(client: TestClient):
    # Registering duplicate user should return 400
    response = client.post("/api/auth/register", json={
        "email": "engineer@test.com", # already exists in seeds
        "password": "anotherpassword",
        "full_name": "Another Tech",
        "role": "engineer"
    })
    assert response.status_code == 400
    assert "exists" in response.json()["detail"].lower()

def test_login_json(client: TestClient):
    response = client.post("/api/auth/login-json", json={
        "email": "engineer@test.com",
        "password": "testpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "engineer"

def test_login_invalid_credentials(client: TestClient):
    response = client.post("/api/auth/login-json", json={
        "email": "engineer@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 400
    assert "incorrect" in response.json()["detail"].lower()
