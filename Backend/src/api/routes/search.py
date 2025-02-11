from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import or_, func, desc, distinct
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel

from api.models import Target
from api.database import get_session

class SearchAutocompleteResponse(BaseModel):
    hosts: List[str]
    ips: List[str]
    paths: List[str]

router = APIRouter(
    tags=["search"],
    responses={404: {"description": "Not found"}}
)

@router.get("/")
async def search_targets(
    query: str = Query(None, min_length=2),
    method: str = Query(None),
    days: int = Query(7, ge=1),
    limit: int = Query(50, ge=1, le=100)
) -> List[Dict[str, Any]]:
    """
    Search targets with filters
    - query: Search in host, IP, or path
    - method: Filter by HTTP method
    - days: Look back period
    - limit: Maximum number of results
    """
    try:
        with get_session() as session:
            since = datetime.now() - timedelta(days=days)
            
            base_query = session.query(Target).filter(
                Target.first_seen >= since
            )
            
            if query:
                base_query = base_query.filter(
                    or_(
                        Target.host.ilike(f"%{query}%"),
                        Target.ip.ilike(f"%{query}%"),
                        Target.path.ilike(f"%{query}%")
                    )
                )
            
            if method:
                base_query = base_query.filter(Target.method == method.upper())
            
            results = base_query.order_by(
                desc(Target.first_seen)
            ).limit(limit).all()
            
            # Get attack counts for each target
            return [
                {
                    "host": target.host,
                    "ip": target.ip,
                    "type": target.type,
                    "method": target.method,
                    "port": target.port,
                    "path": target.path,
                    "first_seen": target.first_seen.isoformat(),
                    "last_seen": target.last_seen.isoformat() if target.last_seen else None,
                    "attacks": session.query(func.count(Target.id))
                             .filter(Target.host == target.host).scalar(),
                    "attack_stats": {
                        "methods_used": [m[0] for m in session.query(Target.method)
                                       .filter(Target.host == target.host)
                                       .distinct().all()],
                        "ports_targeted": [p[0] for p in session.query(Target.port)
                                         .filter(Target.host == target.host)
                                         .distinct().all()]
                    }
                }
                for target in results
            ]
            
    except SQLAlchemyError as e:
        print(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        with get_session() as session:
            # Try a simple query to verify database connection
            session.execute("SELECT 1").scalar()
            return {
                "status": "ok",
                "timestamp": datetime.utcnow().isoformat(),
                "database": "connected"
            }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "message": str(e), "timestamp": datetime.utcnow().isoformat()}
        )

@router.get("/suggest")
async def suggest_targets(q: str = Query(..., min_length=2)) -> List[str]:
    """Get search suggestions for hostnames"""
    try:
        with get_session() as session:
            results = session.query(Target.host)\
                .filter(Target.host.ilike(f"%{q}%"))\
                .distinct()\
                .limit(10)\
                .all()
            return [r[0] for r in results]
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail="Database error")

@router.get("/autocomplete", response_model=SearchAutocompleteResponse)
async def search_autocomplete(q: str = Query(..., min_length=2)) -> SearchAutocompleteResponse:
    """Get rich autocomplete suggestions including hosts, IPs, and paths"""
    try:
        with get_session() as session:
            # Get matching hosts
            hosts = session.query(Target.host)\
                .filter(Target.host.ilike(f"%{q}%"))\
                .distinct()\
                .limit(5)\
                .all()
            
            # Get matching IPs
            ips = session.query(Target.ip)\
                .filter(Target.ip.ilike(f"%{q}%"))\
                .distinct()\
                .limit(5)\
                .all()
            
            # Get matching paths
            paths = session.query(Target.path)\
                .filter(Target.path.ilike(f"%{q}%"))\
                .distinct()\
                .limit(5)\
                .all()
                
            return SearchAutocompleteResponse(
                hosts=[h[0] for h in hosts],
                ips=[ip[0] for ip in ips],
                paths=[p[0] for p in paths]
            )
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail="Database error")

@router.get("/target/{host}")
async def get_target_details(host: str) -> List[Dict[str, Any]]:
    """Get detailed information about a specific target"""
    try:
        with get_session() as session:
            # Get all attack instances for this host
            targets = session.query(Target)\
                .filter(Target.host == host)\
                .order_by(desc(Target.first_seen))\
                .all()
                
            if not targets:
                raise HTTPException(status_code=404, detail="Target not found")

            # Get unique methods
            methods = session.query(distinct(Target.method))\
                .filter(Target.host == host)\
                .all()

            # Get unique ports
            ports = session.query(distinct(Target.port))\
                .filter(Target.host == host)\
                .all()

            # Get unique paths
            paths = session.query(distinct(Target.path))\
                .filter(
                    Target.host == host,
                    Target.path != None,
                    Target.path != ''
                ).all()

            # Return all instances with summary stats
            return [
                {
                    "host": target.host,
                    "ip": target.ip,
                    "type": target.type,
                    "method": target.method,
                    "port": target.port,
                    "path": target.path,
                    "first_seen": target.first_seen.isoformat(),
                    "last_seen": target.last_seen.isoformat() if target.last_seen else target.first_seen.isoformat(),
                    "body": target.body,
                    "use_ssl": target.use_ssl,
                    "summary": {
                        "unique_methods": [m[0] for m in methods],
                        "unique_ports": [p[0] for p in ports],
                        "unique_paths": [p[0] for p in paths if p[0]]
                    }
                }
                for target in targets
            ]

    except SQLAlchemyError as e:
        print(f"Database error in get_target_details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Unexpected error in get_target_details: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/active_targets")
