import base64
import io
import strawberry
import typing
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
import models
import string
import random
from auth import get_password_hash
import smtplib
from email.message import EmailMessage
import textwrap


def get_user_or_error(info):
    user = info.context.get("user")
    if not user:
        raise Exception("Not authenticated")
    return user

def create_activity_log(db, org_id, user_id, action, target):
    log = models.ActivityLog(organization_id=org_id, user_id=user_id, action=action, target=target)
    db.add(log)
    db.commit()


def resolve_project(root, info):
    db = info.context["db"]
    return db.query(models.Project).filter(models.Project.id == root.project_id).first()

def resolve_client(root, info):
    db = info.context["db"]
    return db.query(models.Client).filter(models.Client.id == root.client_id).first()

def resolve_user(root, info):
    db = info.context["db"]
    return db.query(models.User).filter(models.User.id == root.user_id).first()

def resolve_projects_for_client(root, info):
    db = info.context["db"]
    return db.query(models.Project).filter(models.Project.client_id == root.id).all()

def resolve_invoices_for_client(root, info):
    db = info.context["db"]
    return db.query(models.Invoice).filter(models.Invoice.client_id == root.id).all()

def resolve_tasks_for_project(root, info):
    db = info.context["db"]
    return db.query(models.Task).filter(models.Task.project_id == root.id).all()

def resolve_line_items_for_invoice(root, info):
    db = info.context["db"]
    return db.query(models.InvoiceLineItem).filter(models.InvoiceLineItem.invoice_id == root.id).all()


def generate_invoice_pdf_resolver(invoice_id: int, info: strawberry.Info) -> str:
    user = get_user_or_error(info)
    db = info.context["db"]
    
    currency_symbol = '$'
    if user.currency_preference == 'EUR': currency_symbol = '€'
    elif user.currency_preference == 'GBP': currency_symbol = '£'
    elif user.currency_preference == 'INR': currency_symbol = 'Rs. '

    # Generate PDF logic here (truncated for brevity, keep existing logic by not replacing it, wait, I can just append my new resolvers at the bottom of the file)
    
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.organization_id == user.organization_id
    ).first()
    
    if not invoice:
        raise Exception("Invoice not found")
    
    client = db.query(models.Client).get(invoice.client_id)
    project = db.query(models.Project).get(invoice.project_id)
    line_items = db.query(models.InvoiceLineItem).filter(models.InvoiceLineItem.invoice_id == invoice.id).all()
    
    import os
    pdf_filename = f"Invoice_{invoice.id:04d}_{client.name.replace(' ', '_')}.pdf"
    static_dir = r"d:\SolopreneurOS\backend\static"
    os.makedirs(static_dir, exist_ok=True)
    pdf_filepath = os.path.join(static_dir, pdf_filename)
    
    c = canvas.Canvas(pdf_filepath, pagesize=letter)
    width, height = letter
    
    # Define primary brand color (e.g., Indigo)
    brand_color = colors.HexColor("#4f46e5")
    text_dark = colors.HexColor("#1e293b")
    text_light = colors.HexColor("#64748b")
    
    # Top Accent Bar
    c.setFillColor(brand_color)
    c.rect(0, height - 20, width, 20, fill=True, stroke=False)
    
    # Header: "INVOICE"
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(50, height - 90, "INVOICE")
    
    logo_path = os.path.join(static_dir, "logo.png")
    if os.path.exists(logo_path):
        c.drawImage(logo_path, width - 130, height - 100, width=80, height=80, preserveAspectRatio=True, mask='auto')
    
    # Invoice Meta (Right side)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(400, height - 120, "Invoice Number:")
    c.drawString(400, height - 135, "Date Issued:")
    c.drawString(400, height - 150, "Status:")
    
    c.setFont("Helvetica", 12)
    c.setFillColor(text_light)
    c.drawRightString(width - 50, height - 120, f"INV-{invoice.id:04d}")
    c.drawRightString(width - 50, height - 135, f"{str(invoice.created_at)[:10]}")
    
    # Status coloring
    status_color = colors.HexColor("#10b981") if invoice.status == "Paid" else colors.HexColor("#f59e0b")
    c.setFillColor(status_color)
    c.drawRightString(width - 50, height - 150, f"{invoice.status}")
    
    # Divider
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(1)
    c.line(50, height - 170, width - 50, height - 170)
    
    # Billed To Section
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 200, "Billed To:")
    c.setFont("Helvetica", 12)
    c.setFillColor(text_light)
    c.drawString(50, height - 220, client.name)
    c.drawString(50, height - 240, client.email)
    
    # Project Section
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(300, height - 200, "Project:")
    c.setFont("Helvetica", 12)
    c.setFillColor(text_light)
    c.drawString(300, height - 220, project.name)
    
    # Table Header Background
    y = height - 290
    c.setFillColor(brand_color)
    c.rect(50, y - 8, width - 100, 25, fill=True, stroke=False)
    
    # Table Header Text
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(60, y, "Description")
    c.drawRightString(380, y, "Qty")
    c.drawRightString(460, y, "Price")
    c.drawRightString(540, y, "Total")
    
    y -= 30
    
    # Table Rows
    c.setFont("Helvetica", 11)
    
    for i, item in enumerate(line_items):
        # Wrap description
        desc_lines = textwrap.wrap(item.description, width=50)
        if not desc_lines:
            desc_lines = [""]
            
        row_height = max(24, 8 + (14 * len(desc_lines)))
        
        # Alternate row colors
        if i % 2 == 1:
            c.setFillColor(colors.HexColor("#f8fafc"))
            c.rect(50, y - row_height + 18, width - 100, row_height, fill=True, stroke=False)
            
        c.setFillColor(text_dark)
        
        # Draw wrapped description
        current_y = y
        for line in desc_lines:
            c.drawString(60, current_y, line)
            current_y -= 14
            
        c.drawRightString(380, y, str(item.quantity))
        c.drawRightString(460, y, f"{currency_symbol}{item.unit_price:,.2f}")
        c.drawRightString(540, y, f"{currency_symbol}{(item.quantity * item.unit_price):,.2f}")
        
        y -= row_height + 1
        
    y -= 10
    c.setStrokeColor(brand_color)
    c.setLineWidth(2)
    c.line(350, y, width - 50, y)
    y -= 30
    
    # Total
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(text_dark)
    c.drawRightString(440, y, "Amount Due:")
    c.setFillColor(brand_color)
    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(540, y, f"{currency_symbol}{invoice.amount:,.2f}")
    
    # Footer
    c.setFillColor(text_light)
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(width / 2.0, 50, "Thank you for your business! This is a system generated invoice.")
    
    c.save()
    
    return f"http://localhost:8000/static/{pdf_filename}"


