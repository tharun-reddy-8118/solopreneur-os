import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    amount = Column(Float, default=0.0)
    status = Column(String, default="Pending") # Pending, Paid, Overdue, Draft
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())
    
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    organization = relationship("Organization", back_populates="invoices")
    
    client = relationship("Client", back_populates="invoices")
    project = relationship("Project", back_populates="invoices")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String, nullable=False)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    
    invoice = relationship("Invoice", back_populates="line_items")

class Proposal(Base):
    __tablename__ = "proposals"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="Draft") # Draft, Sent, Accepted, Declined
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    organization = relationship("Organization", back_populates="proposals")
    
    client = relationship("Client", back_populates="proposals")
    line_items = relationship("ProposalLineItem", back_populates="proposal", cascade="all, delete-orphan")

class ProposalLineItem(Base):
    __tablename__ = "proposal_line_items"
    
    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String, nullable=False)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    
    proposal = relationship("Proposal", back_populates="line_items")