async def get_active_targets(days: int = Query(7, ge=1)) -> List[Dict[str, Any]]:
    """
    Get all active targets from the last N days with complete attack information
    - days: Look back period (default 7 days)
    """
    try:
        with get_session() as session:
            since = datetime.now() - timedelta(days=days)
            
            # First get all unique hosts with their latest attack information
            latest_attacks = session.query(
                Target.host,
                Target.ip,
                Target.type,
                Target.method,
                Target.port,
                Target.path,
                func.max(Target.first_seen).label('latest_first_seen'),
                func.max(Target.last_seen).label('latest_last_seen')
            ).filter(
                Target.first_seen >= since
            ).group_by(
                Target.host
            ).subquery()

            # Now join back to get complete information for each host
            base_query = session.query(Target).join(
                latest_attacks,
                Target.host == latest_attacks.c.host
            ).filter(
                Target.first_seen >= since
            )

            results = []
            for host_targets in base_query.all():
                # Get attack count
                attack_count = session.query(
                    func.count(Target.id)
                ).filter(
                    Target.host == host_targets.host,
                    Target.first_seen >= since
                ).scalar()

                # Get unique methods
                methods = session.query(
                    distinct(Target.method)
                ).filter(
                    Target.host == host_targets.host,
                    Target.first_seen >= since
                ).all()

                # Get unique ports
                ports = session.query(
                    distinct(Target.port)
                ).filter(
                    Target.host == host_targets.host,
                    Target.first_seen >= since
                ).all()

                # Get latest paths being attacked
                recent_paths = session.query(
                    distinct(Target.path)
                ).filter(
                    Target.host == host_targets.host,
                    Target.path != None,  # Exclude null paths
                    Target.path != ''     # Exclude empty paths
                ).order_by(
                    desc(Target.first_seen)
                ).limit(5).all()

                results.append({
                    "host": host_targets.host,
                    "ip": host_targets.ip,
                    "type": host_targets.type,
                    "method": host_targets.method,
                    "port": host_targets.port,
                    "path": host_targets.path,
                    "first_seen": host_targets.first_seen.isoformat(),
                    "last_seen": host_targets.last_seen.isoformat() if host_targets.last_seen else None,
                    "attacks": attack_count or 0,
                    "attack_stats": {
                        "methods_used": [m[0] for m in methods],
                        "ports_targeted": [p[0] for p in ports],
                        "recent_paths": [p[0] for p in recent_paths if p[0]]
                    }
                })

            return sorted(
                results,
                key=lambda x: x['attacks'],
                reverse=True
            )

    except SQLAlchemyError as e:
        print(f"Database error in get_active_targets: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        print(f"Unexpected error in get_active_targets: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/targets/active")
async def get_active_targets(
    days: int = Query(7, ge=1),
    limit: int = Query(50, ge=1, le=100)
) -> List[Dict[str, Any]]:
    """
    Get all active targets from the last N days with attack statistics
    - days: Look back period (default: 7 days)
    - limit: Maximum number of results (default: 50)
    """
    try:
        with get_session() as session:
            since = datetime.now() - timedelta(days=days)
            
            # Get base query for recent targets
            base_query = session.query(Target).filter(
                Target.first_seen >= since
            )
            
            # Get unique hosts and their latest activity
            hosts = session.query(
                Target.host,
                func.max(Target.first_seen).label('latest_seen')
            ).filter(
                Target.first_seen >= since
            ).group_by(Target.host).order_by(
                desc('latest_seen')
            ).limit(limit).all()
            
            results = []
            for host, _ in hosts:
                # Get the most recent target record for this host
                latest_target = base_query.filter(
                    Target.host == host
                ).order_by(desc(Target.first_seen)).first()
                
                if latest_target:
                    # Get attack statistics
                    attack_count = session.query(func.count(Target.id))\
                        .filter(Target.host == host)\
                        .filter(Target.first_seen >= since)\
                        .scalar()
                    
                    # Get unique methods used
                    methods = session.query(distinct(Target.method))\
                        .filter(Target.host == host)\
                        .filter(Target.first_seen >= since)\
                        .all()
                    
                    # Get unique ports targeted
                    ports = session.query(distinct(Target.port))\
                        .filter(Target.host == host)\
                        .filter(Target.first_seen >= since)\
                        .all()
                    
                    # Get recent paths
                    recent_paths = session.query(distinct(Target.path))\
                        .filter(Target.host == host)\
                        .filter(Target.path != None)\
                        .filter(Target.path != '')\
                        .filter(Target.first_seen >= since)\
                        .order_by(desc(Target.first_seen))\
                        .limit(5)\
                        .all()
                    
                    results.append({
                        "host": latest_target.host,
                        "ip": latest_target.ip,
                        "type": latest_target.type,
                        "method": latest_target.method,
                        "port": latest_target.port,
                        "path": latest_target.path,
                        "first_seen": latest_target.first_seen.isoformat(),
                        "last_seen": latest_target.last_seen.isoformat() if latest_target.last_seen else None,
                        "attacks": attack_count,
                        "attack_stats": {
                            "methods_used": [m[0] for m in methods],
                            "ports_targeted": [p[0] for p in ports],
                            "recent_paths": [p[0] for p in recent_paths if p[0]]
                        }
                    })
            
            return results
            
    except SQLAlchemyError as e:
        print(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")