def resolve_team_members(info):
    user = get_user_or_error(info)
    db = info.context["db"]
    return db.query(models.User).filter(models.User.organization_id == user.organization_id).all()

def resolve_client_for_proposal(proposal, info: strawberry.Info):
    db = info.context["db"]
    return db.query(models.Client).get(proposal.client_id)

def resolve_line_items_for_proposal(proposal, info: strawberry.Info):
    db = info.context["db"]
    return db.query(models.ProposalLineItem).filter(models.ProposalLineItem.proposal_id == proposal.id).all()

def generate_proposal_pdf(proposal, line_items, client, currency_symbol):
    import os
    pdf_filename = f"Proposal_{proposal.id}_{client.name.replace(' ', '_')}.pdf"
    static_dir = r"d:\SolopreneurOS\backend\static"
    os.makedirs(static_dir, exist_ok=True)
    pdf_filepath = os.path.join(static_dir, pdf_filename)
    
    c = canvas.Canvas(pdf_filepath, pagesize=letter)
    width, height = letter
    
    brand_color = colors.HexColor("#4f46e5")
    text_dark = colors.HexColor("#1e293b")
    text_light = colors.HexColor("#64748b")
    
    # Top Accent Bar
    c.setFillColor(brand_color)
    c.rect(0, height - 20, width, 20, fill=True, stroke=False)
    
    # Confidential Tag in corner
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, height - 50, "CONFIDENTIAL")
    
    # Header: "PROPOSAL"
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(50, height - 80, "PROPOSAL")
    
    logo_path = os.path.join(static_dir, "logo.png")
    if os.path.exists(logo_path):
        c.drawImage(logo_path, width - 130, height - 100, width=80, height=80, preserveAspectRatio=True, mask='auto')
        
    c.setFont("Helvetica-Bold", 12)
    c.drawString(400, height - 120, "Date:")
    c.drawString(400, height - 140, "Status:")
    
    c.setFont("Helvetica", 12)
    c.setFillColor(text_light)
    c.drawRightString(width - 50, height - 120, f"{proposal.created_at.strftime('%Y-%m-%d')}")
    
    status_color = colors.HexColor("#10b981") if proposal.status == "Accepted" else colors.HexColor("#f59e0b")
    c.setFillColor(status_color)
    c.drawRightString(width - 50, height - 140, f"{proposal.status}")
    
    # Divider
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(1)
    c.line(50, height - 170, width - 50, height - 170)
    
    # Prepared For
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 200, "Prepared For:")
    c.setFont("Helvetica", 12)
    c.setFillColor(text_light)
    c.drawString(50, height - 220, client.name)
    if client.email:
        c.drawString(50, height - 235, client.email)
        
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(300, height - 200, "Project Title:")
    c.setFont("Helvetica", 12)
    c.setFillColor(text_light)
    
    # Wrap title
    title_lines = textwrap.wrap(proposal.title, width=40)
    ty = height - 220
    for t_line in title_lines:
        c.drawString(300, ty, t_line)
        ty -= 15
        
    # Scope of Work
    y = min(height - 280, ty - 30)
    c.setFillColor(text_dark)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Scope of Work:")
    y -= 20
    c.setFont("Helvetica", 11)
    c.setFillColor(text_light)
    
    desc_lines = textwrap.wrap(proposal.description or "", width=90)
    for line in desc_lines:
        c.drawString(50, y, line)
        y -= 14
        
    y -= 30
    
    # Table Header Background
    c.setFillColor(brand_color)
    c.rect(50, y - 8, width - 100, 25, fill=True, stroke=False)
    
    # Table Header Text
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(60, y, "Investment / Deliverable")
    c.drawRightString(380, y, "Qty")
    c.drawRightString(460, y, "Price")
    c.drawRightString(540, y, "Total")
    
    y -= 30
    
    # Table Rows
    c.setFont("Helvetica", 11)
    total = 0
    for i, item in enumerate(line_items):
        desc_lines = textwrap.wrap(item.description, width=50)
        if not desc_lines:
            desc_lines = [""]
            
        row_height = max(24, 8 + (14 * len(desc_lines)))
        
        if i % 2 == 1:
            c.setFillColor(colors.HexColor("#f8fafc"))
            c.rect(50, y - row_height + 18, width - 100, row_height, fill=True, stroke=False)
            
        c.setFillColor(text_dark)
        
        current_y = y
        for line in desc_lines:
            c.drawString(60, current_y, line)
            current_y -= 14
            
        c.drawRightString(380, y, str(item.quantity))
        c.drawRightString(460, y, f"{currency_symbol}{item.unit_price:,.2f}")
        
        item_total = item.quantity * item.unit_price
        total += item_total
        c.drawRightString(540, y, f"{currency_symbol}{item_total:,.2f}")
        
        y -= row_height + 1
        
    y -= 10
    c.setStrokeColor(brand_color)
    c.setLineWidth(2)
    c.line(350, y, width - 50, y)
    y -= 30
    
    # Total
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(text_dark)
    c.drawRightString(440, y, "Total Estimated Investment:")
    c.setFillColor(brand_color)
    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(540, y, f"{currency_symbol}{total:,.2f}")
    
    # Footer Watermark
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width / 2.0, 30, "CONFIDENTIAL DOCUMENT - DO NOT DISTRIBUTE")
    
    c.save()
    
    return f"http://localhost:8000/static/{pdf_filename}"

