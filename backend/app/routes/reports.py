import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import check_engineer_role
from backend.app.models.models import Report
from backend.app.schemas.schemas import ReportOut
from backend.app.services.reports import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("", response_model=List[ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Lists all compiled reports in the system.
    """
    return db.query(Report).order_by(Report.created_at.desc()).all()

@router.post("/generate", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def generate_report(
    report_type: str = Query(..., description="Report type: 'health', 'maintenance', 'prediction'"),
    format: str = Query("pdf", description="Output format: 'pdf' or 'csv'"),
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Compiles a new system report in the specified format (PDF or CSV).
    """
    if report_type not in ["health", "maintenance", "prediction"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type. Allowed values: 'health', 'maintenance', 'prediction'."
        )
    if format not in ["pdf", "csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid format. Allowed values: 'pdf', 'csv'."
        )
        
    try:
        if format == "csv":
            file_name, file_path = ReportService.generate_csv_report(db, report_type)
        else:
            file_name, file_path = ReportService.generate_pdf_report(db, report_type)
            
        # Retrieve registered DB report
        db_report = db.query(Report).filter(Report.name == file_name).first()
        if not db_report:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Report creation failed to register in database."
            )
        return db_report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error compiling report: {str(e)}"
        )

@router.get("/download/{id}")
def download_report(
    id: str,
    db: Session = Depends(get_db),
    _user = Depends(check_engineer_role)
):
    """
    Downloads a compiled report file by ID.
    """
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report record not found in system."
        )
        
    if not os.path.exists(report.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file is missing from filesystem storage."
        )
        
    media_type = "application/pdf" if report.name.endswith(".pdf") else "text/csv"
    return FileResponse(
        path=report.file_path,
        filename=report.name,
        media_type=media_type
    )
