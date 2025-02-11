from models import Base
from database import engine

def migrate():
    print("Running database migration...")
    Base.metadata.create_all(engine)
    print("Migration completed successfully")

if __name__ == "__main__":
    migrate()