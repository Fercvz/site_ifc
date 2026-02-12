"""
Chat API Routes — AI-powered Q&A about the IFC model.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from services.session_manager import session_manager
from services.chat_service import chat_with_model

router = APIRouter(prefix="/api", tags=["Chat"])


class ChatRequest(BaseModel):
    session_id: str
    message: str


@router.post("/chat")
async def chat(request: ChatRequest):
    """Chat with AI about the loaded IFC model."""
    session = session_manager.get_session(request.session_id)
    if not session or not session.get("ifc_index"):
        raise HTTPException(
            status_code=400,
            detail="Nenhum IFC processado nesta sessão. Carregue um IFC primeiro."
        )

    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Mensagem vazia.")

    ifc_index = session["ifc_index"]
    ifc_filename = session.get("ifc_filename", "")
    try:
        result = chat_with_model(ifc_index, request.message, ifc_filename=ifc_filename)
        return result
    except Exception as e:
        return {
            "answer": f"❌ Erro interno ao consultar a IA: {str(e)}",
            "sources": [],
        }
