import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    hourly_rate = Column(Float, default=0.0)
    
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    organization = relationship("Organization", back_populates="projects")
    
    client = relationship("Client", back_populates="projects")
    invoices = relationship("Invoice", back_populates="project")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, index=True, nullable=False)
    status = Column(String, default="todo") # todo, in_progress, done
    priority = Column(String, default="Medium") # High, Medium, Low
    issue_type = Column(String, default="Task") # Bug, Feature, Task
    description = Column(String, nullable=True)
    time_logged_minutes = Column(Integer, default=0)
    due_date = Column(String, nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    organization = relationship("Organization", back_populates="tasks")
    
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User")
    time_logs = relationship("TimeLog", back_populates="task", cascade="all, delete-orphan")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")

class Subtask(Base):
    __tablename__ = "subtasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    
    task = relationship("Task", back_populates="subtasks")

class TaskComment(Base):
    __tablename__ = "task_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    task = relationship("Task", back_populates="comments")
    user = relationship("User")