def preview_proposal_resolver(proposal_id: int, info: strawberry.Info) -> str:
    user = get_user_or_error(info)
    db = info.context["db"]
    
    proposal = db.query(models.Proposal).filter(models.Proposal.id == proposal_id, models.Proposal.organization_id == user.organization_id).first()
    if not proposal:
        raise Exception("Proposal not found")
        
    client = db.query(models.Client).get(proposal.client_id)
    line_items = db.query(models.ProposalLineItem).filter(models.ProposalLineItem.proposal_id == proposal_id).all()
    
    currency_symbol = '$'
    if user.currency_preference == 'EUR': currency_symbol = '€'
    elif user.currency_preference == 'GBP': currency_symbol = '£'
    elif user.currency_preference == 'INR': currency_symbol = 'Rs. '
    
    pdf_url = generate_proposal_pdf(proposal, line_items, client, currency_symbol)
    return pdf_url

def send_proposal_resolver(proposal_id: int, info: strawberry.Info) -> str:
    user = get_user_or_error(info)
    db = info.context["db"]
    
    proposal = db.query(models.Proposal).filter(models.Proposal.id == proposal_id, models.Proposal.organization_id == user.organization_id).first()
    if not proposal:
        raise Exception("Proposal not found")
        
    client = db.query(models.Client).get(proposal.client_id)
    line_items = db.query(models.ProposalLineItem).filter(models.ProposalLineItem.proposal_id == proposal_id).all()
    
    currency_symbol = '$'
    if user.currency_preference == 'EUR': currency_symbol = '€'
    elif user.currency_preference == 'GBP': currency_symbol = '£'
    elif user.currency_preference == 'INR': currency_symbol = 'Rs. '
    
    pdf_url = generate_proposal_pdf(proposal, line_items, client, currency_symbol)
    
    if client.email:
        # Generate the email
        msg = EmailMessage()
        msg['Subject'] = f"Proposal: {proposal.title} from {user.name}"
        msg['From'] = "solopreneuros@gmail.com"
        msg['To'] = client.email
        
        msg.set_content(f"Hi {client.name},\n\nPlease find attached the proposal for {proposal.title}.\n\nYou can review it using the link below:\n{pdf_url}\n\nLet me know if you have any questions or are ready to move forward!\n\nBest,\n{user.name}")
        
        # We don't attach the PDF directly in the prototype to save time, we just send the URL
        try:
            with smtplib.SMTP('smtp.gmail.com', 587) as s:
                s.starttls()
                s.login("solopreneuros@gmail.com", "yepu rnnr cngz tixn")
                s.send_message(msg)
        except Exception as e:
            print(f"Failed to send email: {e}")
            pass
            
    proposal.status = "Sent"
    db.commit()
    
    return pdf_url

