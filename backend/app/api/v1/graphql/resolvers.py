import base64
import io
import strawberry
import typing
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
import app.models as models
import string
import random
from app.core.security import get_password_hash
import smtplib
from email.message import EmailMessage
import textwrap
import os
import requests
from app.core.config import settings
from app.services.pdf import render_invoice_pdf, render_proposal_pdf

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

def resolve_proposals_for_client(root, info):
    db = info.context["db"]
    return db.query(models.Proposal).filter(models.Proposal.client_id == root.id).order_by(models.Proposal.created_at.desc()).all()

def resolve_tasks_for_project(root, info):
    db = info.context["db"]
    return db.query(models.Task).filter(models.Task.project_id == root.id).all()

def resolve_line_items_for_invoice(root, info):
    db = info.context["db"]
    return db.query(models.InvoiceLineItem).filter(models.InvoiceLineItem.invoice_id == root.id).all()

def generate_invoice_pdf_resolver(invoice_id: int, info: strawberry.Info) -> str:
    user = get_user_or_error(info)
    db = info.context["db"]
    
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.organization_id == user.organization_id
    ).first()
    if not invoice:
        raise Exception("Invoice not found")
    
    client = db.query(models.Client).get(invoice.client_id)
    project = db.query(models.Project).get(invoice.project_id) if invoice.project_id else None
    line_items = db.query(models.InvoiceLineItem).filter(models.InvoiceLineItem.invoice_id == invoice.id).all()
    org = db.query(models.Organization).get(user.organization_id)
    
    currency_symbol = '$'
    if user.currency_preference == 'EUR': currency_symbol = '€'
    elif user.currency_preference == 'GBP': currency_symbol = '£'
    elif user.currency_preference == 'INR': currency_symbol = 'Rs. '
    
    return render_invoice_pdf(invoice, client, project, line_items, org, currency_symbol)

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

def generate_proposal_pdf(proposal, line_items, client, currency_symbol, org=None):
    return render_proposal_pdf(proposal, client, line_items, org, currency_symbol)

def preview_proposal_resolver(proposal_id: int, info: strawberry.Info) -> str:
    user = get_user_or_error(info)
    db = info.context["db"]
    proposal = db.query(models.Proposal).filter(models.Proposal.id == proposal_id, models.Proposal.organization_id == user.organization_id).first()
    if not proposal: raise Exception("Proposal not found")
    client = db.query(models.Client).get(proposal.client_id)
    line_items = db.query(models.ProposalLineItem).filter(models.ProposalLineItem.proposal_id == proposal_id).all()
    org = db.query(models.Organization).get(user.organization_id)
    
    currency_symbol = '$'
    if user.currency_preference == 'EUR': currency_symbol = '€'
    elif user.currency_preference == 'GBP': currency_symbol = '£'
    elif user.currency_preference == 'INR': currency_symbol = 'Rs. '
    
    return generate_proposal_pdf(proposal, line_items, client, currency_symbol, org)

def send_proposal_resolver(proposal_id: int, info: strawberry.Info) -> str:
    user = get_user_or_error(info)
    db = info.context["db"]
    proposal = db.query(models.Proposal).filter(models.Proposal.id == proposal_id, models.Proposal.organization_id == user.organization_id).first()
    if not proposal: raise Exception("Proposal not found")
    client = db.query(models.Client).get(proposal.client_id)
    line_items = db.query(models.ProposalLineItem).filter(models.ProposalLineItem.proposal_id == proposal_id).all()
    org = db.query(models.Organization).get(user.organization_id)
    
    currency_symbol = '$'
    if user.currency_preference == 'EUR': currency_symbol = '€'
    elif user.currency_preference == 'GBP': currency_symbol = '£'
    elif user.currency_preference == 'INR': currency_symbol = 'Rs. '
    
    pdf_url = generate_proposal_pdf(proposal, line_items, client, currency_symbol, org)
    proposal.status = "Sent"
    db.commit()
    
    portal_url = f"{settings.FRONTEND_URL.rstrip('/')}/portal/{client.portal_token}" if client and client.portal_token else None
    total_amount = sum(float(item.quantity or 1.0) * float(item.unit_price or 0.0) for item in line_items)
    
    trigger_webhooks(db, user.organization_id, "proposal.send", {
        "proposal_id": proposal.id,
        "proposal_number": f"PROP-{proposal.id:04d}",
        "title": proposal.title,
        "status": proposal.status,
        "pdf_url": pdf_url,
        "client_name": client.name if client else "Client",
        "client_email": client.email if client else "",
        "portal_url": portal_url,
        "total_amount": total_amount,
        "organization_name": org.name if org else "SolopreneurOS"
    })
    
    return pdf_url

