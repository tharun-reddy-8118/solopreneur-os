import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "SolopreneurOS Enterprise API"
    ENVIRONMENT: str = "production"
    
    DATABASE_URL: str = "sqlite:///./solopreneur_v4.db"
    
    SECRET_KEY: str = "super-secret-key-for-solopreneur-os"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    CORS_ORIGINS: List[str] = ["*"]
    
    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
    
    STATIC_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
