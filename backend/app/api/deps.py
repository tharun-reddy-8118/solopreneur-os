from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import get_db
import app.models as models

async def get_current_user_from_token(token: str, db: Session) -> models.User | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = str(payload.get("sub", ""))
        if sub:
            user = db.query(models.User).filter(models.User.email == sub).first()
            if not user and sub.isdigit():
                user = db.query(models.User).filter(models.User.id == int(sub)).first()
            return user
    except JWTError:
        return None
    return None

async def get_graphql_context(request: Request, db: Session = Depends(get_db)):
    """
    Supplies database session, authenticated user, and tenant info to GraphQL resolvers.
    """
    user = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        user = await get_current_user_from_token(token, db)
        
    return {
        "db": db, 
        "user": user, 
        "tenant_id": user.organization_id if user else None,
        "request": request
    }
