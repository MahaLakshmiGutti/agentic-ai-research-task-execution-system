from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False, "timeout": 30},
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:
    # WAL mode lets readers (status/events polling) proceed without blocking
    # behind the background pipeline thread's frequent event-log writes,
    # instead of SQLite's default mode where every reader waits for the
    # writer - which was freezing the whole event loop under concurrent
    # polling and causing "failed to fetch" for other requests.
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from app import models  # noqa: F401 - ensure models are registered

    Base.metadata.create_all(bind=engine)
