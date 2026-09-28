import os
import csv
import io
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.models import Machine, MaintenanceLog, Prediction, Report

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

class ReportService:
    @staticmethod
    def _ensure_report_dir() -> str:
        # Create reports directory in static folders
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        reports_dir = os.path.join(base_dir, "static", "reports")
        os.makedirs(reports_dir, exist_ok=True)
        return reports_dir

    @classmethod
    def generate_csv_report(cls, db: Session, report_type: str) -> tuple[str, str]:
        """
        Generates a CSV report based on the requested type.
        Returns a tuple of (file_name, file_path).
        """
        reports_dir = cls._ensure_report_dir()
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_name = f"{report_type}_report_{timestamp}.csv"
        file_path = os.path.join(reports_dir, file_name)

        with open(file_path, mode="w", newline="", encoding="utf-8") as csv_file:
            writer = csv.writer(csv_file)

            if report_type == "health":
                writer.writerow(["Machine Name", "Factory Location", "Manufacturer", "Operating Hours", "Status", "Installation Date"])
                machines = db.query(Machine).all()
                for m in machines:
                    writer.writerow([m.name, m.factory_location, m.manufacturer, m.operating_hours, m.status, m.installation_date.strftime("%Y-%m-%d")])
            
            elif report_type == "maintenance":
                writer.writerow(["Machine Name", "Performed By (User ID)", "Description", "Action Taken", "Service Date", "Cost ($)"])
                logs = db.query(MaintenanceLog).all()
                for l in logs:
                    machine_name = l.machine.name if l.machine else "Unknown"
                    writer.writerow([machine_name, l.performed_by, l.description, l.action_taken, l.service_date.strftime("%Y-%m-%d"), l.cost])
            
            elif report_type == "prediction":
                writer.writerow(["Machine Name", "Health Score (%)", "Failure Probability (%)", "Remaining Useful Life (Hours)", "Model Used", "Recommendation", "Timestamp"])
                preds = db.query(Prediction).all()
                for p in preds:
                    machine_name = p.machine.name if p.machine else "Unknown"
                    writer.writerow([machine_name, p.health_score, p.failure_probability * 100, p.remaining_useful_life, p.model_used, p.recommendation, p.timestamp.strftime("%Y-%m-%d %H:%M:%S")])

            else:
                writer.writerow(["System Report Generated At", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")])
                
        # Register in database
        db_report = Report(
            name=file_name,
            report_type=report_type,
            file_path=file_path
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)

        return file_name, file_path

    @classmethod
    def generate_pdf_report(cls, db: Session, report_type: str) -> tuple[str, str]:
        """
        Generates a visually appealing PDF report.
        Returns a tuple of (file_name, file_path).
        """
        reports_dir = cls._ensure_report_dir()
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_name = f"{report_type}_report_{timestamp}.pdf"
        file_path = os.path.join(reports_dir, file_name)

        if not REPORTLAB_AVAILABLE:
            # Fallback to text file renamed to PDF, or a simple text report
            with open(file_path, "w") as f:
                f.write(f"PDF library reportlab not installed. Running textual report fallback.\n")
                f.write(f"Report Type: {report_type.upper()}\n")
                f.write(f"Generated at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n")
            return file_name, file_path

        doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()
        
        # Define Custom Styles for aesthetics
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor("#1A202C"),
            spaceAfter=12
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor("#718096"),
            spaceAfter=20
        )
        table_header_style = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.white,
            fontName="Helvetica-Bold"
        )
        table_body_style = ParagraphStyle(
            'TableBody',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor("#2D3748")
        )

        # Header
        story.append(Paragraph(f"Industrial Predictive Maintenance System", title_style))
        story.append(Paragraph(f"Report: {report_type.capitalize()} Summary | Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}", subtitle_style))
        story.append(Spacer(1, 10))

        # Tables
        if report_type == "health":
            data = [[Paragraph("Machine Name", table_header_style), 
                     Paragraph("Location", table_header_style), 
                     Paragraph("Manufacturer", table_header_style), 
                     Paragraph("Hours", table_header_style), 
                     Paragraph("Status", table_header_style)]]
            
            machines = db.query(Machine).all()
            for m in machines:
                data.append([
                    Paragraph(m.name, table_body_style),
                    Paragraph(m.factory_location, table_body_style),
                    Paragraph(m.manufacturer, table_body_style),
                    Paragraph(f"{m.operating_hours:.1f}", table_body_style),
                    Paragraph(m.status.upper(), table_body_style)
                ])
                
        elif report_type == "maintenance":
            data = [[Paragraph("Machine Name", table_header_style), 
                     Paragraph("Description", table_header_style), 
                     Paragraph("Action Taken", table_header_style), 
                     Paragraph("Date", table_header_style), 
                     Paragraph("Cost ($)", table_header_style)]]
            
            logs = db.query(MaintenanceLog).all()
            for l in logs:
                m_name = l.machine.name if l.machine else "Unknown"
                data.append([
                    Paragraph(m_name, table_body_style),
                    Paragraph(l.description, table_body_style),
                    Paragraph(l.action_taken, table_body_style),
                    Paragraph(l.service_date.strftime("%Y-%m-%d"), table_body_style),
                    Paragraph(f"${l.cost:.2f}", table_body_style)
                ])

        elif report_type == "prediction":
            data = [[Paragraph("Machine Name", table_header_style), 
                     Paragraph("Health Score", table_header_style), 
                     Paragraph("Failure Prob", table_header_style), 
                     Paragraph("RUL (Hours)", table_header_style), 
                     Paragraph("Recommendation", table_header_style)]]
            
            preds = db.query(Prediction).all()
            for p in preds:
                m_name = p.machine.name if p.machine else "Unknown"
                prob_pct = p.failure_probability * 100 if p.failure_probability <= 1.0 else p.failure_probability
                data.append([
                    Paragraph(m_name, table_body_style),
                    Paragraph(f"{p.health_score:.1f}%", table_body_style),
                    Paragraph(f"{prob_pct:.1f}%", table_body_style),
                    Paragraph(f"{p.remaining_useful_life:.1f}", table_body_style),
                    Paragraph(p.recommendation, table_body_style)
                ])
        else:
            data = [[Paragraph("Message", table_header_style)], [Paragraph("No details compiled.", table_body_style)]]

        # Draw Table
        table = Table(data, colWidths=[120, 100, 100, 80, 140] if report_type != "maintenance" else [100, 130, 130, 80, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2B6CB0")),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F7FAFC")]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,1), (-1,-1), 4),
            ('TOPPADDING', (0,1), (-1,-1), 4),
        ]))
        
        story.append(table)
        doc.build(story)

        # Register in database
        db_report = Report(
            name=file_name,
            report_type=report_type,
            file_path=file_path
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)

        return file_name, file_path
