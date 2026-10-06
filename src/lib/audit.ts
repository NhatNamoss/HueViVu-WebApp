import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

export function writeAudit(db: Database.Database, input: {
  actorId: string; action: string; entityType: string; entityId: string;
  before?: unknown; after?: unknown; note?: string;
}) {
  db.prepare(`INSERT INTO audit_logs
    (id, actor_id, action, entity_type, entity_id, before_data, after_data, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uuidv4(), input.actorId, input.action, input.entityType, input.entityId,
    input.before === undefined ? null : JSON.stringify(input.before),
    input.after === undefined ? null : JSON.stringify(input.after),
    input.note || null,
  );
}
