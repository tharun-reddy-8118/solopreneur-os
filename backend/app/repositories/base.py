from typing import Generic, TypeVar, Type, List, Optional
from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType")

class BaseTenantRepository(Generic[ModelType]):
    """
    Enterprise Tenant-Scoped Repository.
    Automatically ensures every query, update, and deletion is constrained to tenant_id.
    """
    def __init__(self, model: Type[ModelType], db: Session, tenant_id: int):
        self.model = model
        self.db = db
        self.tenant_id = tenant_id

    def get(self, id: int) -> Optional[ModelType]:
        return self.db.query(self.model).filter(
            self.model.id == id,
            self.model.organization_id == self.tenant_id
        ).first()

    def list(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return self.db.query(self.model).filter(
            self.model.organization_id == self.tenant_id
        ).offset(skip).limit(limit).all()

    def create(self, **kwargs) -> ModelType:
        kwargs["organization_id"] = self.tenant_id
        obj = self.model(**kwargs)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, id: int) -> bool:
        obj = self.get(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
            return True
        return False

    def update(self,id:int,**kwargs)-> Optional[ModelType]:
        obj=self.get(id)
        if not obj:
            return None
        kwargs.pop("organization_id",None)
        for key,value in kwargs.items():
            if hasattr(obj,key) and value is not None:
                setattr(obj,key,value)
        self.db.commit()
        self.db.refresh(obj)
        return obj
