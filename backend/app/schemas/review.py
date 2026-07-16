from pydantic import BaseModel


class ReviewActionRequest(BaseModel):
    """Body for every compliance-officer/admin review action. Remarks are
    optional free text stored alongside the decision for the audit trail.
    """

    remarks: str | None = None
