import os
import textwrap
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from app.core.config import settings

def _draw_top_accent(c, width, height, brand_color):
    c.setFillColor(brand_color)
    c.rect(0, height - 6, width, 6, fill=True, stroke=False)

def _draw_footer(c, width, margin_left, margin_right, current_page, total_pages, text_muted, border_color, note_text):
    c.setStrokeColor(border_color)
    c.setLineWidth(0.5)
    c.line(margin_left, 45, width - margin_right, 45)
    
    c.setFont("Helvetica", 8)
    c.setFillColor(text_muted)
    c.drawString(margin_left, 32, note_text)
    c.drawRightString(width - margin_right, 32, f"Page {current_page} of {total_pages} • SolopreneurOS Verified")

def _get_org_lines(org):
    lines = []
    if not org:
        return lines
    if getattr(org, "legal_name", None) and org.legal_name != org.name:
        lines.append(f"Legal Entity: {org.legal_name}")
    
    reg_parts = []
    if getattr(org, "tax_id", None):
        reg_parts.append(f"Tax / VAT: {org.tax_id}")
    if getattr(org, "business_number", None):
        reg_parts.append(f"Reg #: {org.business_number}")
    if reg_parts:
        lines.append(" • ".join(reg_parts))
        
    addr_parts = [p for p in [getattr(org, "billing_address", None), getattr(org, "city", None), getattr(org, "postal_code", None), getattr(org, "country", None)] if p]
    if addr_parts:
        lines.append(", ".join(addr_parts))
        
    contact_parts = [p for p in [getattr(org, "support_email", None), getattr(org, "phone", None), getattr(org, "website", None)] if p]
    if contact_parts:
        lines.append(" • ".join(contact_parts))
    elif getattr(org, "slug", None):
        lines.append(f"workspace: solopreneuros.app/t/{org.slug}")
    return lines

def _get_client_lines(client):
    lines = []
    if not client:
        return lines
    if getattr(client, "contact_person", None):
        lines.append(f"Attn: {client.contact_person}")
    if getattr(client, "email", None):
        lines.append(client.email)
    if getattr(client, "phone", None):
        lines.append(f"Tel: {client.phone}")
    if getattr(client, "tax_id", None):
        lines.append(f"Tax / VAT ID: {client.tax_id}")
    
    addr_parts = [p for p in [getattr(client, "billing_address", None), getattr(client, "city", None), getattr(client, "state", None), getattr(client, "postal_code", None), getattr(client, "country", None)] if p]
    if addr_parts:
        lines.append(", ".join(addr_parts))
    return lines

