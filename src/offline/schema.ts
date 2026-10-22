export const OFFLINE_SCHEMA_VERSION = 1;

/**
 * Esquema local. Todo es aditivo e idempotente: se ejecuta al abrir la DB.
 * Las tablas viven en una base por usuario y cifrada con SQLCipher.
 */
export const OFFLINE_SCHEMA: string[] = [
  `PRAGMA journal_mode = WAL;`,
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS offline_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_client_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    depends_on TEXT,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at INTEGER,
    last_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS outbox_status_idx ON outbox(status, next_attempt_at);`,
  `CREATE TABLE IF NOT EXISTS local_rounds (
    client_id TEXT PRIMARY KEY,
    server_id INTEGER,
    guard_id INTEGER NOT NULL,
    route_id INTEGER,
    route_title TEXT,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    sync_state TEXT NOT NULL,
    last_error TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS local_checks (
    client_id TEXT PRIMARY KEY,
    server_id INTEGER,
    round_client_id TEXT,
    location_id INTEGER NOT NULL,
    location_name TEXT,
    status TEXT NOT NULL,
    notes TEXT,
    tasks_json TEXT,
    scanned_at INTEGER,
    completed_at INTEGER,
    sync_state TEXT NOT NULL,
    last_error TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS local_checks_round_idx ON local_checks(round_client_id);`,
  `CREATE TABLE IF NOT EXISTS local_reports (
    client_id TEXT PRIMARY KEY,
    server_id INTEGER,
    kind TEXT NOT NULL,
    category_id INTEGER,
    type_id INTEGER,
    title TEXT,
    description TEXT,
    latitude REAL,
    longitude REAL,
    created_at INTEGER NOT NULL,
    sync_state TEXT NOT NULL,
    last_error TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS local_media (
    client_id TEXT PRIMARY KEY,
    report_client_id TEXT,
    check_client_id TEXT,
    kind TEXT NOT NULL,
    local_path TEXT NOT NULL,
    mime_type TEXT,
    bytes INTEGER,
    server_url TEXT,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS local_media_parent_idx ON local_media(report_client_id, check_client_id);`,
  `CREATE TABLE IF NOT EXISTS local_snapshot (
    key TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS catalog_cache (
    cache_key TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    expires_at INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS sync_state (
    key TEXT PRIMARY KEY,
    value TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS sync_conflicts (
    id TEXT PRIMARY KEY,
    entity_client_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    server_message TEXT,
    payload_json TEXT,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
  );`,
  `INSERT OR IGNORE INTO offline_meta(key, value) VALUES ('schema_version', '${OFFLINE_SCHEMA_VERSION}');`,
];
