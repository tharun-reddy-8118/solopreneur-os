from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Client(Base):
    """
    Client CRM model scoped to each Tenant (Organization).
    """
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    contact_person = Column(String, nullable=True)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    tax_id = Column(String, nullable=True) # VAT / GSTIN / EIN
    billing_address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    currency = Column(String, default="USD")
    payment_terms = Column(String, default="Net 30") # Net 15, Net 30, Due on Receipt
    client_tier = Column(String, default="Standard") # Standard, Enterprise, VIP
    notes = Column(Text, nullable=True)
    portal_token = Column(String, unique=True, index=True, nullable=True)
    
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    organization = relationship("Organization", back_populates="clients")
    
    projects = relationship("Project", back_populates="client", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="client", cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="client", cascade="all, delete-orphan")
