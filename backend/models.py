from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand_color = Column(String, default="#4f46e5")
    logo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    users = relationship("User", back_populates="organization")
    clients = relationship("Client", back_populates="organization")
    projects = relationship("Project", back_populates="organization")
    invoices = relationship("Invoice", back_populates="organization")
    tasks = relationship("Task", back_populates="organization")
    activity_logs = relationship("ActivityLog", back_populates="organization")
    time_logs = relationship("TimeLog", back_populates="organization")
    proposals = relationship("Proposal", back_populates="organization")
    expenses = relationship("Expense", back_populates="organization")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    currency_preference = Column(String, default="USD")
    role=Column(String,default="Admin")
    
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    organization = relationship("Organization", back_populates="users")
    
    # Keeping user back_populates for ActivityLog to track exactly who did what
    activity_logs = relationship("ActivityLog", back_populates="user")
    time_logs = relationship("TimeLog", back_populates="user")


class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String)
    portal_token = Column(String, unique=True, index=True, nullable=True)
    
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    
    organization = relationship("Organization", back_populates="clients")
    projects = relationship("Project", back_populates="client")
    invoices = relationship("Invoice", back_populates="client")
    proposals = relationship("Proposal", back_populates="client")


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    name = Column(String, index=True)
    description = Column(String)
    hourly_rate = Column(Float, default=0.0)
    
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    organization = relationship("Organization", back_populates="projects")
    
    client = relationship("Client", back_populates="projects")
    invoices = relationship("Invoice", back_populates="project")
    tasks = relationship("Task", back_populates="project")


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    amount = Column(Float, default=0.0) # Will be dynamically updated based on line items
    status = Column(String, default="Pending") # Pending, Paid, Overdue
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())
    
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    organization = relationship("Organization", back_populates="invoices")
    
    client = relationship("Client", back_populates="invoices")
    project = relationship("Project", back_populates="invoices")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    description = Column(String)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    
    invoice = relationship("Invoice", back_populates="line_items")


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String, index=True)
    status = Column(String, default="todo") # todo, in_progress, done
    priority = Column(String, default="Medium") # High, Medium, Low
    issue_type = Column(String, default="Task") # Bug, Feature, Task
    description = Column(String, nullable=True) # Rich text / markdown
    time_logged_minutes = Column(Integer, default=0)
    due_date = Column(String, nullable=True) # ISO Date string
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    organization = relationship("Organization", back_populates="tasks")
    
    project = relationship("Project", back_populates="tasks")
    time_logs = relationship("TimeLog", back_populates="task")
    assignee = relationship("User")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")

class Subtask(Base):
    __tablename__ = "subtasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    title = Column(String)
    is_completed = Column(Boolean, default=False)
    
    task = relationship("Task", back_populates="subtasks")

class TaskComment(Base):
    __tablename__ = "task_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    task = relationship("Task", back_populates="comments")
    user = relationship("User")


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    action = Column(String) # e.g. "created an invoice", "marked a task as done"
    target = Column(String) # e.g. "Invoice #1042", "Website Redesign"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization", back_populates="activity_logs")
    user = relationship("User", back_populates="activity_logs")

class TimeLog(Base):
    __tablename__ = "time_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    duration_minutes = Column(Integer)
    description = Column(String)
    is_billed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    
    task = relationship("Task", back_populates="time_logs")
    user = relationship("User", back_populates="time_logs")
    organization = relationship("Organization", back_populates="time_logs")

class Proposal(Base):
    __tablename__ = "proposals"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    title = Column(String)
    description = Column(String)
    status = Column(String, default="Draft")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    
    client = relationship("Client", back_populates="proposals")
    organization = relationship("Organization", back_populates="proposals")
    line_items = relationship("ProposalLineItem", back_populates="proposal")

class ProposalLineItem(Base):
    __tablename__ = "proposal_line_items"
    
    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id"))
    description = Column(String)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    
    proposal = relationship("Proposal", back_populates="line_items")

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, default=0.0)
    category = Column(String)
    description = Column(String)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    organization = relationship("Organization", back_populates="expenses")

class Webhook(Base):
    __tablename__ = "webhooks"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    url = Column(String)
    event_type = Column(String) # e.g. "invoice.paid", "task.done", "*"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    key = Column(String, unique=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
