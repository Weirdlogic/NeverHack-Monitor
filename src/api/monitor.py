import asyncio
from datetime import datetime
import aiohttp
from typing import Dict, Any, Optional, List
from api.database import get_session
from api.models import WatchlistItem, Target, TargetList
from sqlalchemy import desc

class DatabaseMonitor:
    def __init__(self):
        self._session = None
        self._check_interval = 30  # seconds

    async def start_monitoring(self):
        """Start the monitoring loop"""
        while True:
            await self.check_all_watchlist_items()
            await self.check_latest_targets()
            await asyncio.sleep(self._check_interval)

    async def check_latest_targets(self):
        """Check the latest target list against watchlist patterns"""
        with get_session() as session:
            # Get latest target list
            latest_list = session.query(TargetList).order_by(desc(TargetList.ingested_at)).first()
            if not latest_list:
                return

            # Get all targets from latest list
            latest_targets = session.query(Target).filter(Target.target_list_id == latest_list.id).all()
            
            # Get all watchlist items
            watchlist_items = session.query(WatchlistItem).all()

            # Check each target against watchlist patterns
            for target in latest_targets:
                for item in watchlist_items:
                    if self._target_matches_pattern(target, item.pattern):
                        # Update watchlist item match count and timestamp
                        item.match_count = (item.match_count or 0) + 1
                        item.last_match = datetime.now()
            
            session.commit()

    def _target_matches_pattern(self, target: Target, pattern: str) -> bool:
        """Check if a target matches a watchlist pattern"""
        return (
            pattern in target.host or
            pattern in (target.ip or '') or
            (target.path and pattern in target.path)
        )

    async def check_all_watchlist_items(self):
        """Check all watchlist items in parallel"""
        with get_session() as session:
            items = session.query(WatchlistItem).all()
            async with aiohttp.ClientSession() as client:
                tasks = [self.check_website_status(item.pattern, client) for item in items]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Update database with results
                for item, result in zip(items, results):
                    if isinstance(result, Exception):
                        item.is_up = False
                        item.last_status = None
                        item.last_check = datetime.now()
                    else:
                        item.is_up = result.get('is_up', False)
                        item.last_status = result.get('status_code')
                        item.last_check = datetime.now()
                session.commit()

    async def check_website_status(self, pattern: str, client: Optional[aiohttp.ClientSession] = None) -> dict:
        """Check website status using aiohttp for better async performance"""
        should_close = False
        if client is None:
            client = aiohttp.ClientSession()
            should_close = True

        try:
            async with client.get(f"http://{pattern}", timeout=5) as response:
                status = {
                    'is_up': response.status == 200,
                    'status_code': response.status
                }
                return status
        except Exception as e:
            return {
                'is_up': False,
                'error': str(e)
            }
        finally:
            if should_close:
                await client.close()

    def get_latest_matches(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get the most recent matches for watchlist patterns"""
        with get_session() as session:
            # Get latest target list
            latest_list = session.query(TargetList).order_by(desc(TargetList.ingested_at)).first()
            if not latest_list:
                return []

            # Get all targets from latest list
            latest_targets = session.query(Target).filter(Target.target_list_id == latest_list.id).all()
            
            # Get all watchlist items
            watchlist_items = session.query(WatchlistItem).all()

            matches = []
            for target in latest_targets:
                for item in watchlist_items:
                    if self._target_matches_pattern(target, item.pattern):
                        matches.append({
                            'target': target,
                            'pattern': item.pattern,
                            'severity': item.severity,
                            'match_time': datetime.now()
                        })

            # Return most recent matches
            return sorted(matches, key=lambda x: x['match_time'], reverse=True)[:limit]

# Create a singleton instance
monitor = DatabaseMonitor()

# Function to start the monitoring loop
async def start_monitoring():
    await monitor.start_monitoring()
