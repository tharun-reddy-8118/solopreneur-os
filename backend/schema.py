import strawberry
import typing
from fastapi import HTTPException
import models
from database import get_db
from auth import verify_password, get_password_hash, create_access_token, get_current_user
import datetime
import base64
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from resolvers import (
    get_user_or_error,
    create_activity_log,
    resolve_project,
    resolve_client,
    resolve_user,
    resolve_projects_for_client,
    resolve_invoices_for_client,
    resolve_tasks_for_project,
    resolve_line_items_for_invoice,
    generate_invoice_pdf_resolver,
    resolve_team_members,
    invite_team_member_resolver,
    update_member_role_resolver,
    send_invoice_email,
    resolve_client_for_proposal,
    resolve_line_items_for_proposal,
    send_proposal_resolver,
    preview_proposal_resolver,
    resolve_assignee_for_task,
    resolve_subtasks_for_task,
    resolve_comments_for_task,
    trigger_webhooks
)







# --- Types ---

@strawberry.type
class UserType:
    id: int
    name: str
    email: str
    currency_preference: str
    organization_id: int
    role:str

@strawberry.type
class SubtaskType:
    id: int
    task_id: int
    title: str
    is_completed: bool

@strawberry.type
class TaskCommentType:
    id: int
    task_id: int
    user_id: int
    content: str
    created_at: str
    @strawberry.field
    def user(self, info: strawberry.Info) -> UserType:
        return resolve_user(self, info)

@strawberry.type
class TaskType:
    id: int
    title: str
    status: str
    priority: str
    issue_type: str
    description: str | None
    time_logged_minutes: int
    project_id: int
    due_date: str | None
    
    @strawberry.field
    def project(self, info: strawberry.Info) -> "ProjectType":
        return resolve_project(self, info)
    
    @strawberry.field
    def assignee(self, info: strawberry.Info) -> UserType | None:
        return resolve_assignee_for_task(self, info)
        
    @strawberry.field
    def subtasks(self, info: strawberry.Info) -> list[SubtaskType]:
        return resolve_subtasks_for_task(self, info)
        
    @strawberry.field
    def comments(self, info: strawberry.Info) -> list[TaskCommentType]:
        return resolve_comments_for_task(self, info)
    
@strawberry.type
class InvoiceLineItemType:
    id: int
    description: str
    quantity: float
    unit_price: float

@strawberry.input
class InvoiceLineItemInput:
    description: str
    quantity: float
    unit_price: float

@strawberry.type
class InvoiceType:
    id: int
    amount: float
    status: str
    created_at: str
    @strawberry.field
    def client(self, info: strawberry.Info) -> "ClientType":
        return resolve_client(self, info)
    @strawberry.field
    def project(self, info: strawberry.Info) -> "ProjectType":
        return resolve_project(self, info)
    @strawberry.field
    def line_items(self, info: strawberry.Info) -> typing.List[InvoiceLineItemType]:
        return resolve_line_items_for_invoice(self, info)

@strawberry.type
class TimeLogType:
    id: int
    task_id: int
    user_id: int
    duration_minutes: int
    description: str
    is_billed: bool
    created_at: str
    task: "TaskType"
    user: "UserType"

@strawberry.input
class ProposalLineItemInput:
    description: str
    quantity: float
    unit_price: float

@strawberry.type
class ProposalLineItemType:
    id: int
    description: str
    quantity: float
    unit_price: float

@strawberry.type
class ProposalType:
    id: int
    client_id: int
    title: str
    description: str
    status: str
    created_at: str
    
    @strawberry.field
    def client(self, info: strawberry.Info) -> "ClientType":
        return resolve_client_for_proposal(self, info)
        
    @strawberry.field
    def line_items(self, info: strawberry.Info) -> list[ProposalLineItemType]:
        return resolve_line_items_for_proposal(self, info)

