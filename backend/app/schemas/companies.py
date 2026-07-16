from pydantic import BaseModel
from typing import Optional

class CompanyCreate(BaseModel):
    legal_name: str
    jurisdiction: Optional[str] = None
    industry: Optional[str] = None
