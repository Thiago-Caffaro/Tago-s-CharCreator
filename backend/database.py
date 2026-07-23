from sqlmodel import SQLModel, create_engine, Session
from .config import settings
import os

os.makedirs("data", exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,
)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _add_missing_columns()


def _add_missing_columns():
    """Minimal auto-migration for SQLite.

    create_all() only creates tables that don't exist yet — it never alters
    an existing table, so a model field added after a database file is
    already on disk (e.g. GenerationRule.is_builtin) would otherwise 500 on
    first read/write against that column. There's no Alembic in this project,
    so this walks the declared metadata and ALTER TABLE ADD COLUMNs anything
    missing, using each column's declared default. Only ever adds columns —
    never drops, renames, or alters existing ones.
    """
    with engine.connect() as conn:
        for table in SQLModel.metadata.sorted_tables:
            existing_cols = {
                row[1] for row in conn.exec_driver_sql(f'PRAGMA table_info("{table.name}")')
            }
            if not existing_cols:
                continue  # table itself doesn't exist yet — create_all already handled it
            for column in table.columns:
                if column.name in existing_cols:
                    continue
                col_type = column.type.compile(engine.dialect)
                default_sql = ""
                if column.default is not None and getattr(column.default, "is_scalar", False):
                    value = column.default.arg
                    if isinstance(value, bool):
                        default_sql = f" DEFAULT {1 if value else 0}"
                    elif isinstance(value, (int, float)):
                        default_sql = f" DEFAULT {value}"
                    elif isinstance(value, str):
                        escaped = value.replace("'", "''")
                        default_sql = f" DEFAULT '{escaped}'"
                conn.exec_driver_sql(
                    f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}{default_sql}'
                )
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
