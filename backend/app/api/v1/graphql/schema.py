import strawberry
import typing
from fastapi import HTTPException
import app.models as models
from app.core.database import get_db
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
import datetime
from app.api.v1.graphql.resolvers import (
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
    delete_team_member_resolver,
    send_invoice_email,
    resolve_client_for_proposal,
    resolve_line_items_for_proposal,
    send_proposal_resolver,
    preview_proposal_resolver,
    resolve_assignee_for_task,
    resolve_subtasks_for_task,
    resolve_comments_for_task,
    check_role,
    trigger_webhooks,
    resolve_proposals_for_client,
    generate_portal_invoice_pdf,
    generate_portal_proposal_pdf,
    respond_to_proposal_resolver,
    send_invoice_resolver,
    SYSTEM_WEBHOOK_URLS
)

# --- GraphQL Types ---

@strawberry.type
class UserType:
    id: int
    name: str
    email: str
    currency_preference: str
    organization_id: int
    role: str

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
    contact_person: str | None
    email: str
    phone: str | None
    website: str | None
    tax_id: str | None
    billing_address: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    country: str | None
    currency: str | None
    payment_terms: str | None
    client_tier: str | None
    notes: str | None
    portal_token: str | None
    @strawberry.field
    def projects(self, info: strawberry.Info) -> typing.List[ProjectType]:
        return resolve_projects_for_client(self, info)
    @strawberry.field
    def invoices(self, info: strawberry.Info) -> typing.List[InvoiceType]:
        return resolve_invoices_for_client(self, info)
    @strawberry.field
    def proposals(self, info: strawberry.Info) -> typing.List[ProposalType]:
        return resolve_proposals_for_client(self, info)

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
    slug: str | None
    brand_color: str | None
    logo_url: str | None
    legal_name: str | None
    business_number: str | None
    tax_id: str | None
    phone: str | None
    website: str | None
    support_email: str | None
    security_email: str | None
    billing_address: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    country: str | None

@strawberry.type
class WebhookType:
    id: int
    url: str
    event_type: str
    is_active: bool
    is_system: bool = False

@strawberry.type
class ApiKeyType:
    id: int
    key: str
    name: str

@strawberry.type
class AuthPayload:
    access_token: str
    token_type: str

@strawberry.type
class RegisterResult:
    success: bool
    email: str
    message: str
    requires_otp: bool = True

@strawberry.type
class ClientPortalDataType:
    client: ClientType
    organization: OrganizationType
    currency_preference: str

# --- Query ---

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
    def tenant_by_slug(self, slug: str, info: strawberry.Info) -> OrganizationType | None:
        db = info.context["db"]
        return db.query(models.Organization).filter(models.Organization.slug == slug).first()

    @strawberry.field
    def webhooks(self, info: strawberry.Info) -> list[WebhookType]:
        user = get_user_or_error(info)
        db = info.context["db"]
        hooks = db.query(models.Webhook).filter(models.Webhook.organization_id == user.organization_id).all()
        return [
            WebhookType(
                id=h.id,
                url=h.url,
                event_type=h.event_type,
                is_active=h.is_active,
                is_system=(h.url in SYSTEM_WEBHOOK_URLS)
            )
            for h in hooks
        ]

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
        admin_user = db.query(models.User).filter(models.User.organization_id == org.id).first()
        currency = admin_user.currency_preference if admin_user and admin_user.currency_preference else "INR"
        return ClientPortalDataType(client=client, organization=org, currency_preference=currency)

    @strawberry.field
    def portal_invoice_pdf(self, token: str, id: int, info: strawberry.Info) -> str:
        return generate_portal_invoice_pdf(token, id, info)

    @strawberry.field
    def portal_proposal_pdf(self, token: str, id: int, info: strawberry.Info) -> str:
        return generate_portal_proposal_pdf(token, id, info)
        
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
    def invoice_pdf(self, id: int, info: strawberry.Info) -> str:
        return generate_invoice_pdf_resolver(id, info)

    @strawberry.field
    def team_members(self, info: strawberry.Info) -> typing.List[UserType]:
        return resolve_team_members(info)

# --- Mutation ---

@strawberry.type
class Mutation:
    @strawberry.mutation
    def register(
        self, 
        email: str, 
        password: str, 
        name: str, 
        org_name: str, 
        phone: typing.Optional[str] = None,
        country: typing.Optional[str] = None,
        custom_slug: typing.Optional[str] = None,
        info: strawberry.Info = None
    ) -> RegisterResult:
        db = info.context["db"]
        existing_user = db.query(models.User).filter(models.User.email == email).first()
        if existing_user and getattr(existing_user, "is_verified", True):
            raise Exception("Email already registered. Please sign in.")
        
        import re
        import random
        from datetime import datetime, timedelta

        otp = f"{random.randint(100000, 999999)}"
        otp_expiry = datetime.utcnow() + timedelta(minutes=15)

        if existing_user and not existing_user.is_verified:
            existing_user.name = name
            existing_user.hashed_password = get_password_hash(password)
            existing_user.verification_otp = otp
            existing_user.otp_expires_at = otp_expiry
            org = db.query(models.Organization).get(existing_user.organization_id)
            if org:
                org.name = org_name
                if phone: org.phone = phone
                if country: org.country = country
            db.commit()
            target_user = existing_user
        else:
            # Generate unique URL slug from organization name or custom_slug
            raw_slug = custom_slug.strip() if custom_slug and custom_slug.strip() else org_name
            base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', raw_slug.lower()).strip('-') or "workspace"
            slug = base_slug
            count = 1
            while db.query(models.Organization).filter(models.Organization.slug == slug).first():
                slug = f"{base_slug}-{count}"
                count += 1

            org = models.Organization(
                name=org_name, 
                slug=slug,
                phone=phone,
                country=country,
                legal_name=org_name
            )
            db.add(org)
            db.commit()
            db.refresh(org)
            
            hashed_password = get_password_hash(password)
            new_user = models.User(
                email=email, 
                hashed_password=hashed_password, 
                name=name, 
                organization_id=org.id, 
                role="Owner",
                is_verified=False,
                verification_otp=otp,
                otp_expires_at=otp_expiry
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            target_user = new_user
            
            # Seed default Make.com webhook for the new workspace
            signup_hook = models.Webhook(
                organization_id=org.id,
                url="https://hook.eu1.make.com/us4sjup7fkfshjwrfikawob2cwdlxnvv",
                event_type="team.invited",
                is_active=True
            )
            db.add(signup_hook)
            db.commit()

        # Dispatch signup / OTP webhook event to Make.com
        try:
            import requests
            requests.post("https://hook.eu1.make.com/us4sjup7fkfshjwrfikawob2cwdlxnvv", json={
                "event": "signup.otp",
                "email": target_user.email,
                "to": target_user.email,
                "name": target_user.name,
                "otp": otp,
                "temp_password": "",
                "organization_name": org.name if org else org_name,
                "organization_slug": org.slug if org else "",
                "user_id": target_user.id,
                "login_url": f"{settings.FRONTEND_URL.rstrip('/')}",
                "data": {
                    "user_id": target_user.id,
                    "name": target_user.name,
                    "email": target_user.email,
                    "organization_name": org.name if org else org_name,
                    "organization_slug": org.slug if org else "",
                    "otp": otp,
                    "login_url": f"{settings.FRONTEND_URL.rstrip('/')}"
                }
            }, timeout=5)
        except Exception as e:
            print(f"[SIGNUP WEBHOOK ERROR] {e}")

        return RegisterResult(
            success=True,
            email=email,
            message="Verification code sent to your email.",
            requires_otp=True
        )

    @strawberry.mutation
    def verify_signup_otp(self, email: str, otp: str, info: strawberry.Info) -> AuthPayload:
        db = info.context["db"]
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise Exception("Account not found. Please register first.")
        
        from datetime import datetime
        if user.is_verified:
            access_token = create_access_token(data={"sub": user.email})
            return AuthPayload(access_token=access_token, token_type="bearer")

        clean_otp = otp.strip() if otp else ""
        if not user.verification_otp or user.verification_otp.strip() != clean_otp:
            raise Exception("Invalid 6-digit verification code. Please check your inbox.")
        
        if user.otp_expires_at and user.otp_expires_at < datetime.utcnow():
            raise Exception("Verification code has expired. Please click 'Resend Code'.")
        
        user.is_verified = True
        user.verification_otp = None
        user.otp_expires_at = None
        db.commit()

        access_token = create_access_token(data={"sub": user.email})
        return AuthPayload(access_token=access_token, token_type="bearer")

    @strawberry.mutation
    def resend_signup_otp(self, email: str, info: strawberry.Info) -> bool:
        db = info.context["db"]
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise Exception("Account not found.")
        if user.is_verified:
            return True
        
        import random
        from datetime import datetime, timedelta
        otp = f"{random.randint(100000, 999999)}"
        user.verification_otp = otp
        user.otp_expires_at = datetime.utcnow() + timedelta(minutes=15)
        db.commit()

        org = db.query(models.Organization).get(user.organization_id) if user.organization_id else None

        try:
            import requests
            requests.post("https://hook.eu1.make.com/us4sjup7fkfshjwrfikawob2cwdlxnvv", json={
                "event": "signup.otp",
                "email": user.email,
                "to": user.email,
                "name": user.name,
                "otp": otp,
                "temp_password": "",
                "organization_name": org.name if org else "Workspace",
                "organization_slug": org.slug if org else "",
                "user_id": user.id,
                "login_url": f"{settings.FRONTEND_URL.rstrip('/')}",
                "data": {
                    "user_id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "organization_name": org.name if org else "Workspace",
                    "organization_slug": org.slug if org else "",
                    "otp": otp,
                    "login_url": f"{settings.FRONTEND_URL.rstrip('/')}"
                }
            }, timeout=5)
        except Exception as e:
            print(f"[RESEND OTP ERROR] {e}")
        return True

    @strawberry.mutation
    def login(self, email: str, password: str, info: strawberry.Info) -> AuthPayload:
        db = info.context["db"]
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user or not verify_password(password, user.hashed_password):
            raise Exception("Incorrect email or password")
        
        if not getattr(user, "is_verified", True):
            raise Exception("Account pending verification. Please verify the 6-digit code sent to your email.")
        
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
    def add_client(
        self,
        name: str,
        email: str,
        contact_person: str | None = None,
        phone: str | None = None,
        website: str | None = None,
        tax_id: str | None = None,
        billing_address: str | None = None,
        city: str | None = None,
        state: str | None = None,
        postal_code: str | None = None,
        country: str | None = None,
        currency: str | None = "USD",
        payment_terms: str | None = "Net 30",
        client_tier: str | None = "Standard",
        notes: str | None = None,
        info: strawberry.Info = None
    ) -> ClientType:
        user = get_user_or_error(info)
        db = info.context["db"]
        import uuid
        token = str(uuid.uuid4()).replace("-", "")
        new_client = models.Client(
            name=name,
            email=email,
            contact_person=contact_person,
            phone=phone,
            website=website,
            tax_id=tax_id,
            billing_address=billing_address,
            city=city,
            state=state,
            postal_code=postal_code,
            country=country,
            currency=currency or "USD",
            payment_terms=payment_terms or "Net 30",
            client_tier=client_tier or "Standard",
            notes=notes,
            portal_token=token,
            organization_id=user.organization_id
        )
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
        create_activity_log(db, user.organization_id, user.id, "added a new enterprise client", name)
        return new_client

    @strawberry.mutation
    def update_client(
        self,
        client_id: int,
        name: str,
        email: str,
        contact_person: str | None = None,
        phone: str | None = None,
        website: str | None = None,
        tax_id: str | None = None,
        billing_address: str | None = None,
        city: str | None = None,
        state: str | None = None,
        postal_code: str | None = None,
        country: str | None = None,
        currency: str | None = None,
        payment_terms: str | None = None,
        client_tier: str | None = None,
        notes: str | None = None,
        info: strawberry.Info = None
    ) -> ClientType:
        user = get_user_or_error(info)
        db = info.context["db"]
        client = db.query(models.Client).filter(
            models.Client.id == client_id,
            models.Client.organization_id == user.organization_id
        ).first()
        if not client:
            raise Exception("Client not found in your Workspace")
        client.name = name
        client.email = email
        if contact_person is not None: client.contact_person = contact_person
        if phone is not None: client.phone = phone
        if website is not None: client.website = website
        if tax_id is not None: client.tax_id = tax_id
        if billing_address is not None: client.billing_address = billing_address
        if city is not None: client.city = city
        if state is not None: client.state = state
        if postal_code is not None: client.postal_code = postal_code
        if country is not None: client.country = country
        if currency is not None: client.currency = currency
        if payment_terms is not None: client.payment_terms = payment_terms
        if client_tier is not None: client.client_tier = client_tier
        if notes is not None: client.notes = notes
        db.commit()
        db.refresh(client)
        create_activity_log(db, user.organization_id, user.id, "updated client details", name)
        return client

    @strawberry.mutation
    def delete_client(self,client_id:int,info:strawberry.Info)->bool:
        user=get_user_or_error(info)
        db=info.context["db"]
        client=db.query(models.Client).filter(
            models.Client.id==client_id,
            models.Client.organization_id== user.organization_id
        ).first()
        if not client:
            raise Exception("Client not found in your Workspace")
        db.delete(client)
        db.commit()
        create_activity_log(db,user.organization_id,user.id,"deleted a client",client.name)
        return True
        
    @strawberry.mutation
    def add_project(self, name: str, client_id: int, description: str, hourly_rate: float = 0.0, info: strawberry.Info = None) -> ProjectType:
        user = get_user_or_error(info)
        db = info.context["db"]
        client=db.query(models.Client).filter(
            models.Client.id==client_id,
            models.Client.organization_id== user.organization_id
        ).first()
        if not client:
            raise Exception("Client not found in your Workspace")
        new_project = models.Project(name=name, client_id=client_id, description=description, hourly_rate=hourly_rate, organization_id=user.organization_id)
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
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
    def delete_team_member(self, user_id: int, info: strawberry.Info) -> bool:
        return delete_team_member_resolver(user_id, info)

    @strawberry.mutation
    def add_invoice(self, client_id: int, project_id: int, line_items: typing.List[InvoiceLineItemInput], status: str, info: strawberry.Info) -> InvoiceType:
        user = get_user_or_error(info)
        check_role(user,["Owner","Admin"])
        db = info.context["db"]
        client=db.query(models.Client).filter(
            models.Client.id==client_id,
            models.Client.organization_id== user.organization_id
        ).first()
        if not client:
            raise Exception("Client not found in your Workspace")

        project=db.query(models.Project).filter(
            models.Project.id==project_id,
            models.Project.organization_id== user.organization_id
        ).first()
        if not project:
            raise Exception("Project not found in your Workspace")

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
        
        client = db.query(models.Client).get(new_invoice.client_id)
        org = db.query(models.Organization).get(user.organization_id)
        pdf_url = f"{settings.API_BASE_URL.rstrip('/')}/static/Invoice_{new_invoice.id:04d}_{client.name.replace(' ', '_')}.pdf" if client else None
        portal_url = f"{settings.FRONTEND_URL.rstrip('/')}/portal/{client.portal_token}" if client and client.portal_token else None
        
        invoice_payload = {
            "invoice_id": new_invoice.id,
            "invoice_number": f"INV-{new_invoice.id:04d}",
            "amount": new_invoice.amount,
            "client_name": client.name if client else "Client",
            "client_email": client.email if client else "",
            "status": new_invoice.status,
            "pdf_url": pdf_url,
            "portal_url": portal_url,
            "organization_name": org.name if org else "SolopreneurOS"
        }
        trigger_webhooks(db, user.organization_id, "invoice.created", invoice_payload)
        trigger_webhooks(db, user.organization_id, "invoice.send", invoice_payload)
        return new_invoice
        
    @strawberry.mutation
    def update_invoice(self, invoice_id: int, status: str, info: strawberry.Info) -> InvoiceType:
        user = get_user_or_error(info)
        check_role(user,["Owner","Admin"])
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
        project = db.query(models.Project).filter(
            models.Project.id == project_id,
            models.Project.organization_id == user.organization_id
        ).first()
        if not project:
            raise Exception("Project not found in your Workspace")

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
        create_activity_log(db, user.organization_id, user.id, "added a new task", f"to {project.name}")
        return new_task

    @strawberry.mutation
    def update_task_details(self, task_id: int, due_date: str | None = None, assignee_id: int | None = None, info: strawberry.Info = None) -> TaskType:
        user = get_user_or_error(info)
        db = info.context["db"]
        task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.organization_id == user.organization_id).first()
        if not task: raise Exception("Task not found")
        if due_date is not None:
            task.due_date = due_date
        if assignee_id is not None:
            task.assignee_id = None if assignee_id == 0 else assignee_id
        db.commit()
        db.refresh(task)
        trigger_webhooks(db, user.organization_id, "task.updated", {"task_id": task.id, "status": task.status})
        return task

    @strawberry.mutation
    def add_subtask(self, task_id: int, title: str, info: strawberry.Info) -> SubtaskType:
        user = get_user_or_error(info)
        db = info.context["db"]
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
            
        tasks = db.query(models.Task).filter(models.Task.project_id == project_id).all()
        task_ids = [t.id for t in tasks]
        
        unbilled_logs = db.query(models.TimeLog).filter(
            models.TimeLog.task_id.in_(task_ids), 
            models.TimeLog.is_billed == False
        ).all()
        
        if not unbilled_logs:
            raise Exception("No unbilled time found for this project.")
            
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
        check_role(user,["Owner","Admin"])
        db = info.context["db"]
        org = db.query(models.Organization).filter(models.Organization.id == user.organization_id).first()
        org.brand_color = brand_color
        org.logo_url = logo_url if logo_url else None
        db.commit()
        db.refresh(org)
        return org

    @strawberry.mutation
    def update_organization_legal(
        self,
        legal_name: str | None = None,
        business_number: str | None = None,
        tax_id: str | None = None,
        phone: str | None = None,
        website: str | None = None,
        support_email: str | None = None,
        security_email: str | None = None,
        billing_address: str | None = None,
        city: str | None = None,
        state: str | None = None,
        postal_code: str | None = None,
        country: str | None = None,
        info: strawberry.Info = None
    ) -> OrganizationType:
        user = get_user_or_error(info)
        check_role(user, ["Owner", "Admin"])
        db = info.context["db"]
        org = db.query(models.Organization).filter(models.Organization.id == user.organization_id).first()
        if not org:
            raise Exception("Organization not found")
        if legal_name is not None: org.legal_name = legal_name
        if business_number is not None: org.business_number = business_number
        if tax_id is not None: org.tax_id = tax_id
        if phone is not None: org.phone = phone
        if website is not None: org.website = website
        if support_email is not None: org.support_email = support_email
        if security_email is not None: org.security_email = security_email
        if billing_address is not None: org.billing_address = billing_address
        if city is not None: org.city = city
        if state is not None: org.state = state
        if postal_code is not None: org.postal_code = postal_code
        if country is not None: org.country = country
        db.commit()
        db.refresh(org)
        create_activity_log(db, user.organization_id, user.id, "updated enterprise legal profile", org.name)
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
        return WebhookType(
            id=new_hook.id,
            url=new_hook.url,
            event_type=new_hook.event_type,
            is_active=new_hook.is_active,
            is_system=(new_hook.url in SYSTEM_WEBHOOK_URLS)
        )

    @strawberry.mutation
    def delete_webhook(self, webhook_id: int, info: strawberry.Info) -> bool:
        user = get_user_or_error(info)
        db = info.context["db"]
        hook = db.query(models.Webhook).filter(models.Webhook.id == webhook_id, models.Webhook.organization_id == user.organization_id).first()
        if hook:
            if hook.url in SYSTEM_WEBHOOK_URLS:
                raise Exception("Permission denied: System default webhooks are protected and cannot be deleted or modified by organizations.")
            db.delete(hook)
            db.commit()
        return True

    @strawberry.mutation
    def respond_to_proposal(self, token: str, proposal_id: int, accept: bool, info: strawberry.Info) -> ProposalType:
        return respond_to_proposal_resolver(token, proposal_id, accept, info)

    @strawberry.mutation
    def send_invoice(self, invoice_id: int, info: strawberry.Info) -> str:
        return send_invoice_resolver(invoice_id, info)

schema = strawberry.Schema(query=Query, mutation=Mutation)
