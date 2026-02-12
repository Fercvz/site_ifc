"""
IFC API Routes — Upload, job status, and analysis endpoints.
"""

import os
import uuid
import threading
import tempfile
from fastapi import APIRouter, UploadFile, File, Query, HTTPException

from services.session_manager import session_manager
from services.ifc_parser import parse_ifc

router = APIRouter(prefix="/api", tags=["IFC"])

# Max file size: 300MB
MAX_FILE_SIZE = 300 * 1024 * 1024


def _process_ifc_async(session_id: str, file_path: str, filename: str):
    """Background worker to parse IFC file."""
    try:
        session_manager.update_session(
            session_id, job_status="running", job_progress=10, job_message="Parsing IFC..."
        )
        ifc_index = parse_ifc(file_path)
        session_manager.update_session(
            session_id,
            ifc_index=ifc_index,
            ifc_filename=filename,
            job_status="done",
            job_progress=100,
            job_message="Processamento concluído",
        )
    except Exception as e:
        session_manager.update_session(
            session_id,
            job_status="error",
            job_progress=0,
            job_message=f"Erro no processamento: {str(e)}",
        )
        # Clean up file on error
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass


@router.post("/ifc/upload")
async def upload_ifc(file: UploadFile = File(...), session_id: str = Query(default=None)):
    """Upload an IFC file. Creates or reuses a session."""
    # Validate file extension
    if not file.filename.lower().endswith(".ifc"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .ifc são aceitos.")

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo excede o tamanho máximo de 300MB.")

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    # Create or reset session
    if session_id:
        session = session_manager.get_session(session_id)
        if session:
            session_manager.update_session(
                session_id,
                ifc_index=None,
                ifc_filename=None,
                job_status="queued",
                job_progress=0,
                job_message="Novo arquivo recebido",
                validation_results=None,
            )
        else:
            session_id = session_manager.create_session()
    else:
        session_id = session_manager.create_session()

    job_id = str(uuid.uuid4())
    session_manager.update_session(session_id, job_id=job_id)

    # Save file temporarily
    tmp_dir = tempfile.mkdtemp()
    safe_filename = os.path.basename(file.filename).replace("..", "").replace("/", "").replace("\\", "")
    file_path = os.path.join(tmp_dir, safe_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    # Start async processing
    thread = threading.Thread(
        target=_process_ifc_async,
        args=(session_id, file_path, file.filename),
        daemon=True,
    )
    thread.start()

    return {
        "session_id": session_id,
        "file_name": file.filename,
        "file_size": len(content),
        "status": "queued",
        "job_id": job_id,
    }


@router.get("/job/{job_id}")
async def get_job_status(job_id: str, session_id: str = Query(...)):
    """Get the status of a processing job."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")

    if session.get("job_id") != job_id:
        raise HTTPException(status_code=404, detail="Job não encontrado nesta sessão.")

    return {
        "status": session.get("job_status", "unknown"),
        "progress": session.get("job_progress", 0),
        "message": session.get("job_message", ""),
    }


@router.get("/ifc/header")
async def get_header(session_id: str = Query(...)):
    """Get IFC header information."""
    session = session_manager.get_session(session_id)
    if not session or not session.get("ifc_index"):
        raise HTTPException(status_code=400, detail="Nenhum IFC processado nesta sessão.")

    return session["ifc_index"]["header"]


@router.get("/ifc/version")
async def get_version(session_id: str = Query(...)):
    """Get IFC version/schema information."""
    session = session_manager.get_session(session_id)
    if not session or not session.get("ifc_index"):
        raise HTTPException(status_code=400, detail="Nenhum IFC processado nesta sessão.")

    return session["ifc_index"]["version"]


@router.get("/ifc/units")
async def get_units(session_id: str = Query(...)):
    """Get IFC unit assignments."""
    session = session_manager.get_session(session_id)
    if not session or not session.get("ifc_index"):
        raise HTTPException(status_code=400, detail="Nenhum IFC processado nesta sessão.")

    return session["ifc_index"]["units"]


@router.get("/ifc/georef")
async def get_georef(session_id: str = Query(...)):
    """Get IFC georeference information."""
    session = session_manager.get_session(session_id)
    if not session or not session.get("ifc_index"):
        raise HTTPException(status_code=400, detail="Nenhum IFC processado nesta sessão.")

    return session["ifc_index"]["georef"]


@router.get("/ifc/summary")
async def get_summary(session_id: str = Query(...)):
    """Get IFC model summary (hierarchy + entity counts)."""
    session = session_manager.get_session(session_id)
    if not session or not session.get("ifc_index"):
        raise HTTPException(status_code=400, detail="Nenhum IFC processado nesta sessão.")

    idx = session["ifc_index"]
    return {
        "hierarchy": idx.get("hierarchy"),
        "entity_summary": idx.get("entity_summary"),
        "element_count": idx.get("element_count"),
        "filename": session.get("ifc_filename"),
    }
