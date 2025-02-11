from sqlalchemy import Column, Integer, String, Boolean, DateTime, create_engine, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

Base = declarative_base()

class Target(Base):
    __tablename__ = 'targets'
    
    id = Column(Integer, primary_key=True)
    target_id = Column(String)
    request_id = Column(String)
    host = Column(String, index=True)
    ip = Column(String, index=True)
    type = Column(String)
    method = Column(String)
    port = Column(Integer)
    use_ssl = Column(Boolean, default=False)
    path = Column(String)
    body = Column(JSON)
    headers = Column(JSON)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    attacks = Column(Integer, default=1)  # Add attacks column with default value of 1
    target_list_id = Column(Integer, ForeignKey('target_lists.id'))
    target_list = relationship("TargetList", back_populates="targets")

class TargetList(Base):
    __tablename__ = 'target_lists'
    
    id = Column(Integer, primary_key=True)
    filename = Column(String)
    ingested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    processed = Column(Boolean, default=False)
    targets = relationship("Target", back_populates="target_list")

class WatchlistItem(Base):
    __tablename__ = 'watchlist'
    
    id = Column(Integer, primary_key=True)
    pattern = Column(String, unique=True)
    description = Column(String)
    severity = Column(String)  # high, medium, low
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_match = Column(DateTime, nullable=True)
    last_check = Column(DateTime, nullable=True)
    is_up = Column(Boolean, default=True)
    last_status = Column(Integer, nullable=True)  # Added this column
    match_count = Column(Integer, default=0)  # Add match count column

