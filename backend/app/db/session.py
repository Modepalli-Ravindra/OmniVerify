import os
from pathlib import Path
from typing import Generator, Optional, Dict, Any
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# Load environment variables from .env file if it exists
ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# Normalize connection prefix for SQLAlchemy 2.0
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

Base = declarative_base()

engine = None
SessionLocal = None

if DATABASE_URL:
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,      # Tests connection liveness before usage (essential for serverless Neon scale-to-zero)
            pool_recycle=300,        # Recycles connections every 5 minutes
            pool_size=5,             # Conservative pool for CPU / laptop environments
            max_overflow=10,
            connect_args={"sslmode": "require"} if "neon.tech" in DATABASE_URL else {}
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e:
        engine = None
        SessionLocal = None

def get_db() -> Generator[Optional[Session], None, None]:
    """
    FastAPI dependency yielding a database session when configured,
    or None when DATABASE_URL is not yet supplied.
    """
    if SessionLocal is None:
        yield None
        return

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_connection() -> Dict[str, Any]:
    """
    Verifies actual live connectivity by executing SELECT 1 against Neon PostgreSQL.
    Never fabricates connection state.
    """
    if not DATABASE_URL:
        return {
            "configured": False,
            "connected": False,
            "provider": "Neon PostgreSQL (Lakebase Postgres)",
            "message": "DATABASE_URL is not configured in .env. Running in local filesystem mode."
        }

    if engine is None:
        return {
            "configured": True,
            "connected": False,
            "provider": "Neon PostgreSQL (Lakebase Postgres)",
            "message": "Failed to initialize SQLAlchemy database engine."
        }

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            # Retrieve server version
            server_version = conn.execute(text("SHOW server_version")).scalar()
            current_db = conn.execute(text("SELECT current_database()")).scalar()
            return {
                "configured": True,
                "connected": result == 1,
                "provider": "Neon PostgreSQL (Lakebase Postgres)",
                "database": current_db,
                "server_version": server_version,
                "message": "Successfully connected and verified against Neon PostgreSQL."
            }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "provider": "Neon PostgreSQL (Lakebase Postgres)",
            "error": str(e),
            "message": f"Connection attempt failed: {str(e)}"
        }
