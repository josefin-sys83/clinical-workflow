import { Injectable } from '@nestjs/common';
import { getPool } from '../../db/pg';
import { randomUUID } from 'crypto';
import { CreateAuditEventDto } from './dto';

export type AuditEvent = {
  id: string;
  projectId: string;
  stepId: string | null;
  type: string;
  message: string;
  actorUserId: string | null;
  metadata: any;
  createdAt: string;
};

@Injectable()
export class AuditService {
  async list(projectId: string, stepId?: string): Promise<AuditEvent[]> {
    const params: any[] = [projectId];
    let where = 'where project_id=$1';
    if (stepId) {
      params.push(stepId);
      where += ` and step_id=$2`;
    }
    const { rows } = await getPool().query(
      `select id, project_id as "projectId", step_id as "stepId", type, message,
              actor_user_id as "actorUserId", metadata, created_at as "createdAt"
       from audit_event
       ${where}
       order by created_at desc
       limit 500`,
      params,
    );
    return rows;
  }

  async create(projectId: string, dto: CreateAuditEventDto) {
    const metadata = dto.metadataJson ? safeJsonParse(dto.metadataJson) : null;
    return this.record({
      projectId,
      stepId: dto.stepId ?? null,
      type: dto.type,
      message: dto.message,
      actorUserId: dto.actorUserId ?? null,
      metadata,
    });
  }

  async record(args: { projectId: string; stepId: string | null; type: string; message: string; actorUserId: string | null; metadata: any }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    await getPool().query(
      `insert into audit_event (id, project_id, step_id, type, message, actor_user_id, metadata, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, args.projectId, args.stepId, args.type, args.message, args.actorUserId, args.metadata, now],
    );
    return { id, ...args, createdAt: now };
  }
}

function safeJsonParse(s: string): any {
  try { return JSON.parse(s); } catch { return { raw: s }; }
}