def render_invoice_pdf(invoice, client, project, line_items, org=None, currency_symbol="$") -> str:
    """
    Renders a pixel-perfect, beautifully aligned enterprise invoice PDF
    with complete tax compliance, vendor registration, and client billing details.
    """
    static_dir = settings.STATIC_DIR
    os.makedirs(static_dir, exist_ok=True)
    clean_client_name = "".join(c for c in (client.name if client and client.name else "Client") if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
    pdf_filename = f"Invoice_{invoice.id:04d}_{clean_client_name}.pdf"
    pdf_filepath = os.path.join(static_dir, pdf_filename)
    
    c = canvas.Canvas(pdf_filepath, pagesize=letter)
    width, height = letter # 612 x 792 pt
    margin_left = 48
    margin_right = 48
    content_width = width - margin_left - margin_right # 516 pt
    
    org_display_name = (org.name or "Solopreneur Workspace") if org else "Solopreneur Workspace"
    brand_color_hex = (org.brand_color or "#4f46e5") if org else "#4f46e5"
    brand_color = colors.HexColor(brand_color_hex)
    text_dark = colors.HexColor("#0f172a") # Slate-900
    text_muted = colors.HexColor("#64748b") # Slate-500
    border_color = colors.HexColor("#e2e8f0") # Slate-200
    bg_alt = colors.HexColor("#f8fafc") # Slate-50
    
    _draw_top_accent(c, width, height, brand_color)
    
    # 1. Header (Left: Org Name & Legal/Tax Details; Right: INVOICE title & metadata)
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin_left, height - 46, org_display_name)
    
    org_lines = _get_org_lines(org)
    left_y = height - 60
    c.setFont("Helvetica", 8)
    c.setFillColor(text_muted)
    for o_line in org_lines[:5]:
        c.drawString(margin_left, left_y, o_line)
        left_y -= 11
    if not org_lines:
        c.drawString(margin_left, left_y, "Professional Invoicing & B2B Billing")
        left_y -= 11
        
    c.setFillColor(brand_color)
    c.setFont("Helvetica-Bold", 24)
    c.drawRightString(width - margin_right, height - 46, "INVOICE")
    
    # Metadata Right Column
    meta_y = height - 66
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(text_dark)
    c.drawRightString(width - margin_right - 90, meta_y, "Invoice No:")
    c.drawRightString(width - margin_right - 90, meta_y - 14, "Date Issued:")
    c.drawRightString(width - margin_right - 90, meta_y - 28, "Status:")
    
    c.setFont("Helvetica", 8.5)
    c.setFillColor(text_muted)
    c.drawRightString(width - margin_right, meta_y, f"INV-{invoice.id:04d}")
    c.drawRightString(width - margin_right, meta_y - 14, f"{str(invoice.created_at)[:10]}")
    
    status_str = (invoice.status or "Draft").upper()
    status_color = colors.HexColor("#10b981") if status_str == "PAID" else colors.HexColor("#f59e0b")
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(status_color)
    c.drawRightString(width - margin_right, meta_y - 28, status_str)
    
    right_y = meta_y - 42
    if client and getattr(client, "payment_terms", None):
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(text_dark)
        c.drawRightString(width - margin_right - 90, right_y, "Payment Terms:")
        c.setFont("Helvetica", 8.5)
        c.setFillColor(text_muted)
        c.drawRightString(width - margin_right, right_y, client.payment_terms)
        right_y -= 14
        
    # Divider Rule
    divider_y = min(left_y, right_y) - 10
    c.setStrokeColor(border_color)
    c.setLineWidth(1)
    c.line(margin_left, divider_y, width - margin_right, divider_y)
    
    # 2. Client & Project Info Block
    card_y = divider_y - 16
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(text_muted)
    c.drawString(margin_left, card_y, "BILLED TO:")
    if project:
        c.drawString(margin_left + 260, card_y, "PROJECT / ENGAGEMENT:")
        
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(text_dark)
    client_name = client.name if client and client.name else "Client"
    c.drawString(margin_left, card_y - 14, client_name)
    if project:
        c.drawString(margin_left + 260, card_y - 14, project.name or "")
        
    client_lines = _get_client_lines(client)
    cy = card_y - 26
    c.setFont("Helvetica", 8)
    c.setFillColor(text_muted)
    for cl_line in client_lines[:6]:
        c.drawString(margin_left, cy, cl_line)
        cy -= 11
    if not client_lines and client and getattr(client, "email", None):
        c.drawString(margin_left, cy, client.email)
        cy -= 11
        
    py = card_y - 26
    if project and getattr(project, "hourly_rate", None):
        c.setFont("Helvetica", 8.5)
        c.setFillColor(text_muted)
        c.drawString(margin_left + 260, py, f"Billing Rate: {currency_symbol}{project.hourly_rate:,.2f}/hr")
        py -= 13
    if client and getattr(client, "client_tier", None) and client.client_tier != "Standard":
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(brand_color)
        c.drawString(margin_left + 260, py, f"Client Tier: {client.client_tier.upper()}")
        py -= 13
        
    # 3. Table Header
    table_top = min(cy, py) - 14
    table_x = margin_left
    header_height = 24
    
    c.setFillColor(brand_color)
    c.rect(table_x, table_top - header_height, content_width, header_height, fill=True, stroke=False)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(table_x + 12, table_top - 16, "ITEM / DELIVERABLE")
    c.drawRightString(table_x + 348, table_top - 16, "QTY")
    c.drawRightString(table_x + 430, table_top - 16, "RATE")
    c.drawRightString(table_x + content_width - 12, table_top - 16, "TOTAL")
    
    # 4. Table Rows
    row_y = table_top - header_height
    c.setFont("Helvetica", 9)
    subtotal = 0
    current_page = 1
    
    for i, item in enumerate(line_items):
        item_qty = float(item.quantity or 1.0)
        item_unit_price = float(item.unit_price or 0.0)
        item_total = item_qty * item_unit_price
        subtotal += item_total
        
        desc_text = item.description or "Consulting Services"
        lines = textwrap.wrap(desc_text, width=54) or [""]
        row_h = max(26, 12 + (13 * len(lines)))
        
        if row_y - row_h < 180:
            _draw_footer(c, width, margin_left, margin_right, current_page, "?", text_muted, border_color, "Thank you for your business! SolopreneurOS Enterprise Verified.")
            c.showPage()
            current_page += 1
            _draw_top_accent(c, width, height, brand_color)
            
            c.setFillColor(text_dark)
            c.setFont("Helvetica-Bold", 14)
            c.drawString(margin_left, height - 40, f"INVOICE INV-{invoice.id:04d} (CONT.)")
            table_top = height - 60
            c.setFillColor(brand_color)
            c.rect(table_x, table_top - header_height, content_width, header_height, fill=True, stroke=False)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(table_x + 12, table_top - 16, "ITEM / DELIVERABLE")
            c.drawRightString(table_x + 348, table_top - 16, "QTY")
            c.drawRightString(table_x + 430, table_top - 16, "RATE")
            c.drawRightString(table_x + content_width - 12, table_top - 16, "TOTAL")
            row_y = table_top - header_height
            
        if i % 2 == 1:
            c.setFillColor(bg_alt)
            c.rect(table_x, row_y - row_h, content_width, row_h, fill=True, stroke=False)
            
        c.setStrokeColor(border_color)
        c.setLineWidth(0.5)
        c.line(table_x, row_y - row_h, table_x + content_width, row_y - row_h)
        
        c.setFillColor(text_dark)
        text_baseline = row_y - 16
        for l_idx, line in enumerate(lines):
            c.drawString(table_x + 12, text_baseline - (l_idx * 13), line)
            
        c.setFont("Helvetica", 9)
        c.setFillColor(text_muted)
        c.drawRightString(table_x + 348, text_baseline, f"{item_qty:g}")
        c.drawRightString(table_x + 430, text_baseline, f"{currency_symbol}{item_unit_price:,.2f}")
        
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(text_dark)
        c.drawRightString(table_x + content_width - 12, text_baseline, f"{currency_symbol}{item_total:,.2f}")
        c.setFont("Helvetica", 9)
        
        row_y -= row_h
        
    # 5. Totals Box
    totals_y = row_y - 18
    box_w = 230
    box_x = width - margin_right - box_w
    
    c.setFont("Helvetica", 9.5)
    c.setFillColor(text_muted)
    c.drawString(box_x, totals_y, "Subtotal:")
    c.drawRightString(width - margin_right - 12, totals_y, f"{currency_symbol}{subtotal:,.2f}")
    
    c.setStrokeColor(border_color)
    c.setLineWidth(1)
    c.line(box_x, totals_y - 10, width - margin_right, totals_y - 10)
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(text_dark)
    c.drawString(box_x, totals_y - 28, "Total Amount Due:")
    c.setFont("Helvetica-Bold", 15)
    c.setFillColor(brand_color)
    c.drawRightString(width - margin_right - 12, totals_y - 28, f"{currency_symbol}{invoice.amount:,.2f}")
    
    # 6. Payment Terms Box
    terms_y = totals_y - 65
    terms_text = f"Payment terms: {client.payment_terms if client and getattr(client, 'payment_terms', None) else 'Due within 30 days of receipt'}."
    remit_to = getattr(org, "legal_name", None) or org_display_name
    tax_mention = f" (Tax/VAT ID: {org.tax_id})" if getattr(org, "tax_id", None) else ""
    
    c.setFillColor(bg_alt)
    c.setStrokeColor(border_color)
    c.roundRect(margin_left, terms_y - 42, content_width, 48, 6, fill=True, stroke=True)
    
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(text_dark)
    c.drawString(margin_left + 12, terms_y - 12, "PAYMENT TERMS & COMPLIANCE INSTRUCTIONS:")
    c.setFont("Helvetica", 8)
    c.setFillColor(text_muted)
    c.drawString(margin_left + 12, terms_y - 24, f"{terms_text} Please remit funds to {remit_to}{tax_mention}.")
    support_contact = getattr(org, "support_email", None) or getattr(org, "phone", None) or "your account manager"
    c.drawString(margin_left + 12, terms_y - 36, f"For electronic wire remittances or invoice inquiries, contact: {support_contact}.")
    
    # 7. Final Footer
    _draw_footer(c, width, margin_left, margin_right, current_page, current_page, text_muted, border_color, "Thank you for your business! SolopreneurOS Enterprise Verified.")
    
    c.save()
    base_api = settings.API_BASE_URL.rstrip('/')
    return f"{base_api}/static/{pdf_filename}"


