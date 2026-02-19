from __future__ import annotations

from pydantic import BaseModel


class CreateClientRequest(BaseModel):
    phone: str
    name: str = ""
    company_name: str = ""
    allowed_sections: list[str] = ["studio", "jewelry"]


class UpdateClientRequest(BaseModel):
    client_id: str
    is_active: bool | None = None
    allowed_sections: list[str] | None = None


class AddTokensRequest(BaseModel):
    client_id: str
    amount: int