def invite_team_member_resolver(email: str, name: str, role: str, info: strawberry.Info):
    user = get_user_or_error(info)
    db = info.context["db"]
    
    if user.role != "Admin":
        raise Exception("Only Admins can invite team members")
        
    if db.query(models.User).filter(models.User.email == email).first():
        raise Exception("Email already registered")
        
    # Generate temporary password
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    hashed_password = get_password_hash(temp_password)
    
    new_user = models.User(
        email=email,
        name=name,
        role=role,
        hashed_password=hashed_password,
        organization_id=user.organization_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # In a real app, send an email here with temp_password
    send_invitation_email(email, name, temp_password)
    
    create_activity_log(db, user.organization_id, user.id, "invited a team member", name)
    return new_user

def update_member_role_resolver(user_id: int, role: str, info: strawberry.Info):
    user = get_user_or_error(info)
    db = info.context["db"]
    
    if user.role != "Admin":
        raise Exception("Only Admins can change roles")
        
    target_user = db.query(models.User).filter(models.User.id == user_id, models.User.organization_id == user.organization_id).first()
    if not target_user:
        raise Exception("User not found")
        
    target_user.role = role
    db.commit()
    db.refresh(target_user)
    
    create_activity_log(db, user.organization_id, user.id, "updated role for", target_user.name)
    return target_user


def send_invitation_email(recipient_email: str, recipient_name: str, temp_password: str):
    SENDER_EMAIL = "info.solopreneur.solutions@gmail.com"
    APP_PASSWORD = "iogbndnrrqblmvtg" 
    
    msg = EmailMessage()
    msg.set_content(f"""Hello {recipient_name},

You have been invited to join SolopreneurOS!

Your temporary login password is: {temp_password}

Please log in and change your password as soon as possible.
""")

    msg['Subject'] = "You're invited to SolopreneurOS!"
    msg['From'] = SENDER_EMAIL
    msg['To'] = recipient_email

    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(SENDER_EMAIL, APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Successfully sent invitation email to {recipient_email}")
    except Exception as e:
        print(f"Failed to send email: {str(e)}")


def send_invoice_email(client_email: str, client_name: str, invoice_id: int, pdf_url: str, amount: float, currency_symbol: str = '$'):
    SENDER_EMAIL = "info.solopreneur.solutions@gmail.com"
    APP_PASSWORD = "iogbndnrrqblmvtg" 
    
    msg = EmailMessage()
    msg.set_content(f"""Dear {client_name},

Thank you for your business. Your invoice (INV-{invoice_id:04d}) for the amount of {currency_symbol}{amount:,.2f} has been generated.

You can view and download your invoice using the link below:
{pdf_url}

If you have any questions regarding this invoice, please do not hesitate to reach out.

Best regards,
Your SolopreneurOS Team
""")

    msg['Subject'] = f"Invoice INV-{invoice_id:04d}"
    msg['From'] = SENDER_EMAIL
    msg['To'] = client_email

    # We just send the URL directly instead of attaching it to match proposals.

    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(SENDER_EMAIL, APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Successfully sent invoice email to {client_email}")
    except Exception as e:
        print(f"Failed to send invoice email: {str(e)}")


def resolve_assignee_for_task(root, info):
    db = info.context["db"]
    return db.query(models.User).filter(models.User.id == root.assignee_id).first()

def resolve_subtasks_for_task(root, info):
    db = info.context["db"]
    return db.query(models.Subtask).filter(models.Subtask.task_id == root.id).all()

def resolve_comments_for_task(root, info):
    db = info.context["db"]
    return db.query(models.TaskComment).filter(models.TaskComment.task_id == root.id).order_by(models.TaskComment.created_at.asc()).all()

import requests

def trigger_webhooks(db, organization_id: int, event_type: str, payload: dict):
    webhooks = db.query(models.Webhook).filter(models.Webhook.organization_id == organization_id, models.Webhook.is_active == True).all()
    for wh in webhooks:
        if wh.event_type == event_type or wh.event_type == "*":
            try:
                requests.post(wh.url, json={"event": event_type, "data": payload}, timeout=3)
            except Exception as e:
                print(f"Webhook {wh.url} failed: {e}")