def invite_team_member_resolver(email: str, name: str, role: str, info: strawberry.Info):
    user = get_user_or_error(info)
    check_role(user,["Owner","Admin"])
    db = info.context["db"]

    if db.query(models.User).filter(models.User.email == email).first():
        raise Exception("Email already registered")
        
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
    create_activity_log(db, user.organization_id, user.id, "invited a team member", name)
    
    org = db.query(models.Organization).get(user.organization_id)
    invite_payload = {
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "to": new_user.email,
        "role": new_user.role,
        "temp_password": temp_password,
        "organization_name": org.name if org else "SolopreneurOS",
        "organization_slug": org.slug if org and hasattr(org, "slug") else None,
        "login_url": f"{settings.FRONTEND_URL.rstrip('/')}"
    }
    trigger_webhooks(db, user.organization_id, "team_invitation", invite_payload)
    
    return new_user

def update_member_role_resolver(user_id: int, role: str, info: strawberry.Info):
    user = get_user_or_error(info)
    check_role(user,["Owner"])
    db = info.context["db"]
    target_user = db.query(models.User).filter(models.User.id == user_id, models.User.organization_id == user.organization_id).first()
    if not target_user: raise Exception("User not found")
    target_user.role = role
    db.commit()
    db.refresh(target_user)
    create_activity_log(db, user.organization_id, user.id, "updated role for", target_user.name)
    return target_user

def delete_team_member_resolver(user_id: int, info: strawberry.Info) -> bool:
    user = get_user_or_error(info)
    check_role(user, ["Owner", "Admin"])
    db = info.context["db"]
    if user.id == user_id:
        raise Exception("Cannot remove yourself from the organization")
    target_user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.organization_id == user.organization_id
    ).first()
    if not target_user:
        raise Exception("Team member not found")
    if target_user.role == "Owner":
        raise Exception("Cannot remove the organization Owner")
    member_name = target_user.name
    db.delete(target_user)
    db.commit()
    create_activity_log(db, user.organization_id, user.id, "removed team member", member_name)
    return True

def send_invoice_resolver(invoice_id: int, info: strawberry.Info) -> str:
    user = get_user_or_error(info)
    db = info.context["db"]
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.organization_id == user.organization_id).first()
    if not invoice:
        raise Exception("Invoice not found")
    client = db.query(models.Client).get(invoice.client_id)
    project = db.query(models.Project).get(invoice.project_id) if invoice.project_id else None
    line_items = db.query(models.InvoiceLineItem).filter(models.InvoiceLineItem.invoice_id == invoice.id).all()
    org = db.query(models.Organization).get(user.organization_id)
    
    currency_symbol = '$'
    if user.currency_preference == 'EUR': currency_symbol = '€'
    elif user.currency_preference == 'GBP': currency_symbol = '£'
    elif user.currency_preference == 'INR': currency_symbol = 'Rs. '

    pdf_url = render_invoice_pdf(invoice, client, project, line_items, org, currency_symbol)
    portal_url = f"{settings.FRONTEND_URL.rstrip('/')}/portal/{client.portal_token}" if client and client.portal_token else None
    
    payload = {
        "invoice_id": invoice.id,
        "invoice_number": f"INV-{invoice.id:04d}",
        "amount": invoice.amount,
        "client_name": client.name if client else "Client",
        "client_email": client.email if client else "",
        "status": invoice.status,
        "pdf_url": pdf_url,
        "portal_url": portal_url,
        "organization_name": org.name if org else "SolopreneurOS"
    }
    trigger_webhooks(db, user.organization_id, "invoice.send", payload)
    create_activity_log(db, user.organization_id, user.id, "sent invoice", f"INV-{invoice.id:04d} to {client.name}")
    return pdf_url

def send_invoice_email(client_email: str, client_name: str, invoice_id: int, pdf_url: str, amount: float, currency_symbol: str = '$'):
    pass

def resolve_assignee_for_task(root, info):
    db = info.context["db"]
    return db.query(models.User).filter(models.User.id == root.assignee_id).first()

def resolve_subtasks_for_task(root, info):
    db = info.context["db"]
    return db.query(models.Subtask).filter(models.Subtask.task_id == root.id).all()

def resolve_comments_for_task(root, info):
    db = info.context["db"]
    return db.query(models.TaskComment).filter(models.TaskComment.task_id == root.id).order_by(models.TaskComment.created_at.asc()).all()

DEFAULT_SYSTEM_WEBHOOKS = [
    {
        "url": "https://hook.eu1.make.com/forivn1dqc9g2flysx6znrbu5e4jxgk9",
        "events": ["invoice.send", "invoice.created"]
    },
    {
        "url": "https://hook.eu1.make.com/9pm11yl8jfiz33mdgf2o3vht4un3q92p",
        "events": ["proposal.send"]
    },
    {
        "url": "https://hook.eu1.make.com/us4sjup7fkfshjwrfikawob2cwdlxnvv",
        "events": ["team.invited", "team_invitation", "signup.otp", "user_signup_otp"]
    }
]

SYSTEM_WEBHOOK_URLS = {w["url"] for w in DEFAULT_SYSTEM_WEBHOOKS}

