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

# App factory
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Enterprise Multi-Tenant Operating System API"
)

# Static directory for generated invoices and media
os.makedirs(settings.STATIC_DIR, exist_ok=True)
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
