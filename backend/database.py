import os

from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine

from .config import settings

os.makedirs("data", exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,
)


@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_connection, _):
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def create_db_and_tables():
    # Schema changes are handled exclusively by Alembic. create_all remains
    # useful for legacy model tables when bootstrapping a completely empty DB.
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
