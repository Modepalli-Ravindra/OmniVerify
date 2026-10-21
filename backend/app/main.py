import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import settings, UPLOAD_DIR
from .api.routes import router as api_router

app = FastAPI(
    title=f"{settings.APP_NAME} — Forensic Analysis API",
    description=settings.APP_TITLE,
    version=settings.VERSION
)

# Enable CORS for React frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory so frontend video player can stream the uploaded video directly
app.mount("/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")

# Include forensic API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "app": settings.APP_NAME,
        "title": settings.APP_TITLE,
        "academic_year": settings.ACADEMIC_YEAR,
        "status": "Online",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
