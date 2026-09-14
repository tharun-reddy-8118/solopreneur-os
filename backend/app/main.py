import os
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from strawberry.fastapi import GraphQLRouter
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import engine, get_db
import app.models as models
from app.core import security
from app.api.deps import get_graphql_context
from app.api.v1.graphql.schema import schema

# Ensure tables are initialized
models.Base.metadata.create_all(bind=engine)

# Safe column migration for users table
import sqlalchemy as sa
with engine.connect() as _conn:
    try:
        _conn.execute(sa.text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0"))
        _conn.commit()
    except Exception:
        pass

# App factory
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Enterprise Multi-Tenant Operating System API"
)

# Static directory for generated invoices and media
os.makedirs(settings.STATIC_DIR, exist_ok=True)

import re
from fastapi.responses import FileResponse

@app.get("/static/{filename}", tags=["Media"])
def get_static_pdf(filename: str, db: Session = Depends(get_db)):
    file_path = os.path.join(settings.STATIC_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="application/pdf" if filename.endswith(".pdf") else None)

    # 1. Dynamic Proposal PDF on-demand generator
    match_prop = re.match(r"^Proposal_(\d+)_(.+)\.pdf$", filename, re.IGNORECASE)
    if match_prop:
        prop_id = int(match_prop.group(1))
        proposal = db.query(models.Proposal).filter(models.Proposal.id == prop_id).first()
        if proposal:
            client = db.query(models.Client).get(proposal.client_id)
            org = db.query(models.Organization).get(proposal.organization_id)
            line_items = db.query(models.ProposalLineItem).filter(models.ProposalLineItem.proposal_id == proposal.id).all()
            from app.services.pdf import render_proposal_pdf
            currency_symbol = '$'
            owner = db.query(models.User).filter(models.User.organization_id == proposal.organization_id).first()
            if owner and getattr(owner, "currency_preference", None) == 'INR': currency_symbol = 'Rs. '
            elif owner and getattr(owner, "currency_preference", None) == 'EUR': currency_symbol = '€'
            elif owner and getattr(owner, "currency_preference", None) == 'GBP': currency_symbol = '£'
            render_proposal_pdf(proposal, client, line_items, org, currency_symbol)
            if os.path.exists(file_path):
                return FileResponse(file_path, media_type="application/pdf")
            alt1 = os.path.join(settings.STATIC_DIR, f"Proposal_{prop_id:04d}_{client.name.replace(' ', '_')}.pdf") if client else None
            if alt1 and os.path.exists(alt1):
                return FileResponse(alt1, media_type="application/pdf")
            alt2 = os.path.join(settings.STATIC_DIR, f"Proposal_{prop_id}_{client.name.replace(' ', '_')}.pdf") if client else None
            if alt2 and os.path.exists(alt2):
                return FileResponse(alt2, media_type="application/pdf")

    # 2. Dynamic Invoice PDF on-demand generator
    match_inv = re.match(r"^Invoice_(\d+)_(.+)\.pdf$", filename, re.IGNORECASE)
    if match_inv:
        inv_id = int(match_inv.group(1))
        invoice = db.query(models.Invoice).filter(models.Invoice.id == inv_id).first()
        if invoice:
            client = db.query(models.Client).get(invoice.client_id)
            project = db.query(models.Project).get(invoice.project_id) if invoice.project_id else None
            org = db.query(models.Organization).get(invoice.organization_id)
            line_items = db.query(models.InvoiceLineItem).filter(models.InvoiceLineItem.invoice_id == invoice.id).all()
            from app.services.pdf import render_invoice_pdf
            currency_symbol = '$'
            owner = db.query(models.User).filter(models.User.organization_id == invoice.organization_id).first()
            if owner and getattr(owner, "currency_preference", None) == 'INR': currency_symbol = 'Rs. '
            elif owner and getattr(owner, "currency_preference", None) == 'EUR': currency_symbol = '€'
            elif owner and getattr(owner, "currency_preference", None) == 'GBP': currency_symbol = '£'
            render_invoice_pdf(invoice, client, project, line_items, org, currency_symbol)
            if os.path.exists(file_path):
                return FileResponse(file_path, media_type="application/pdf")
            alt1 = os.path.join(settings.STATIC_DIR, f"Invoice_{inv_id:04d}_{client.name.replace(' ', '_')}.pdf") if client else None
            if alt1 and os.path.exists(alt1):
                return FileResponse(alt1, media_type="application/pdf")
            alt2 = os.path.join(settings.STATIC_DIR, f"Invoice_{inv_id}_{client.name.replace(' ', '_')}.pdf") if client else None
            if alt2 and os.path.exists(alt2):
                return FileResponse(alt2, media_type="application/pdf")

    raise HTTPException(status_code=404, detail="File not found")

app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Production CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GraphQL Transport
graphql_app = GraphQLRouter(schema, context_getter=get_graphql_context)
app.include_router(graphql_app, prefix="/graphql")

# Health check
@app.get("/health", tags=["System"])
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME, "version": "2.0.0"}

# REST Authentication endpoints
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    org_name: str = "My Workspace"

@app.post("/register", tags=["Auth"])
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    org = models.Organization(name=user.org_name)
    db.add(org)
    db.commit()
    db.refresh(org)

    hashed_password = security.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        name=user.name,
        organization_id=org.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = security.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", tags=["Auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
