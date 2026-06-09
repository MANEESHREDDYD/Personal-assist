import sqlite3
import contextlib
from .config import DB_PATH

@contextlib.contextmanager
def get_db_connection():
    """Yields a SQLite connection, managing open/close safely."""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        yield conn
    finally:
        if conn:
            conn.close()

def query_one(sql_or_path, params=()):
    """Executes a query and returns a single row as a dict."""
    if sql_or_path.endswith('.sql'):
        with open(sql_or_path, 'r', encoding='utf-8') as f:
            sql = f.read()
    else:
        sql = sql_or_path

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else {}

def query_all(sql_or_path, params=()):
    """Executes a query and returns all rows as a list of dicts."""
    if sql_or_path.endswith('.sql'):
        with open(sql_or_path, 'r', encoding='utf-8') as f:
            sql = f.read()
    else:
        sql = sql_or_path

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]