@strawberry.type
class ProjectType:
    id: int
    name: str
    description: str
    client_id: int
    hourly_rate: float
    @strawberry.field
    def client(self, info: strawberry.Info) -> "ClientType":
        return resolve_client(self, info)
    @strawberry.field
    def tasks(self, info: strawberry.Info) -> typing.List[TaskType]:
        return resolve_tasks_for_project(self, info)

@strawberry.type
class ClientType:
    id: int
    name: str
    email: str
    portal_token: str | None
    @strawberry.field
    def projects(self, info: strawberry.Info) -> typing.List[ProjectType]:
        return resolve_projects_for_client(self, info)
    @strawberry.field
    def invoices(self, info: strawberry.Info) -> typing.List[InvoiceType]:
        return resolve_invoices_for_client(self, info)

@strawberry.type
class ActivityLogType:
    id: int
    action: str
    target: str
    created_at: str
    @strawberry.field
    def user(self, info: strawberry.Info) -> UserType:
        return resolve_user(self, info)

@strawberry.type
class ExpenseType:
    id: int
    amount: float
    category: str
    description: str
    date: str

@strawberry.type
class OrganizationType:
    id: int
    name: str
    brand_color: str | None
    logo_url: str | None

@strawberry.type
class WebhookType:
    id: int
    url: str
    event_type: str
    is_active: bool

@strawberry.type
class ApiKeyType:
    id: int
    key: str
    name: str

@strawberry.type
class AuthPayload:
    access_token: str
    token_type: str

# --- Query ---

@strawberry.type
class ClientPortalDataType:
    client: ClientType
    organization: OrganizationType
    currency_preference: str