def render_proposal_pdf(proposal, client, line_items, org=None, currency_symbol="$") -> str:
    """
    Renders a pixel-perfect, beautifully aligned enterprise proposal & SOW PDF
    with complete organization legal context and client contact details.
    """
    static_dir = settings.STATIC_DIR
    os.makedirs(static_dir, exist_ok=True)
    clean_client_name = "".join(c for c in (client.name if client and client.name else "Client") if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
    pdf_filename = f"Proposal_{proposal.id}_{clean_client_name}.pdf"
    pdf_filepath = os.path.join(static_dir, pdf_filename)
    
    c = canvas.Canvas(pdf_filepath, pagesize=letter)
    width, height = letter
    margin_left = 48
    margin_right = 48
    content_width = width - margin_left - margin_right # 516 pt
    
    org_display_name = (org.name or "Solopreneur Workspace") if org else "Solopreneur Workspace"
    brand_color_hex = (org.brand_color or "#4f46e5") if org else "#4f46e5"
    brand_color = colors.HexColor(brand_color_hex)
    text_dark = colors.HexColor("#0f172a")
    text_muted = colors.HexColor("#64748b")
    border_color = colors.HexColor("#e2e8f0")
    bg_alt = colors.HexColor("#f8fafc")
    
    _draw_top_accent(c, width, height, brand_color)
    
    # 1. Header
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin_left, height - 46, org_display_name)
    
    org_lines = _get_org_lines(org)
    left_y = height - 60
    c.setFont("Helvetica", 8)
    c.setFillColor(text_muted)
    for o_line in org_lines[:5]:
        c.drawString(margin_left, left_y, o_line)
        left_y -= 11
    if not org_lines:
        c.drawString(margin_left, left_y, "Project Statement of Work & Proposal")
        left_y -= 11
        
    c.setFillColor(brand_color)
    c.setFont("Helvetica-Bold", 22)
    c.drawRightString(width - margin_right, height - 46, "PROPOSAL & SOW")
    
    # Metadata Right Column
    meta_y = height - 66
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(text_dark)
    c.drawRightString(width - margin_right - 90, meta_y, "Proposal No:")
    c.drawRightString(width - margin_right - 90, meta_y - 14, "Date:")
    c.drawRightString(width - margin_right - 90, meta_y - 28, "Status:")
    
    c.setFont("Helvetica", 8.5)
    c.setFillColor(text_muted)
    c.drawRightString(width - margin_right, meta_y, f"PROP-{proposal.id:04d}")
    c.drawRightString(width - margin_right, meta_y - 14, f"{str(proposal.created_at)[:10]}")
    
    status_str = (proposal.status or "Draft").upper()
    status_color = colors.HexColor("#10b981") if status_str == "ACCEPTED" else colors.HexColor("#f59e0b")
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(status_color)
    c.drawRightString(width - margin_right, meta_y - 28, status_str)
    
    # Divider Rule
    divider_y = min(left_y, meta_y - 36) - 10
    c.setStrokeColor(border_color)
    c.setLineWidth(1)
    c.line(margin_left, divider_y, width - margin_right, divider_y)
    
    # 2. Client & Project Title Block
    card_y = divider_y - 16
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(text_muted)
    c.drawString(margin_left, card_y, "PREPARED FOR:")
    c.drawString(margin_left + 260, card_y, "PROPOSAL TITLE:")
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(text_dark)
    client_name = client.name if client and client.name else "Client"
    c.drawString(margin_left, card_y - 14, client_name)
    
    title_lines = textwrap.wrap(proposal.title or "Project Engagement", width=36)
    ty = card_y - 14
    for t_line in title_lines:
        c.drawString(margin_left + 260, ty, t_line)
        ty -= 13
        
    client_lines = _get_client_lines(client)
    cy = card_y - 26
    c.setFont("Helvetica", 8)
    c.setFillColor(text_muted)
    for cl_line in client_lines[:6]:
        c.drawString(margin_left, cy, cl_line)
        cy -= 11
    if not client_lines and client and getattr(client, "email", None):
        c.drawString(margin_left, cy, client.email)
        cy -= 11
        
    # 3. Scope of Work Box
    scope_start_y = min(cy, ty) - 14
    scope_text = proposal.description or "Engagement scope and deliverable milestones defined below."
    desc_lines = textwrap.wrap(scope_text, width=88) or [""]
    box_h = max(38, 22 + (13 * len(desc_lines)))
    
    c.setFillColor(bg_alt)
    c.setStrokeColor(border_color)
    c.roundRect(margin_left, scope_start_y - box_h, content_width, box_h, 6, fill=True, stroke=True)
    
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(text_dark)
    c.drawString(margin_left + 12, scope_start_y - 14, "SCOPE OF WORK & OBJECTIVES:")
    c.setFont("Helvetica", 8)
    c.setFillColor(text_muted)
    for l_idx, line in enumerate(desc_lines):
        c.drawString(margin_left + 12, scope_start_y - 27 - (l_idx * 13), line)
        
    # 4. Table Header
    table_top = scope_start_y - box_h - 18
    table_x = margin_left
    header_height = 24
    
    c.setFillColor(brand_color)
    c.rect(table_x, table_top - header_height, content_width, header_height, fill=True, stroke=False)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(table_x + 12, table_top - 16, "DELIVERABLE / MILESTONE")
    c.drawRightString(table_x + 348, table_top - 16, "QTY")
    c.drawRightString(table_x + 430, table_top - 16, "PRICE")
    c.drawRightString(table_x + content_width - 12, table_top - 16, "TOTAL")
    
    # 5. Table Rows
    row_y = table_top - header_height
    c.setFont("Helvetica", 9)
    total_investment = 0
    current_page = 1
    
    for i, item in enumerate(line_items):
        item_qty = float(item.quantity or 1.0)
        item_unit_price = float(item.unit_price or 0.0)
        item_total = item_qty * item_unit_price
        total_investment += item_total
        
        lines = textwrap.wrap(item.description or "Scope Item", width=54) or [""]
        row_h = max(26, 12 + (13 * len(lines)))
        
        if row_y - row_h < 180:
            _draw_footer(c, width, margin_left, margin_right, current_page, "?", text_muted, border_color, "CONFIDENTIAL DOCUMENT • FOR CLIENT REVIEW ONLY")
            c.showPage()
            current_page += 1
            _draw_top_accent(c, width, height, brand_color)
            
            c.setFillColor(text_dark)
            c.setFont("Helvetica-Bold", 14)
            c.drawString(margin_left, height - 40, f"PROPOSAL PROP-{proposal.id:04d} (CONT.)")
            table_top = height - 60
            c.setFillColor(brand_color)
            c.rect(table_x, table_top - header_height, content_width, header_height, fill=True, stroke=False)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(table_x + 12, table_top - 16, "DELIVERABLE / MILESTONE")
            c.drawRightString(table_x + 348, table_top - 16, "QTY")
            c.drawRightString(table_x + 430, table_top - 16, "PRICE")
            c.drawRightString(table_x + content_width - 12, table_top - 16, "TOTAL")
            row_y = table_top - header_height
            
        if i % 2 == 1:
            c.setFillColor(bg_alt)
            c.rect(table_x, row_y - row_h, content_width, row_h, fill=True, stroke=False)
            
        c.setStrokeColor(border_color)
        c.setLineWidth(0.5)
        c.line(table_x, row_y - row_h, table_x + content_width, row_y - row_h)
        
        c.setFillColor(text_dark)
        text_baseline = row_y - 16
        for l_idx, line in enumerate(lines):
            c.drawString(table_x + 12, text_baseline - (l_idx * 13), line)
            
        c.setFont("Helvetica", 9)
        c.setFillColor(text_muted)
        c.drawRightString(table_x + 348, text_baseline, f"{item_qty:g}")
        c.drawRightString(table_x + 430, text_baseline, f"{currency_symbol}{item_unit_price:,.2f}")
        
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(text_dark)
        c.drawRightString(table_x + content_width - 12, text_baseline, f"{currency_symbol}{item_total:,.2f}")
        c.setFont("Helvetica", 9)
        
        row_y -= row_h
        
    # 6. Totals Box
    totals_y = row_y - 18
    box_w = 260
    box_x = width - margin_right - box_w
    
    c.setFont("Helvetica", 9.5)
    c.setFillColor(text_muted)
    c.drawString(box_x, totals_y, "Total Deliverable Cost:")
    c.drawRightString(width - margin_right - 12, totals_y, f"{currency_symbol}{total_investment:,.2f}")
    
    c.setStrokeColor(border_color)
    c.setLineWidth(1)
    c.line(box_x, totals_y - 10, width - margin_right, totals_y - 10)
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(text_dark)
    c.drawString(box_x, totals_y - 28, "Total Estimated Investment:")
    c.setFont("Helvetica-Bold", 15)
    c.setFillColor(brand_color)
    c.drawRightString(width - margin_right - 12, totals_y - 28, f"{currency_symbol}{total_investment:,.2f}")
    
    # 7. Acceptance & Next Steps Box
    terms_y = totals_y - 65
    c.setFillColor(bg_alt)
    c.setStrokeColor(border_color)
    c.roundRect(margin_left, terms_y - 42, content_width, 48, 6, fill=True, stroke=True)
    
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(text_dark)
    c.drawString(margin_left + 12, terms_y - 12, "ACCEPTANCE & STATEMENT OF WORK TERMS:")
    c.setFont("Helvetica", 8)
    c.setFillColor(text_muted)
    c.drawString(margin_left + 12, terms_y - 24, "To approve this proposal, please click 'Accept & Sign Proposal' inside your secure Client Portal.")
    security_contact = getattr(org, "security_email", None) or getattr(org, "support_email", None) or "support@solopreneuros.app"
    c.drawString(margin_left + 12, terms_y - 36, f"Deliverables commence upon signature. For compliance or legal questions, contact: {security_contact}.")
    
    # 8. Footer
    _draw_footer(c, width, margin_left, margin_right, current_page, current_page, text_muted, border_color, "CONFIDENTIAL DOCUMENT • SOLOPRENEUROS ENTERPRISE")
    
    c.save()
    base_api = settings.API_BASE_URL.rstrip('/')
    return f"{base_api}/static/{pdf_filename}"

