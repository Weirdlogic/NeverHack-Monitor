from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime, timedelta
import requests
from api.models import WatchlistItem, Target
from api.database import get_session
from pydantic import BaseModel
from sqlalchemy import or_
from api.monitor import monitor

router = APIRouter()

class WatchlistItemCreate(BaseModel):
    pattern: str
    description: str
    severity: str

@router.post("/watchlist")
async def add_watchlist_item(item: WatchlistItemCreate):
    """Add a new item to the watchlist"""
    with get_session() as session:
        new_item = WatchlistItem(
            pattern=item.pattern,
            description=item.description,
            severity=item.severity,
            created_at=datetime.utcnow(),
            match_count=0  # Initialize match count
        )
        session.add(new_item)
        session.commit()
        return serialize_watchlist_item(new_item)

@router.get("/watchlist")
async def get_watchlist():
    """Get all watchlist items"""
    with get_session() as session:
        items = session.query(WatchlistItem).all()
        return [serialize_watchlist_item(item) for item in items]

async def update_match_stats(item_id: int):
    """Update match statistics for a watchlist item"""
    with get_session() as session:
        item = session.query(WatchlistItem).filter_by(id=item_id).first()
        if item:
            item.match_count = (item.match_count or 0) + 1
            item.last_match = datetime.utcnow()
            session.commit()

@router.get("/watchlist/{item_id}/check")
async def check_watchlist_item(item_id: int, background_tasks: BackgroundTasks):
    """Check status of a specific watchlist item"""
    with get_session() as session:
        item = session.query(WatchlistItem).filter_by(id=item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        try:
            response = requests.get(f"http://{item.pattern}", timeout=5)
            status = {
                "is_up": response.status_code == 200,
                "status_code": response.status_code,
                "last_check": datetime.utcnow().isoformat()
            }
            
            # Update item status
            item.is_up = status["is_up"]
            item.last_check = datetime.utcnow()
            item.last_status = response.status_code
            
            # If we got a successful response, increment match count
            if status["is_up"]:
                background_tasks.add_task(update_match_stats, item_id)
            
            session.commit()
            return status
            
        except Exception as e:
            status = {
                "is_up": False,
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }
            
            # Update item status even on error
            item.is_up = False
            item.last_check = datetime.utcnow()
            item.last_status = None
            session.commit()
            
            return status

@router.delete("/watchlist/{item_id}")
async def delete_watchlist_item(item_id: int):
    """Delete a watchlist item"""
    with get_session() as session:
        item = session.query(WatchlistItem).filter_by(id=item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        session.delete(item)
        session.commit()
        return {"status": "success"}

@router.get("/watchlist/latest-matches")
async def get_latest_matches(limit: int = 10):
    """Get the most recent matches from the latest target list"""
    with get_session() as session:
        matches = monitor.get_latest_matches(session, limit)
        return [
            {
                "host": match['target'].host,
                "ip": match['target'].ip,
                "method": match['target'].method,
                "port": match['target'].port,
                "type": match['target'].type,
                "path": match['target'].path,
                "body": match['target'].body,
                "first_seen": match['target'].first_seen.isoformat() if match['target'].first_seen else None,
                "last_seen": match['target'].last_seen.isoformat() if match['target'].last_seen else None,
                "attacks": match['target'].attacks,
                "pattern": match['pattern'],
                "severity": match['severity'],
                "match_time": match['match_time'].isoformat()
            }
            for match in matches
        ]

@router.get("/watchlist/traffic-alerts")
async def get_traffic_alerts(threshold: int = 10):
    """Get targets with traffic above threshold in the last hour"""
    with get_session() as session:
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        targets = session.query(Target)\
            .filter(Target.attacks > threshold)\
            .filter(Target.last_seen >= one_hour_ago)\
            .all()
            
        return [
            {
                "host": t.host,
                "ip": t.ip,
                "port": t.port,
                "attacks": t.attacks,
                "type": t.type,
                "method": t.method,
                "last_seen": t.last_seen.isoformat() if t.last_seen else None
            }
            for t in targets
        ]

@router.get("/watchlist/new-targets")
async def get_new_targets(minutes: int = 5):
    """Get targets first seen in the last N minutes"""
    with get_session() as session:
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
        targets = session.query(Target)\
            .filter(Target.first_seen >= cutoff_time)\
            .all()
            
        return [
            {
                "host": t.host,
                "ip": t.ip,
                "port": t.port,
                "type": t.type,
                "method": t.method,
                "first_seen": t.first_seen.isoformat() if t.first_seen else None
            }
            for t in targets
        ]

def serialize_watchlist_item(item: WatchlistItem) -> dict:
    """Helper function to serialize a WatchlistItem"""
    try:
        match_count = item.match_count
    except AttributeError:
        match_count = 0
        
    return {
        "id": item.id,
        "pattern": item.pattern,
        "description": item.description,
        "severity": item.severity,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "last_match": item.last_match.isoformat() if item.last_match else None,
        "last_check": item.last_check.isoformat() if item.last_check else None,
        "is_up": item.is_up,
        "last_status": item.last_status,
        "match_count": match_count
    }
