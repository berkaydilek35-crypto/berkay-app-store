CREATE TABLE IF NOT EXISTS sayac (
  a   TEXT NOT NULL,           -- uygulama kısa adı (acaba)
  t   TEXT NOT NULL,           -- olay: open, first, installed, open-click, install-click, share-click, view…
  gun TEXT NOT NULL,           -- İstanbul günü (2026-10-17)
  n   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (a, t, gun)
) WITHOUT ROWID;
