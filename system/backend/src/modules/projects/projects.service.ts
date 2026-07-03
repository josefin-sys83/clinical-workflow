import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../../db/pg';
import { CreateProjectDto } from './dto';

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: 'active' | 'completed';
  data?: any;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProjectsService {
  async list(): Promise<Project[]> {
    const { rows } = await getPool().query(
      `select id, name, description, status, data, created_at as "createdAt", updated_at as "updatedAt"
       from projects order by created_at desc`,
    );
    return rows;
  }

  async listCompleted(): Promise<Project[]> {
    const { rows } = await getPool().query(
      `select id, name, description, status, data, created_at as "createdAt", updated_at as "updatedAt"
       from projects where status='completed' order by created_at desc`,
    );
    return rows;
  }

  async get(id: string): Promise<Project> {
    const { rows } = await getPool().query(
      `select id, name, description, status, data, created_at as "createdAt", updated_at as "updatedAt"
       from projects where id=$1`,
      [id],
    );
    const p = rows[0];
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }

  private async generateProjectId(): Promise<string> {
    const year = new Date().getFullYear();
    const { rows } = await getPool().query(
      `select count(*) as count from projects where id::text like $1`,
      [`${year}-%`],
    );
    const count = parseInt(rows[0].count, 10) + 1;
    const padded = String(count).padStart(3, '0');
    return `${year}-${padded}`;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const id = await this.generateProjectId();
    const now = new Date().toISOString();
    await getPool().query(
      `insert into projects (id, name, description, status, created_at, updated_at)
       values ($1,$2,$3,'active',$4,$4)`,
      [id, dto.name, dto.description ?? null, now],
    );
    await getPool().query(
      `insert into workflow_step_state (project_id, step_id, state, updated_at)
       select $1, step_id, 'draft', $2 from workflow_steps`,
      [id, now],
    );
    return this.get(id);
  }

  async update(id: string, patch: { name?: string; description?: string; data?: any }): Promise<Project> {
    const now = new Date().toISOString();

    // If data is provided, merge with existing data instead of overwriting.
    // Deep-merge one level so nested keys like `synopsis` are merged rather than replaced.
    if (patch.data) {
      const existing = await this.get(id);
      const existingData = existing.data || {};
      const mergedData: any = { ...existingData };
      for (const key of Object.keys(patch.data)) {
        if (
          patch.data[key] !== null &&
          typeof patch.data[key] === 'object' &&
          !Array.isArray(patch.data[key]) &&
          existingData[key] !== null &&
          typeof existingData[key] === 'object' &&
          !Array.isArray(existingData[key])
        ) {
          mergedData[key] = { ...existingData[key], ...patch.data[key] };
        } else {
          mergedData[key] = patch.data[key];
        }
      }
      await getPool().query(
        `update projects set 
          name=coalesce($2,name), 
          description=coalesce($3,description),
          data=$4,
          updated_at=$5 
         where id=$1`,
        [id, patch.name ?? null, patch.description ?? null, JSON.stringify(mergedData), now],
      );
    } else {
      await getPool().query(
        `update projects set 
          name=coalesce($2,name), 
          description=coalesce($3,description),
          updated_at=$4 
         where id=$1`,
        [id, patch.name ?? null, patch.description ?? null, now],
      );
    }
    return this.get(id);
  }

  async saveSynopsisFile(projectId: string, fileName: string, bytes: Buffer, mimeType: string): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.get(projectId);
    const mergedData = {
      ...(existing.data || {}),
      synopsisFile: {
        fileName,
        mimeType,
        bytes: bytes.toString('base64'),
        uploadedAt: now,
      },
    };
    await getPool().query(
      `update projects set data=$2, updated_at=$3 where id=$1`,
      [projectId, JSON.stringify(mergedData), now],
    );
  }

  async getSynopsisFile(projectId: string): Promise<{ fileName: string; mimeType: string; bytes: Buffer }> {
    const project = await this.get(projectId);
    const file = project.data?.synopsisFile;
    if (!file) throw new NotFoundException('No synopsis file found');
    return {
      fileName: file.fileName,
      mimeType: file.mimeType,
      bytes: Buffer.from(file.bytes, 'base64'),
    };
  }
}