from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone
from sqlalchemy.types import TypeDecorator

from config import DB_PATH

class TZDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if not value.tzinfo:
                value = value.replace(tzinfo=timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            value = value.replace(tzinfo=timezone.utc)
        return value

Base = declarative_base()

class TargetList(Base):
    __tablename__ = 'target_lists'

    id = Column(Integer, primary_key=True)
    filename = Column(String, unique=True)
    ingested_at = Column(TZDateTime, default=lambda: datetime.now(timezone.utc))
    targets = relationship("Target", back_populates="target_list")

class Target(Base):
    __tablename__ = 'targets'

    id = Column(Integer, primary_key=True)
    target_id = Column(String)
    request_id = Column(String)
    host = Column(String)
    ip = Column(String)
    type = Column(String)
    method = Column(String)
    port = Column(Integer)
    use_ssl = Column(Boolean)
    path = Column(String)
    body = Column(JSON)
    headers = Column(JSON)
    attacks = Column(Integer, default=1)  # Track number of attacks
    target_list_id = Column(Integer, ForeignKey('target_lists.id'))
    target_list = relationship("TargetList", back_populates="targets")
    first_seen = Column(TZDateTime)
    last_seen = Column(TZDateTime)

class WatchlistItem(Base):
    __tablename__ = 'watchlist'

    id = Column(Integer, primary_key=True)
    pattern = Column(String, unique=True)
    description = Column(String)
    severity = Column(String)  # high, medium, low
    created_at = Column(TZDateTime, default=lambda: datetime.now(timezone.utc))
    last_match = Column(TZDateTime, nullable=True)
    last_check = Column(TZDateTime, nullable=True)
    is_up = Column(Boolean, default=True)

def init_db():
    """Initialize the database"""
    engine = create_engine(f'sqlite:///{DB_PATH}')
    Base.metadata.create_all(engine)

if __name__ == "__main__":
    init_db()
