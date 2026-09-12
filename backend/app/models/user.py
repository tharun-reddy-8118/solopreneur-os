from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    """
    Tenant User model with Role-Based Access Control (Admin, Member, Contractor, Viewer).
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    currency_preference = Column(String, default="USD")
    role = Column(String, default="Admin") # Admin, Member, Contractor, Viewer
    
    # Enterprise Onboarding & OTP Verification
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_otp = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    organization = relationship("Organization", back_populates="users")
    
    activity_logs = relationship("ActivityLog", back_populates="user")
    time_logs = relationship("TimeLog", back_populates="user")
