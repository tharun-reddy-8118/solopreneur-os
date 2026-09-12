"""
SolopreneurOS Application Entry Point.
Delegates to the modular enterprise app package in app.main.
"""
from app.main import app

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    reload = os.environ.get("ENVIRONMENT", "development").lower() != "production"
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
