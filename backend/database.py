import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

Base = declarative_base()

# Uses Postgres URL if present, otherwise fallback to local SQLite
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./solopreneur_v4.db")

# If using PostgreSQL, we don't need check_same_thread
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a SessionLocal class. Each instance will be a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Function to create tables
def init_db():
    import models
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
