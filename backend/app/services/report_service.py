import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.db.supabase_client import supabase
from app.models.schemas import ChecklistItem, Inspection

# Design token colours
PRIMARY = colors.HexColor("#16548C")
TEXT_PRIMARY = colors.HexColor("#1A202C")
TEXT_SECONDARY = colors.HexColor("#5A6572")
SUCCESS = colors.HexColor("#1E7B44")
WARNING_BG = colors.HexColor("#FEF3C7")
WARNING_FG = colors.HexColor("#B45309")
BORDER = colors.HexColor("#D8DEE4")
SURFACE = colors.white


def generate_and_upload(inspection: Inspection, checklist_state: list[ChecklistItem]) -> str:
    """Build a PDF report and upload to Supabase Storage. Returns the signed URL string."""
    pdf_bytes = _build_pdf(inspection, checklist_state)

    path = f"{inspection.user_id}/{inspection.id}/report.pdf"
    supabase.storage.from_("inspection-reports").upload(
        path=path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )

    result = supabase.storage.from_("inspection-reports").create_signed_url(
        path=path, expires_in=315360000
    )
    return result["signedURL"]


def _build_pdf(inspection: Inspection, checklist_state: list[ChecklistItem]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], textColor=PRIMARY, fontSize=18, spaceAfter=4)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor=TEXT_PRIMARY, fontSize=13, spaceAfter=3)
    body = ParagraphStyle("Body", parent=styles["Normal"], textColor=TEXT_PRIMARY, fontSize=10, leading=15)
    caption = ParagraphStyle("Caption", parent=styles["Normal"], textColor=TEXT_SECONDARY, fontSize=9)
    warning_style = ParagraphStyle(
        "Warning", parent=styles["Normal"], textColor=WARNING_FG, fontSize=9, backColor=WARNING_BG, leading=13
    )

    story = []

    # Header
    story.append(Paragraph("EngineerAI — Inspection Report", h1))
    story.append(Paragraph(
        f"Inspection ID: {inspection.id}  ·  Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        caption,
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8))

    # Diagnosis section
    if inspection.diagnosis:
        d = inspection.diagnosis
        story.append(Paragraph("Diagnosis", h2))
        conf_pct = int(d.confidence * 100)
        story.append(Paragraph(f"<b>Root Cause:</b> {d.root_cause}", body))
        story.append(Paragraph(f"<b>Confidence:</b> {conf_pct}%", body))
        story.append(Spacer(1, 4))
        story.append(Paragraph(d.explanation, body))
        story.append(Spacer(1, 6))

        if d.cited_sources:
            story.append(Paragraph("<b>Evidence Sources:</b> " + ", ".join(d.cited_sources), caption))
            story.append(Spacer(1, 4))

        if d.ruled_out:
            story.append(Paragraph("Ruled Out:", caption))
            for ro in d.ruled_out:
                story.append(Paragraph(f"• {ro.cause}: {ro.reason}", caption))
        story.append(Spacer(1, 8))

    # Repair plan
    if inspection.repair_plan:
        rp = inspection.repair_plan
        story.append(Paragraph("Repair Plan", h2))
        story.append(Paragraph(
            f"Estimated time: {rp.est_minutes} min  ·  Tools: {', '.join(rp.tools)}",
            caption,
        ))
        story.append(Spacer(1, 4))

        if rp.safety_warnings:
            for sw in rp.safety_warnings:
                story.append(Paragraph(f"⚠ {sw}", warning_style))
            story.append(Spacer(1, 4))

        for step in rp.steps:
            checked = next(
                (c.checked for c in checklist_state if c.step == step.instruction), False
            )
            mark = "✓" if checked else "○"
            line = f"{mark}  <b>Step {step.step_number}:</b> {step.instruction}"
            story.append(Paragraph(line, body))
            if step.safety_warning:
                story.append(Paragraph(f"   ⚠ {step.safety_warning}", warning_style))
        story.append(Spacer(1, 8))

        if rp.spare_parts:
            story.append(Paragraph("Spare Parts", h2))
            data = [["Part", "Specification"]] + [[p.part_name, p.spec] for p in rp.spare_parts]
            t = Table(data, colWidths=[80 * mm, 80 * mm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, colors.HexColor("#F4F6F8")]),
            ]))
            story.append(t)

    doc.build(story)
    return buf.getvalue()
