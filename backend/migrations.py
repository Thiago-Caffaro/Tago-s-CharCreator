import shutil
from pathlib import Path

from alembic import command
from alembic.config import Config

from .config import settings


def _sqlite_path() -> Path | None:
    prefix = "sqlite:///"
    if not settings.database_url.startswith(prefix):
        return None
    return Path(settings.database_url[len(prefix):])


def backup_legacy_database() -> None:
    db_path = _sqlite_path()
    if not db_path or not db_path.exists():
        return
    backup_dir = db_path.parent / "backups"
    is_primary_database = db_path.name == "tagosCharCreator.db"
    marker = backup_dir / (".accounts-migration-20260921_01-backed-up" if is_primary_database else f".{db_path.stem}-accounts-migration-backed-up")
    if marker.exists():
        return
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_name = "pre-accounts-20260921_01.db" if is_primary_database else f"pre-accounts-{db_path.stem}.db"
    shutil.copy2(db_path, backup_dir / backup_name)
    marker.write_text("20260921_01\n", encoding="utf-8")


def run_migrations() -> None:
    backup_legacy_database()
    cfg = Config()
    cfg.attributes["application_package"] = __package__
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parent / "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(cfg, "head")
