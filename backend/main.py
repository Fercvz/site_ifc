"""
IFC Analysis Platform — FastAPI Backend
Main entry point with CORS configuration and route registration.
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="IFC Analysis Platform API",
    description="Backend for IFC file analysis, Excel validation, and AI chat.",
    version="1.0.0",
)

# CORS — allow frontend dev server and production domains
origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
if os.getenv("CORS_ORIGINS"):
    origins.extend(os.getenv("CORS_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
from routes.ifc_routes import router as ifc_router
from routes.validation_routes import router as validation_router
from routes.chat_routes import router as chat_router

app.include_router(ifc_router)
app.include_router(validation_router)
app.include_router(chat_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "IFC Analysis Platform API is running."}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
