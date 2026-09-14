"""Replay migrations, back up a fixture database, restore it and verify all rows.
This is a local SQLite recovery drill, not a Cloudflare Time Travel/R2 test.
"""
from pathlib import Path
import sqlite3
import tempfile

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="avyron-restore-") as directory:
    source = sqlite3.connect(Path(directory) / "source.sqlite")
    for migration in sorted((root / "cloudflare/d1/migrations").glob("*.sql")):
        source.executescript(migration.read_text())
    source.executescript("""
      INSERT INTO users(id,email,password_hash,created_at,updated_at)
      VALUES ('restore-user','restore@example.test','fixture-not-a-credential',1,1);
      INSERT INTO clients(id,company_name,email,created_at)
      VALUES ('restore-client','Restore fixture','restore@example.test',1);
      INSERT INTO client_account_access VALUES ('restore-client','restore-user','restore-user',1);
      INSERT INTO projects(id,client_id,name,slug,created_at)
      VALUES ('restore-project','restore-client','Restore fixture','restore-fixture',1);
      INSERT INTO project_work_items(id,project_id,kind,title,created_by,created_at,updated_at)
      VALUES ('restore-work','restore-project','deliverable','Restore verification','restore-user',1,1);
      INSERT INTO financial_revenues(id,revenue_type,service_name,currency,gross_amount_minor,status,created_at,updated_at)
      VALUES ('restore-revenue','other','Restore fixture','RON',10000,'sent',1,1);
      INSERT INTO financial_receipts(id,revenue_id,amount_minor,currency,reference,paid_at,created_by,created_at)
      VALUES ('restore-receipt','restore-revenue',2500,'RON','fixture-reference',1,'restore-user',1);
    """)
    source.commit()
    backup = sqlite3.connect(Path(directory) / "backup.sqlite")
    source.backup(backup)
    restored = sqlite3.connect(Path(directory) / "restored.sqlite")
    backup.backup(restored)
    restored.execute("PRAGMA foreign_keys=ON")
    assert restored.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert not restored.execute("PRAGMA foreign_key_check").fetchall()
    tables = source.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
    for (name,) in tables:
        quoted = '"' + name.replace('"', '""') + '"'
        before = sorted(map(repr, source.execute(f"SELECT * FROM {quoted}").fetchall()))
        after = sorted(map(repr, restored.execute(f"SELECT * FROM {quoted}").fetchall()))
        assert before == after, f"Restore mismatch: {name}"
    assert restored.execute("SELECT status FROM financial_revenues WHERE id='restore-revenue'").fetchone()[0] == "partially_paid"
    print(f"Local restore OK: {len(tables)} tables compared; receipt, access and delivery fixtures preserved; foreign keys and integrity OK.")
    restored.close()
    backup.close()
    source.close()
