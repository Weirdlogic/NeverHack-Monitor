from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy import func, desc, distinct
import asyncio

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from api.database import DashboardQueries, get_session
from api.routes import search
from api.watchlist import router as watchlist_router
from api.models import Base
from data_model import Target
from api.monitor import start_monitoring

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    print("Starting up FastAPI application...")
    print("Ensuring database schema is up to date...")
    #Base.metadata.create_all(engine)  # This will create/update tables safely
    list_all_routes(app)
    yield
    # Shutdown
    print("Shutting down FastAPI application...")

# Initialize the app with lifespan
app = FastAPI(
    title="NeverHack Monitor API",
    description="API for monitoring attack targets",
    version="1.0.0",
    lifespan=lifespan
)

# Initialize services
db = DashboardQueries()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Start the monitoring service in the background
    asyncio.create_task(start_monitoring())

# Mount the routers
app.include_router(
    search.router,
    prefix="/api/search",
    tags=["search"]
)

app.include_router(
    watchlist_router,
    prefix="/api",
    tags=["watchlist"]
)

# REST endpoints
@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    stats = db.get_dashboard_stats()
    # Ensure all values are valid numbers
    validated_stats = {
        "total_targets": int(stats.get("total_targets", 0)),
        "total_attacks": int(stats.get("total_attacks", 0)),
        "unique_hosts": int(stats.get("unique_hosts", 0)),
        "unique_ips": int(stats.get("unique_ips", 0)),
        "last_update": stats.get("last_update", datetime.now().isoformat())
    }
    return validated_stats

@app.get("/api/dashboard/trends")
async def get_attack_trends():
    return db.get_attack_trends()

@app.get("/api/dashboard/recent")
async def get_recent_targets(limit: int = Query(10, ge=1, le=50)) -> List[Dict[str, Any]]:
    """Get most recent targets with attack counts"""
    with get_session() as session:
        # Get recent unique hosts
        subq = session.query(
            Target.host,
            func.max(Target.first_seen).label('latest_seen')
        ).group_by(Target.host)\
        .order_by(desc('latest_seen'))\
        .limit(limit)\
        .subquery()
        
        # Get full target details
        targets = session.query(Target)\
            .join(subq, Target.host == subq.c.host)\
            .filter(Target.first_seen == subq.c.latest_seen)\
            .all()

        return [
            {
                "host": t.host,
                "ip": t.ip,
                "method": t.method,
                "port": t.port,
                "attacks": t.attacks or 0,
                "first_seen": t.first_seen.isoformat() if t.first_seen else None,
                "last_seen": t.last_seen.isoformat() if t.last_seen else None
            }
            for t in targets
        ]

@app.get("/api/dashboard/methods")
async def get_attack_methods() -> Dict[str, int]:
    """Get distribution of attack methods"""
    with get_session() as session:
        results = session.query(
            Target.method,
            func.count(Target.id).label('count')
        )\
        .group_by(Target.method)\
        .order_by(desc('count'))\
        .all()

        return {r.method: r.count for r in results}

@app.get("/api/health")
async def get_health():
    """Health check endpoint"""
    try:
        # Try a simple query to verify the database connection
        db.verify_connection()
        return {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }