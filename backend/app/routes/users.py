from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_admin_role
from backend.app.models.models import User
from backend.app.schemas.schemas import UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Users Management"])

@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _user = Depends(check_admin_role)
):
    """
    Lists all users registered in the system. Admin access only.
    """
    return db.query(User).all()

@router.put("/{id}", response_model=UserOut)
def update_user(
    id: str,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    _user = Depends(check_admin_role)
):
    """
    Modifies a user's parameters (e.g. changing role). Admin access only.
    """
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {id} not found."
        )
    
    update_data = user_in.model_dump(exclude_unset=True)
    
    # Hash password if updated
    if "password" in update_data and update_data["password"]:
        from backend.app.core.security import get_password_hash
        user.hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]

    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    id: str,
    db: Session = Depends(get_db),
    _user = Depends(check_admin_role)
):
    """
    Deletes a user from the system. Admin access only.
    """
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {id} not found."
        )
        
    # Prevent deleting oneself
    if user.email == _user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own accounts."
        )

    db.delete(user)
    db.commit()
    return
