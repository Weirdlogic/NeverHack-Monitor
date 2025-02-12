from pathlib import Path
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import asyncio
import os

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from api.routes import search
from api.watchlist import router as watchlist_router
from api.monitor import DatabaseMonitor
from contextlib import asynccontextmanager

def list_all_routes(app: FastAPI):
    """Print all registered routes in a formatted way"""
    print("\nRegistered Routes:")
    print("-" * 70)
    print(f"{'Method':<10} {'Path':<40} {'Name':<20}")
    print("-" * 70)
    
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            for method in route.methods:
                routes.append((method, route.path, route.name))
    
    # Sort routes by path for better readability
    for method, path, name in sorted(routes, key=lambda x: x[1]):
        print(f"{method:<10} {path:<40} {name or '':<20}")
    print("-" * 70)

monitor = DatabaseMonitor()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    print("Starting up FastAPI application...")
    list_all_routes(app)
    # Start both database and watchlist monitoring
    asyncio.create_task(monitor.monitor_database())
    asyncio.create_task(monitor.monitor_watchlist())
    yield
    # Shutdown
    print("Shutting down FastAPI application...")

app = FastAPI(
    title="NeverHack Monitor API",
    description="API for monitoring attack targets",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the search router
app.include_router(
    search.router,
    prefix="/api/search",
    tags=["search"]
)

# Mount the watchlist router - this needs to be mounted at /api
app.include_router(
    watchlist_router,
    prefix="/api",
    tags=["watchlist"]
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        return JSONResponse(
            content={
                "status": "ok",
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0"
            },
            status_code=200
        )
    except Exception as e:
        return JSONResponse(
            content={
                "status": "error",
                "error": str(e)
            },
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 3000))  # Use PORT env var but default to 3000
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        workers=1
    )