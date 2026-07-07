from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from strawberry.fastapi import GraphQLRouter
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt

import models
from database import engine, get_db
from schema import schema
import auth

# Initialize DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SolopreneurOS API")
import os
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_context(request: Request, db: Session = Depends(get_db)):
    user = None
    auth_header = request.headers.get("Authorization")
    print(f"Auth Header: {auth_header}")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
            print(f"Payload: {payload}")
            email = payload.get("sub")
            if email:
                user = db.query(models.User).filter(models.User.email == email).first()
                print(f"User found: {user}")
        except JWTError as e:
            print(f"JWTError: {e}")
    return {"db": db, "user": user, "request": request}

graphql_app = GraphQLRouter(schema, context_getter=get_context)
app.include_router(graphql_app, prefix="/graphql")

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        name=user.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

