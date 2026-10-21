from sqlalchemy import text
from .session import engine, Base, check_database_connection
from .models import VideoAnalysis, SignalBreakdown, SuspiciousInterval, ForensicReport

def init_database():
    """
    Initializes tables in the connected Neon PostgreSQL database.
    """
    status = check_database_connection()
    if not status.get("connected"):
        print(f"[DB INIT] Database connection check: {status.get('message')}")
        return status

    try:
        # Create all tables defined in models.py
        Base.metadata.create_all(bind=engine)
        print("[DB INIT] Successfully initialized database tables in Neon PostgreSQL.")
        return {
            "success": True,
            "message": "OmniVerify tables initialized successfully in Neon PostgreSQL.",
            "details": status
        }
    except Exception as e:
        print(f"[DB INIT] Error creating tables: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "details": status
        }

if __name__ == "__main__":
    init_database()
