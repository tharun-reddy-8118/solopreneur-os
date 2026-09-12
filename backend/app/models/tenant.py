import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Organization(Base):
    """
    Enterprise Tenant model (Organization).
    Every tenant has isolated users, clients, projects, billing, and settings.
    """
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    slug= Column(String(100), index=True, nullable=False,unique=True)
    brand_color = Column(String, default="#4f46e5")
    logo_url = Column(String, nullable=True)
    
    # Enterprise Legal & Compliance
    legal_name = Column(String, nullable=True)
    business_number = Column(String, nullable=True) # CRN / CIN / LLC Registration Number
    tax_id = Column(String, nullable=True) # VAT / GSTIN / EIN
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    support_email = Column(String, nullable=True)
    security_email = Column(String, nullable=True) # SOC2 / GDPR security contact
    
    # Registered Office Address
    billing_address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="organization", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="organization", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="organization", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="organization", cascade="all, delete-orphan")
    time_logs = relationship("TimeLog", back_populates="organization", cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="organization", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="organization", cascade="all, delete-orphan")
