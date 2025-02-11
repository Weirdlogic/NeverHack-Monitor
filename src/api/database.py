from sqlalchemy import create_engine, func, desc, or_, text
from sqlalchemy.orm import Session, sessionmaker
from datetime import datetime, timedelta
from typing import List, Dict, Any, Generator
import sys
from pathlib import Path
from contextlib import contextmanager
import os
from sqlalchemy.ext.declarative import declarative_base
from config import DB_PATH

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from api.models import Target, TargetList, Base

# Use SQLite with relative path
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine with SQLite-specific settings and updated pool configuration
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite
    pool_size=20,  # Increase pool size
    max_overflow=30,  # Increase max overflow
    pool_timeout=60,  # Increase timeout
    pool_recycle=1800  # Recycle connections after 30 minutes
)

# Create all tables
Base.metadata.create_all(bind=engine)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

@contextmanager
def get_session() -> Generator:
    """Get database session with automatic cleanup"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

class DashboardQueries:
    def __init__(self):
        self.engine = engine

    def verify_connection(self) -> bool:
        """Verify database connection with a simple query"""
        with get_session() as session:
            session.execute(text("SELECT 1"))
            return True

    def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get main dashboard statistics"""
        with get_session() as session:
            total_targets = session.query(func.count(Target.id)).scalar() or 0
            
            # Count number of target list entries instead of summing attacks
            total_attacks = session.query(func.count(TargetList.id)).scalar() or 0
            
            unique_hosts = session.query(func.count(func.distinct(Target.host))).scalar() or 0
            
            unique_ips = session.query(func.count(func.distinct(Target.ip))).scalar() or 0

            latest_update = session.query(func.max(Target.last_seen)).scalar()

            return {
                "total_targets": total_targets,
                "total_attacks": total_attacks,  # This is now the count of target lists
                "unique_hosts": unique_hosts,
                "unique_ips": unique_ips,
                "last_update": latest_update.isoformat() if latest_update else datetime.now().isoformat()
            }

    def get_attack_trends(self, days: int = 180) -> List[Dict[str, Any]]:
        """Get attack trends over time"""
        with get_session() as session:
            results = session.query(
                func.date(Target.first_seen).label('date'),
                func.count(Target.id).label('count')
            )\
            .group_by(func.date(Target.first_seen))\
            .order_by(desc('date'))\
            .limit(days)\
            .all()

            return [
                {"date": str(r.date), "attacks": r.count}
                for r in results
            ]

    def get_recent_targets(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get most recent targets"""
        with get_session() as session:
            targets = session.query(Target)\
                .order_by(desc(Target.first_seen))\
                .limit(limit)\
                .all()

            return [
                {
                    "host": t.host,
                    "type": t.type,
                    "added": t.first_seen.isoformat()
                }
                for t in targets
            ]

    def get_attack_methods_distribution(self) -> List[Dict[str, Any]]:
        """Get distribution of attack methods"""
        with get_session() as session:
            results = session.query(
                Target.method,
                func.count(Target.id).label('count')
            )\
            .group_by(Target.method)\
            .order_by(desc('count'))\
            .all()

            total = sum(r.count for r in results)
            return [
                {
                    "method": r.method,
                    "percentage": (r.count / total) * 100 if total > 0 else 0
                }
                for r in results
            ]

    def get_recent_targets_since(self, timestamp: datetime) -> List[Dict[str, Any]]:
        """Get targets added since the given timestamp"""
        with get_session() as session:
            targets = session.query(Target)\
                .filter(Target.first_seen >= timestamp)\
                .order_by(desc(Target.first_seen))\
                .all()

            return [
                {
                    "host": t.host,
                    "type": t.type,
                    "method": t.method,
                    "port": t.port,
                    "use_ssl": t.use_ssl,
                    "first_seen": t.first_seen.isoformat(),
                    "last_seen": t.last_seen.isoformat(),
                    "path": t.path,
                    "ip": t.ip
                }
                for t in targets
            ]

    def search_targets(self, query: str = None, method: str = None) -> List[Dict[str, Any]]:
        """Search targets with filters"""
        with get_session() as session:
            q = session.query(Target)
            
            if query:
                q = q.filter(or_(
                    Target.host.ilike(f"%{query}%"),
                    Target.ip.ilike(f"%{query}%"),
                    Target.path.ilike(f"%{query}%")
                ))
            
            if method:
                q = q.filter(Target.method == method)
            
            targets = q.order_by(desc(Target.first_seen)).limit(50).all()
            
            return [
                {
                    "host": t.host,
                    "ip": t.ip,
                    "type": t.type,
                    "method": t.method,
                    "port": t.port,
                    "path": t.path,
                    "first_seen": t.first_seen.isoformat(),
                    "last_seen": t.last_seen.isoformat()
                }
                for t in targets
            ]

    def get_target_details(self, host: str) -> Dict[str, Any]:
        """Get detailed information about a target"""
        with get_session() as session:
            target = session.query(Target).filter(Target.host == host).first()
            
            if not target:
                return None

            # Get historical data
            history = session.query(
                func.date(Target.first_seen).label('date'),
                func.count(Target.id).label('attacks')
            ).filter(Target.host == host)\
             .group_by(func.date(Target.first_seen))\
             .order_by('date')\
             .all()

            return {
                "details": {
                    "host": target.host,
                    "ip": target.ip,
                    "type": target.type,
                    "method": target.method,
                    "port": target.port,
                    "path": target.path,
                    "first_seen": target.first_seen.isoformat(),
                    "last_seen": target.last_seen.isoformat()
                },
                "history": [
                    {"date": str(h.date), "attacks": h.attacks}
                    for h in history
                ]
            }