def trigger_webhooks(db, organization_id: int, event_type: str, payload: dict):
    target_event = event_type.strip().lower()
    dispatched_urls = set()

    # 1. Platform-level default system webhooks (Protected & Always Active)
    for sys_wh in DEFAULT_SYSTEM_WEBHOOKS:
        if target_event in sys_wh["events"]:
            url = sys_wh["url"]
            dispatched_urls.add(url)
            try:
                print(f"[SYSTEM WEBHOOK] Dispatching '{event_type}' to {url}...")
                resp = requests.post(url, json={"event": event_type, "data": payload, **payload}, timeout=6)
                print(f"[SYSTEM WEBHOOK] {url} responded with status {resp.status_code}")
            except Exception as e:
                print(f"[SYSTEM WEBHOOK ERROR] {url} failed: {e}")

    # 2. Organization-level custom webhooks (User-configured)
    webhooks = db.query(models.Webhook).filter(models.Webhook.organization_id == organization_id, models.Webhook.is_active == True).all()
    for wh in webhooks:
        if wh.url in dispatched_urls:
            continue
        wh_event = (wh.event_type or "").strip().lower()
        
        is_match = (
            wh_event == target_event or 
            wh_event == "*" or
            (wh_event.endswith(".*") and target_event.startswith(wh_event[:-2])) or
            (target_event in ("invoice.created", "invoice.send") and wh_event in ("invoice.created", "invoice.send")) or
            (target_event in ("team.invited", "member.invited") and wh_event in ("team.invited", "member.invited", "team.invite", "team.invitation"))
        )
        
        if is_match:
            try:
                print(f"[WEBHOOK] Dispatching '{event_type}' to {wh.url}...")
                resp = requests.post(wh.url, json={"event": event_type, "data": payload}, timeout=6)
                print(f"[WEBHOOK] {wh.url} responded with status {resp.status_code}")
            except Exception as e:
                print(f"[WEBHOOK ERROR] {wh.url} failed: {e}")
def check_role(user,allowed_roles:list[str]):
    if user.role not in allowed_roles:
        raise Exception(f"Permission denied: Action requires {allowed_roles}, but your role is '{user.role}'")

def generate_portal_invoice_pdf(token: str, invoice_id: int, info: strawberry.Info) -> str:
    db = info.context["db"]
    client = db.query(models.Client).filter(models.Client.portal_token == token).first()
    if not client:
        raise Exception("Invalid portal token")
    
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.client_id == client.id
    ).first()
    if not invoice:
        raise Exception("Invoice not found")
    
    project = db.query(models.Project).get(invoice.project_id) if invoice.project_id else None
    line_items = db.query(models.InvoiceLineItem).filter(models.InvoiceLineItem.invoice_id == invoice.id).all()
    org = db.query(models.Organization).get(client.organization_id)
    user = db.query(models.User).filter(models.User.organization_id == client.organization_id).first()
    
    currency_symbol = '$'
    if user:
        if user.currency_preference == 'EUR': currency_symbol = '€'
        elif user.currency_preference == 'GBP': currency_symbol = '£'
        elif user.currency_preference == 'INR': currency_symbol = 'Rs. '

    return render_invoice_pdf(invoice, client, project, line_items, org, currency_symbol)


def generate_portal_proposal_pdf(token: str, proposal_id: int, info: strawberry.Info) -> str:
    db = info.context["db"]
    client = db.query(models.Client).filter(models.Client.portal_token == token).first()
    if not client:
        raise Exception("Invalid portal token")
    
    proposal = db.query(models.Proposal).filter(
        models.Proposal.id == proposal_id,
        models.Proposal.client_id == client.id
    ).first()
    if not proposal:
        raise Exception("Proposal not found")
        
    line_items = db.query(models.ProposalLineItem).filter(models.ProposalLineItem.proposal_id == proposal.id).all()
    org = db.query(models.Organization).get(client.organization_id)
    user = db.query(models.User).filter(models.User.organization_id == client.organization_id).first()
    
    currency_symbol = '$'
    if user:
        if user.currency_preference == 'EUR': currency_symbol = '€'
        elif user.currency_preference == 'GBP': currency_symbol = '£'
        elif user.currency_preference == 'INR': currency_symbol = 'Rs. '
        
    return generate_proposal_pdf(proposal, line_items, client, currency_symbol, org)


def respond_to_proposal_resolver(token: str, proposal_id: int, accept: bool, info: strawberry.Info):
    db = info.context["db"]
    client = db.query(models.Client).filter(models.Client.portal_token == token).first()
    if not client:
        raise Exception("Invalid portal token")
    
    proposal = db.query(models.Proposal).filter(
        models.Proposal.id == proposal_id,
        models.Proposal.client_id == client.id
    ).first()
    if not proposal:
        raise Exception("Proposal not found")
    
    new_status = "Accepted" if accept else "Declined"
    proposal.status = new_status
    db.commit()
    db.refresh(proposal)
    
    owner = db.query(models.User).filter(models.User.organization_id == client.organization_id).first()
    owner_id = owner.id if owner else None
    create_activity_log(db, client.organization_id, owner_id, f"Client {new_status.lower()} proposal", f"{proposal.title} ({client.name})")
    
    event = "proposal.accepted" if accept else "proposal.declined"
    trigger_webhooks(db, client.organization_id, event, {
        "proposal_id": proposal.id,
        "title": proposal.title,
        "status": proposal.status,
        "client_name": client.name,
        "client_email": client.email
    })
    
    return proposal
