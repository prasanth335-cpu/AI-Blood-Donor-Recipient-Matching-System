from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_engineer_role
from backend.app.models.models import Department
from backend.app.schemas.schemas import DepartmentOut

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Returns lists of all factory departments.
    """
    return db.query(Department).all()