@strawberry.type
class Query:
    @strawberry.field
    def me(self, info: strawberry.Info) -> UserType:
        user = get_user_or_error(info)
        return user
        
    @strawberry.field
    def organization(self, info: strawberry.Info) -> OrganizationType:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.Organization).filter(models.Organization.id == user.organization_id).first()

    @strawberry.field
    def webhooks(self, info: strawberry.Info) -> list[WebhookType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.Webhook).filter(models.Webhook.organization_id == user.organization_id).all()

    @strawberry.field
    def api_keys(self, info: strawberry.Info) -> list[ApiKeyType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.ApiKey).filter(models.ApiKey.organization_id == user.organization_id).all()

    @strawberry.field
    def client_portal_data(self, token: str, info: strawberry.Info) -> ClientPortalDataType:
        db = info.context["db"]
        client = db.query(models.Client).filter(models.Client.portal_token == token).first()
        if not client:
            raise Exception("Invalid or expired portal token")
        org = db.query(models.Organization).filter(models.Organization.id == client.organization_id).first()
        admin_user = db.query(models.User).filter(models.User.organization_id == org.id, models.User.role == "Admin").first()
        currency = admin_user.currency_preference if admin_user else "INR"
        return ClientPortalDataType(client=client, organization=org, currency_preference=currency)
        
    @strawberry.field
    def clients(self, info: strawberry.Info) -> typing.List[ClientType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.Client).filter(models.Client.organization_id == user.organization_id).all()

    @strawberry.field
    def projects(self, info: strawberry.Info) -> list[ProjectType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.Project).filter(models.Project.organization_id == user.organization_id).all()
        
    @strawberry.field
    def time_logs_for_project(self, project_id: int, info: strawberry.Info) -> list[TimeLogType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        # Find all tasks for this project, then get their time logs
        tasks = db.query(models.Task).filter(models.Task.project_id == project_id, models.Task.organization_id == user.organization_id).all()
        task_ids = [t.id for t in tasks]
        return db.query(models.TimeLog).filter(models.TimeLog.task_id.in_(task_ids)).order_by(models.TimeLog.created_at.desc()).all()
        
    @strawberry.field
    def recent_time_logs(self, info: strawberry.Info) -> list[TimeLogType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.TimeLog).filter(models.TimeLog.organization_id == user.organization_id).order_by(models.TimeLog.created_at.desc()).limit(50).all()

    @strawberry.field
    def proposals(self, info: strawberry.Info) -> list[ProposalType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.Proposal).filter(models.Proposal.organization_id == user.organization_id).order_by(models.Proposal.created_at.desc()).all()
        
    @strawberry.field
    def expenses(self, info: strawberry.Info) -> list[ExpenseType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.Expense).filter(models.Expense.organization_id == user.organization_id).order_by(models.Expense.date.desc()).all()
        
    @strawberry.field
    def project(self, id: int, info: strawberry.Info) -> ProjectType:
        user = get_user_or_error(info)
        db = info.context["db"]
        p = db.query(models.Project).filter(models.Project.id == id, models.Project.organization_id == user.organization_id).first()
        if not p:
            raise Exception("Project not found")
        return p

    @strawberry.field
    def invoices(self, info: strawberry.Info) -> typing.List[InvoiceType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.Invoice).filter(models.Invoice.organization_id == user.organization_id).all()
        
    @strawberry.field
    def recent_activity(self, limit: int = 10, info: strawberry.Info = None) -> typing.List[ActivityLogType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        return db.query(models.ActivityLog).filter(models.ActivityLog.organization_id == user.organization_id).order_by(models.ActivityLog.created_at.desc()).limit(limit).all()

    @strawberry.field
    def invoice_pdf(self,id:int,info:strawberry.Info)->str:
        return generate_invoice_pdf_resolver(id,info)

    @strawberry.field
    def team_members(self, info: strawberry.Info) -> typing.List[UserType]:
        return resolve_team_members(info)
   

# --- Mutation ---

@strawberry.type
class Mutation:
    @strawberry.mutation
    def register(self, email: str, password: str, name: str, org_name: str, info: strawberry.Info) -> AuthPayload:
        db = info.context["db"]
        if db.query(models.User).filter(models.User.email == email).first():
            raise Exception("Email already registered")
        
        # Create Organization
        org = models.Organization(name=org_name)
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Create User
        hashed_password = get_password_hash(password)
        new_user = models.User(email=email, hashed_password=hashed_password, name=name, organization_id=org.id)
        db.add(new_user)
        db.commit()
        
        access_token = create_access_token(data={"sub": new_user.email})
        return AuthPayload(access_token=access_token, token_type="bearer")

    @strawberry.mutation
    def login(self, email: str, password: str, info: strawberry.Info) -> AuthPayload:
        db = info.context["db"]
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user or not verify_password(password, user.hashed_password):
            raise Exception("Incorrect email or password")
        
        access_token = create_access_token(data={"sub": user.email})
        return AuthPayload(access_token=access_token, token_type="bearer")

    @strawberry.mutation
    def update_profile(self, name: str, currency_preference: str, info: strawberry.Info) -> UserType:
        user = get_user_or_error(info)
        db = info.context["db"]
        user.name = name
        user.currency_preference = currency_preference
        db.commit()
        db.refresh(user)
        create_activity_log(db, user.organization_id, user.id, "updated profile settings", f"{name}")
        return user

    @strawberry.mutation
    def add_client(self, name: str, email: str, info: strawberry.Info) -> ClientType:
        user = get_user_or_error(info)
        db = info.context["db"]
        import uuid
        token = str(uuid.uuid4()).replace("-", "")
        new_client = models.Client(name=name, email=email, portal_token=token, organization_id=user.organization_id)
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
        create_activity_log(db, user.organization_id, user.id, "added a new client", name)
        return new_client

    @strawberry.mutation
    def add_project(self, name: str, client_id: int, description: str, hourly_rate: float = 0.0, info: strawberry.Info = None) -> ProjectType:
        user = get_user_or_error(info)
        db = info.context["db"]
        new_project = models.Project(name=name, client_id=client_id, description=description, hourly_rate=hourly_rate, organization_id=user.organization_id)
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
        client = db.query(models.Client).get(client_id)
        create_activity_log(db, user.organization_id, user.id, "created a new project", f"for {client.name}")
        return new_project

    @strawberry.mutation
    def update_project(self, project_id: int, hourly_rate: float, info: strawberry.Info = None) -> ProjectType:
        user = get_user_or_error(info)
        db = info.context["db"]
        project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.organization_id == user.organization_id).first()
        if not project:
            raise Exception("Project not found")
        project.hourly_rate = hourly_rate
        db.commit()
        db.refresh(project)
        return project

    @strawberry.mutation
    def invite_team_member(self, email: str, name: str, role: str, info: strawberry.Info) -> UserType:
        return invite_team_member_resolver(email, name, role, info)
        
    @strawberry.mutation
    def update_member_role(self, user_id: int, role: str, info: strawberry.Info) -> UserType:
        return update_member_role_resolver(user_id, role, info)
    @strawberry.mutation
    def add_invoice(self, client_id: int, project_id: int, line_items: typing.List[InvoiceLineItemInput], status: str, info: strawberry.Info) -> InvoiceType:
        user = get_user_or_error(info)
        db = info.context["db"]
        
        amount = sum(item.quantity * item.unit_price for item in line_items)
        
        new_invoice = models.Invoice(client_id=client_id, project_id=project_id, amount=amount, status=status, organization_id=user.organization_id)
        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)
        
        for item in line_items:
            li = models.InvoiceLineItem(invoice_id=new_invoice.id, description=item.description, quantity=item.quantity, unit_price=item.unit_price)
            db.add(li)
            
        db.commit()
        
        create_activity_log(db, user.organization_id, user.id, "created an invoice", f"INV-{new_invoice.id}")
        trigger_webhooks(db, user.organization_id, "invoice.created", {"invoice_id": new_invoice.id, "amount": new_invoice.amount})
        
        client = db.query(models.Client).get(client_id)
        if client and client.email:
            currency_symbol = '$'
            if user.currency_preference == 'EUR': currency_symbol = '€'
            elif user.currency_preference == 'GBP': currency_symbol = '£'
            elif user.currency_preference == 'INR': currency_symbol = 'Rs. '
            
            pdf_url = generate_invoice_pdf_resolver(new_invoice.id, info)
            send_invoice_email(client.email, client.name, new_invoice.id, pdf_url, new_invoice.amount, currency_symbol)
            
        create_activity_log(db, user.organization_id, user.id, "generated an invoice", f"for {client.name}")
        return new_invoice
        
    @strawberry.mutation
    def update_invoice(self, invoice_id: int, status: str, info: strawberry.Info) -> InvoiceType:
        user = get_user_or_error(info)
        db = info.context["db"]
        invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.organization_id == user.organization_id).first()
        if not invoice:
            raise Exception("Invoice not found")
        invoice.status = status
        db.commit()
        db.refresh(invoice)
        create_activity_log(db, user.organization_id, user.id, f"marked invoice #{invoice.id} as", status)
        return invoice

    @strawberry.mutation
    def add_task(self, project_id: int, title: str, status: str, time_logged_minutes: int = 0, priority: str = "Medium", issue_type: str = "Task", description: str | None = None, info: strawberry.Info = None) -> TaskType:
        user = get_user_or_error(info)
        db = info.context["db"]
        new_task = models.Task(
            project_id=project_id, 
            title=title, 
            status=status, 
            time_logged_minutes=time_logged_minutes, 
            priority=priority,
            issue_type=issue_type,
            description=description,
            organization_id=user.organization_id
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        project = db.query(models.Project).get(project_id)
        create_activity_log(db, user.organization_id, user.id, "added a new task", f"to {project.name}")
        return new_task

    @strawberry.mutation
    def update_profile(self, name: str, currency_preference: str, info: strawberry.Info) -> UserType:
        user = get_user_or_error(info)
        db = info.context["db"]
        
        db_user = db.query(models.User).filter(models.User.id == user.id).first()
        if db_user:
            db_user.name = name
            db_user.currency_preference = currency_preference
            db.commit()
            db.refresh(db_user)
            create_activity_log(db, user.organization_id, user.id, "updated their profile", "Settings")
            
        return db_user

    @strawberry.mutation
    def update_task_details(self, task_id: int, due_date: str | None = None, assignee_id: int | None = None, info: strawberry.Info = None) -> TaskType:
        user = get_user_or_error(info)
        db = info.context["db"]
        task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.organization_id == user.organization_id).first()
        if not task: raise Exception("Task not found")
        if due_date is not None:
            task.due_date = due_date
        if assignee_id is not None:
            if assignee_id == 0: task.assignee_id = None
            else: task.assignee_id = assignee_id
        db.commit()
        db.refresh(task)
        trigger_webhooks(db, user.organization_id, "task.updated", {"task_id": task.id, "status": task.status})
        return task

    @strawberry.mutation
    def add_subtask(self, task_id: int, title: str, info: strawberry.Info) -> SubtaskType:
        user = get_user_or_error(info)
        db = info.context["db"]
        # verifying task belongs to user org
        task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.organization_id == user.organization_id).first()
        if not task: raise Exception("Task not found")
        st = models.Subtask(task_id=task_id, title=title)
        db.add(st)
        db.commit()
        db.refresh(st)
        return st

    @strawberry.mutation
    def toggle_subtask(self, subtask_id: int, is_completed: bool, info: strawberry.Info) -> SubtaskType:
        user = get_user_or_error(info)
        db = info.context["db"]
        st = db.query(models.Subtask).filter(models.Subtask.id == subtask_id).first()
        if not st: raise Exception("Subtask not found")
        st.is_completed = is_completed
        db.commit()
        db.refresh(st)
        return st

    @strawberry.mutation
    def delete_subtask(self, subtask_id: int, info: strawberry.Info) -> bool:
        user = get_user_or_error(info)
        db = info.context["db"]
        st = db.query(models.Subtask).filter(models.Subtask.id == subtask_id).first()
        if st:
            db.delete(st)
            db.commit()
        return True

    @strawberry.mutation
    def add_task_comment(self, task_id: int, content: str, info: strawberry.Info) -> TaskCommentType:
        user = get_user_or_error(info)
        db = info.context["db"]
        task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.organization_id == user.organization_id).first()
        if not task: raise Exception("Task not found")
        comment = models.TaskComment(task_id=task_id, user_id=user.id, content=content)
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return comment

    @strawberry.mutation
    def update_task(self, task_id: int, status: str | None = None, priority: str | None = None, issue_type: str | None = None, description: str | None = None, time_logged_minutes: int | None = None, info: strawberry.Info = None) -> TaskType:
        user = get_user_or_error(info)
        db = info.context["db"]
        task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.organization_id == user.organization_id).first()
        if not task:
            raise Exception("Task not found")
            
        old_status = task.status
        if status is not None: task.status = status
        if priority is not None: task.priority = priority
        if issue_type is not None: task.issue_type = issue_type
        if description is not None: task.description = description
        if time_logged_minutes is not None: task.time_logged_minutes = time_logged_minutes
        
        db.commit()
        db.refresh(task)
        if old_status != task.status:
            create_activity_log(db, user.organization_id, user.id, "moved a task to", task.status)
        return task

    @strawberry.mutation
    def add_time_log(self, task_id: int, duration_minutes: int, description: str, info: strawberry.Info = None) -> TimeLogType:
        user = get_user_or_error(info)
        db = info.context["db"]
        
        task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.organization_id == user.organization_id).first()
        if not task:
            raise Exception("Task not found")
            
        time_log = models.TimeLog(
            task_id=task_id,
            user_id=user.id,
            duration_minutes=duration_minutes,
            description=description,
            organization_id=user.organization_id
        )
        db.add(time_log)
        
        # Also update the task's total time_logged_minutes
        task.time_logged_minutes += duration_minutes
        
        db.commit()
        db.refresh(time_log)
        create_activity_log(db, user.organization_id, user.id, "logged time", f"on {task.title}")
        return time_log
        
    @strawberry.mutation
    def generate_invoice_from_time(self, project_id: int, info: strawberry.Info = None) -> InvoiceType:
        user = get_user_or_error(info)
        db = info.context["db"]
        
        project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.organization_id == user.organization_id).first()
        if not project:
            raise Exception("Project not found")
            
        if project.hourly_rate <= 0:
            raise Exception("Please set an hourly rate for this project first.")
            
        # Get all tasks for this project
        tasks = db.query(models.Task).filter(models.Task.project_id == project_id).all()
        task_ids = [t.id for t in tasks]
        
        # Get all unbilled time logs for these tasks
        unbilled_logs = db.query(models.TimeLog).filter(
            models.TimeLog.task_id.in_(task_ids), 
            models.TimeLog.is_billed == False
        ).all()
        
        if not unbilled_logs:
            raise Exception("No unbilled time found for this project.")
            
        # Create invoice
        new_invoice = models.Invoice(
            client_id=project.client_id, 
            project_id=project.id, 
            organization_id=user.organization_id,
            amount=0
        )
        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)
        
        total_amount = 0
        rate_per_minute = project.hourly_rate / 60.0
        
        for log in unbilled_logs:
            cost = log.duration_minutes * rate_per_minute
            line_item = models.InvoiceLineItem(
                invoice_id=new_invoice.id,
                description=f"{log.description} ({log.duration_minutes} mins)",
                quantity=1.0,
                unit_price=cost
            )
            db.add(line_item)
            total_amount += cost
            
            # Mark log as billed
            log.is_billed = True
            
        new_invoice.amount = total_amount
        db.commit()
        db.refresh(new_invoice)
        
        create_activity_log(db, user.organization_id, user.id, "generated invoice from time", f"for {project.name}")
        return new_invoice

    @strawberry.mutation
    def add_proposal(self, client_id: int, title: str, description: str, line_items: list[ProposalLineItemInput], info: strawberry.Info = None) -> ProposalType:
        user = get_user_or_error(info)
        db = info.context["db"]
        
        proposal = models.Proposal(
            client_id=client_id,
            title=title,
            description=description,
            organization_id=user.organization_id
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        
        for item in line_items:
            db.add(models.ProposalLineItem(
                proposal_id=proposal.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price
            ))
            
        db.commit()
        create_activity_log(db, user.organization_id, user.id, "created proposal", title)
        return proposal
        
    @strawberry.mutation
    def update_proposal(self, proposal_id: int, title: str, description: str, line_items: list[ProposalLineItemInput], info: strawberry.Info = None) -> ProposalType:
        user = get_user_or_error(info)
        db = info.context["db"]
        
        proposal = db.query(models.Proposal).filter(models.Proposal.id == proposal_id, models.Proposal.organization_id == user.organization_id).first()
        if not proposal:
            raise Exception("Proposal not found")
            
        proposal.title = title
        proposal.description = description
        
        db.query(models.ProposalLineItem).filter(models.ProposalLineItem.proposal_id == proposal.id).delete()
        
        for item in line_items:
            db.add(models.ProposalLineItem(
                proposal_id=proposal.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price
            ))
            
        db.commit()
        db.refresh(proposal)
        create_activity_log(db, user.organization_id, user.id, "updated proposal", title)
        return proposal
        
    @strawberry.mutation
    def preview_proposal(self, proposal_id: int, info: strawberry.Info = None) -> str:
        return preview_proposal_resolver(proposal_id, info)
        
    @strawberry.mutation
    def send_proposal(self, proposal_id: int, info: strawberry.Info = None) -> str:
        return send_proposal_resolver(proposal_id, info)
        
    @strawberry.mutation
    def convert_proposal_to_project(self, proposal_id: int, info: strawberry.Info = None) -> ProjectType:
        user = get_user_or_error(info)
        db = info.context["db"]
        
        proposal = db.query(models.Proposal).filter(models.Proposal.id == proposal_id, models.Proposal.organization_id == user.organization_id).first()
        if not proposal:
            raise Exception("Proposal not found")
            
        proposal.status = "Accepted"
        
        new_project = models.Project(
            client_id=proposal.client_id,
            name=proposal.title,
            description=proposal.description,
            hourly_rate=0.0,
            organization_id=user.organization_id
        )
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
        
        create_activity_log(db, user.organization_id, user.id, "converted proposal to project", proposal.title)
        return new_project
        
    @strawberry.mutation
    def add_expense(self, amount: float, category: str, description: str, date: str, info: strawberry.Info = None) -> ExpenseType:
        user = get_user_or_error(info)
        db = info.context["db"]
        import datetime
        try:
            parsed_date = datetime.datetime.strptime(date, "%Y-%m-%d")
        except:
            parsed_date = datetime.datetime.utcnow()
            
        expense = models.Expense(
            amount=amount,
            category=category,
            description=description,
            date=parsed_date,
            organization_id=user.organization_id
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)
        create_activity_log(db, user.organization_id, user.id, "logged expense", f"{category} - {amount}")
        return expense
        
    @strawberry.mutation
    def delete_expense(self, expense_id: int, info: strawberry.Info = None) -> bool:
        user = get_user_or_error(info)
        db = info.context["db"]
        expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.organization_id == user.organization_id).first()
        if not expense:
            raise Exception("Expense not found")
        db.delete(expense)
        db.commit()
        create_activity_log(db, user.organization_id, user.id, "deleted expense", "")
        return True

    @strawberry.mutation
    def update_organization_branding(self, brand_color: str, logo_url: str, info: strawberry.Info) -> OrganizationType:
        user = get_user_or_error(info)
        db = info.context["db"]
        org = db.query(models.Organization).filter(models.Organization.id == user.organization_id).first()
        org.brand_color = brand_color
        org.logo_url = logo_url if logo_url else None
        db.commit()
        db.refresh(org)
        return org

    @strawberry.mutation
    def generate_api_key(self, name: str, info: strawberry.Info) -> ApiKeyType:
        user = get_user_or_error(info)
        db = info.context["db"]
        import secrets
        key = "sk_" + secrets.token_urlsafe(32)
        new_key = models.ApiKey(key=key, name=name, organization_id=user.organization_id)
        db.add(new_key)
        db.commit()
        db.refresh(new_key)
        return new_key

    @strawberry.mutation
    def revoke_api_key(self, key_id: int, info: strawberry.Info) -> bool:
        user = get_user_or_error(info)
        db = info.context["db"]
        key = db.query(models.ApiKey).filter(models.ApiKey.id == key_id, models.ApiKey.organization_id == user.organization_id).first()
        if key:
            db.delete(key)
            db.commit()
        return True

    @strawberry.mutation
    def add_webhook(self, url: str, event_type: str, info: strawberry.Info) -> WebhookType:
        user = get_user_or_error(info)
        db = info.context["db"]
        new_hook = models.Webhook(url=url, event_type=event_type, organization_id=user.organization_id)
        db.add(new_hook)
        db.commit()
        db.refresh(new_hook)
        return new_hook

    @strawberry.mutation
    def delete_webhook(self, webhook_id: int, info: strawberry.Info) -> bool:
        user = get_user_or_error(info)
        db = info.context["db"]
        hook = db.query(models.Webhook).filter(models.Webhook.id == webhook_id, models.Webhook.organization_id == user.organization_id).first()
        if hook:
            db.delete(hook)
            db.commit()
        return True

schema = strawberry.Schema(query=Query, mutation=Mutation)
