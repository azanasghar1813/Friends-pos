export default {
  version: '047',
  name: 'ensure_critical_tables',
  disableForeignKeys: true,

  up: (db) => {
    // 1. activity_logs table (required by activityLogService, dashboardService, historyRepository)
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
    `);

    // 2. printer_status_log table (required by printerManagerService)
    db.exec(`
      CREATE TABLE IF NOT EXISTS printer_status_log (
        id            TEXT PRIMARY KEY,
        printer_id    TEXT NOT NULL,
        status        TEXT NOT NULL,
        error_detail  TEXT,
        job_id        TEXT,
        recorded_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_printer_status_printer ON printer_status_log(printer_id, recorded_at);
    `);

    // 3. sync_queue table (required by syncService, offline sync)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        attempts INTEGER DEFAULT 0,
        last_attempt_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        permanent_failure BOOLEAN DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    `);

    // 4. sync_conflicts table (required by conflict resolver)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_version INTEGER,
        server_version INTEGER,
        resolution TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      );
    `);

    // 5. backup_history table (required by backupService)
    db.exec(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'SUCCESS',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. ticket_leases table (required by sequence/ticket leasing)
    db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_leases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        business_date TEXT NOT NULL,
        range_start INTEGER NOT NULL,
        range_end INTEGER NOT NULL,
        next_sequence INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_id, range_start)
      );
    `);
  },

  down: (db) => {
    // Non-destructive rollback
  }
};
