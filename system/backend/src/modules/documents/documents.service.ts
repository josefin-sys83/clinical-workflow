import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  randomUUID,
  createHash,
  createSign,
  createVerify,
  generateKeyPairSync,
} from 'crypto';
import { getPool } from '../../db/pg';
import PDFDocument from 'pdfkit';

type DocType = 'protocol' | 'report';

async function buildPdfBytes(args: { projectId: string; docType: DocType; note?: string }): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const title = args.docType === 'protocol' ? 'Protocol' : 'Report';
  doc.fontSize(20).text(`${title} Export`, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('gray').text(`Project ID: ${args.projectId}`);
  doc.text(`Generated: ${new Date().toISOString()}`);
  if (args.note) doc.text(`Note: ${args.note}`);
  doc.fillColor('black');

  doc.moveDown(1);

  // Include a minimal snapshot of workflow step states (best effort).
  try {
    const { rows } = await getPool().query(
      `select step_id, state, updated_at
       from workflow_step_state
       where project_id = $1
       order by step_id asc`,
      [args.projectId],
    );
    if (rows.length) {
      doc.fontSize(12).text('Workflow snapshot', { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(10);
      for (const r of rows) {
        doc.text(`${String(r.step_id)}: ${String(r.state)} (updated ${new Date(r.updated_at).toISOString()})`);
      }
      doc.moveDown(1);
    }
  } catch {
    // ignore
  }

  // Include last audit events (best effort).
  try {
    const { rows } = await getPool().query(
      `select occurred_at, step_id, type, message
       from audit_event
       where project_id = $1
       order by occurred_at desc
       limit 25`,
      [args.projectId],
    );
    if (rows.length) {
      doc.fontSize(12).text('Recent audit events', { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(10);
      for (const r of rows) {
        const when = new Date(r.occurred_at).toISOString();
        doc.text(`[${when}] ${String(r.step_id)} · ${String(r.type)} · ${String(r.message)}`);
      }
      doc.moveDown(1);
    }
  } catch {
    // ignore
  }

  doc.fontSize(9).fillColor('gray').text('This document is system-generated. Verify hash and signature chain in the system.', {
    align: 'left',
  });
  doc.end();

  return await done;
}

function resolveSigningKeys(): { privateKeyPem: string; publicKeyPem: string; keyId: string } {
  // Prefer explicit keys (so you can deploy safely).
  const envPriv = process.env.SIGNING_PRIVATE_KEY_PEM;
  const envPub = process.env.SIGNING_PUBLIC_KEY_PEM;
  if (envPriv && envPub) {
    const keyId = createHash('sha256').update(envPub).digest('hex');
    return { privateKeyPem: envPriv, publicKeyPem: envPub, keyId };
  }

  // Dev fallback: ephemeral keypair.
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  const keyId = createHash('sha256').update(publicKey).digest('hex');
  return { privateKeyPem: privateKey, publicKeyPem: publicKey, keyId };
}

@Injectable()
export class DocumentsService {
  private readonly signingKeys = resolveSigningKeys();

  async finalize(args: { projectId: string; docType: DocType; userId?: string; userRoles?: string[]; note?: string }) {
    const id = randomUUID();
    const fileName = `${args.docType}-${args.projectId}-${Date.now()}.pdf`;
    const contentType = 'application/pdf';
    const bytes = await buildPdfBytes({ projectId: args.projectId, docType: args.docType, note: args.note });
    const sha256 = createHash('sha256').update(bytes).digest('hex');

    await getPool().query(
      `insert into document_artifact (
         id, project_id, doc_type, file_name, content_type, sha256, bytes,
         created_by_user_id, created_by_roles, created_at
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())`,
      [
        id,
        args.projectId,
        args.docType,
        fileName,
        contentType,
        sha256,
        bytes,
        args.userId ?? null,
        args.userRoles?.join(',') ?? null,
      ],
    );

    return { id, fileName, contentType, sha256 };
  }

  async verify(args: { projectId: string; artifactId: string; verifierUserId?: string }) {
    const a = await this.get({ projectId: args.projectId, artifactId: args.artifactId });
    const computed = createHash('sha256').update(a.bytes).digest('hex');
    const ok = computed === a.sha256;

    // best-effort: persist verification timestamp
    try {
      await getPool().query(
        `update document_artifact set verified_at=now(), verified_by_user_id=$3 where project_id=$1 and id=$2`,
        [args.projectId, args.artifactId, args.verifierUserId ?? null],
      );
    } catch {
      // ignore
    }

    return {
      artifactId: a.id,
      sha256Stored: a.sha256,
      sha256Computed: computed,
      match: ok,
    };
  }

  async signArtifact(args: {
    projectId: string;
    artifactId: string;
    signerUserId: string;
    signerRoles?: string[];
  }) {
    if (!args.signerUserId) throw new BadRequestException('Missing signer user');

    const a = await this.get({ projectId: args.projectId, artifactId: args.artifactId });

    // Sign the stored SHA-256 hex string (stable across transports).
    const signer = createSign('RSA-SHA256');
    signer.update(a.sha256, 'utf8');
    signer.end();

    const signature = signer.sign(this.signingKeys.privateKeyPem);
    const id = randomUUID();

    await getPool().query(
      `insert into document_artifact_signature (
         id, artifact_id, signed_at, signed_by_user_id, signed_by_roles,
         algorithm, key_id, public_key_pem, signature
       )
       values ($1,$2,now(),$3,$4,$5,$6,$7,$8)`,
      [
        id,
        args.artifactId,
        args.signerUserId,
        args.signerRoles ?? [],
        'RSA-SHA256',
        this.signingKeys.keyId,
        this.signingKeys.publicKeyPem,
        signature,
      ],
    );

    return {
      signatureId: id,
      artifactId: a.id,
      algorithm: 'RSA-SHA256',
      keyId: this.signingKeys.keyId,
      signedAt: new Date().toISOString(),
      signedBy: { userId: args.signerUserId, roles: args.signerRoles ?? [] },
    };
  }

  async listSignatures(args: { projectId: string; artifactId: string }) {
    // Ensure artifact exists and belongs to project.
    await this.get({ projectId: args.projectId, artifactId: args.artifactId });

    const { rows } = await getPool().query(
      `select id, artifact_id, signed_at, signed_by_user_id, signed_by_roles, algorithm, key_id
       from document_artifact_signature
       where artifact_id = $1
       order by signed_at desc`,
      [args.artifactId],
    );

    return rows.map((r: any) => ({
      signatureId: String(r.id),
      artifactId: String(r.artifact_id),
      signedAt: new Date(r.signed_at).toISOString(),
      signedBy: { userId: String(r.signed_by_user_id), roles: (r.signed_by_roles ?? []) as string[] },
      algorithm: String(r.algorithm),
      keyId: String(r.key_id),
    }));
  }

  async verifyChain(args: { projectId: string; artifactId: string; verifierUserId?: string }) {
    const artifact = await this.get({ projectId: args.projectId, artifactId: args.artifactId });
    const computed = createHash('sha256').update(artifact.bytes).digest('hex');
    const artifactMatch = computed === artifact.sha256;

    const { rows } = await getPool().query(
      `select id, signed_at, signed_by_user_id, signed_by_roles, algorithm, key_id, public_key_pem, signature
       from document_artifact_signature
       where artifact_id = $1
       order by signed_at asc`,
      [args.artifactId],
    );

    const signatures = rows.map((r: any) => {
      const verifier = createVerify(String(r.algorithm));
      verifier.update(artifact.sha256, 'utf8');
      verifier.end();
      const ok = verifier.verify(String(r.public_key_pem), r.signature as Buffer);
      return {
        signatureId: String(r.id),
        signedAt: new Date(r.signed_at).toISOString(),
        signedBy: { userId: String(r.signed_by_user_id), roles: (r.signed_by_roles ?? []) as string[] },
        algorithm: String(r.algorithm),
        keyId: String(r.key_id),
        match: ok,
      };
    });

    // best-effort: persist verification timestamp on artifact too
    try {
      await getPool().query(
        `update document_artifact set verified_at=now(), verified_by_user_id=$3 where project_id=$1 and id=$2`,
        [args.projectId, args.artifactId, args.verifierUserId ?? null],
      );
    } catch {
      // ignore
    }

    return {
      artifact: {
        artifactId: artifact.id,
        sha256Stored: artifact.sha256,
        sha256Computed: computed,
        match: artifactMatch,
      },
      signatures,
    };
  }

  async get(args: { projectId: string; artifactId: string }) {
    const { rows } = await getPool().query(
      `select id, project_id, doc_type, file_name, content_type, sha256, bytes, created_at
       from document_artifact
       where project_id = $1 and id = $2`,
      [args.projectId, args.artifactId],
    );
    const a = rows[0];
    if (!a) throw new NotFoundException('Artifact not found');

    return {
      id: String(a.id),
      projectId: String(a.project_id),
      docType: String(a.doc_type),
      fileName: String(a.file_name),
      contentType: String(a.content_type),
      sha256: String(a.sha256),
      bytes: a.bytes as Buffer,
      createdAt: a.created_at,
    };
  }

  // -------------------------
  // Addendums (appendices)
  // -------------------------

  private indexToLetter(i: number): string {
    // 0 -> A ... 25 -> Z, 26 -> AA
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let n = i;
    let s = '';
    do {
      s = alphabet[n % 26] + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
  }

  async listAddendums(args: { projectId: string; docType: DocType; releaseArtifactId: string }) {
    const { rows } = await getPool().query(
      `select id, project_id, doc_type, release_artifact_id, letter, title, description, change_reason,
              status, signed_artifact_id, created_by_user_id, created_at, updated_at, locked_at
       from document_addendum
       where project_id = $1 and doc_type = $2 and release_artifact_id = $3
       order by created_at asc`,
      [args.projectId, args.docType, args.releaseArtifactId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      docType: String(r.doc_type),
      releaseArtifactId: String(r.release_artifact_id),
      letter: String(r.letter),
      title: String(r.title),
      description: r.description ?? null,
      changeReason: String(r.change_reason),
      status: String(r.status),
      signedArtifactId: r.signed_artifact_id ? String(r.signed_artifact_id) : null,
      createdByUserId: r.created_by_user_id ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lockedAt: r.locked_at ?? null,
    }));
  }

  async getAddendum(args: { projectId: string; docType: DocType; addendumId: string }) {
    const { rows } = await getPool().query(
      `select id, project_id, doc_type, release_artifact_id, letter, title, description, change_reason,
              status, signed_artifact_id, created_by_user_id, created_at, updated_at, locked_at
       from document_addendum
       where project_id = $1 and doc_type = $2 and id = $3`,
      [args.projectId, args.docType, args.addendumId],
    );
    const r = rows[0];
    if (!r) throw new NotFoundException('Addendum not found');
    const approvals = await this.listAddendumApprovals({ addendumId: String(r.id) });
    const files = await this.listAddendumFiles({ addendumId: String(r.id) });
    return {
      id: String(r.id),
      projectId: String(r.project_id),
      docType: String(r.doc_type),
      releaseArtifactId: String(r.release_artifact_id),
      letter: String(r.letter),
      title: String(r.title),
      description: r.description ?? null,
      changeReason: String(r.change_reason),
      status: String(r.status),
      signedArtifactId: r.signed_artifact_id ? String(r.signed_artifact_id) : null,
      createdByUserId: r.created_by_user_id ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lockedAt: r.locked_at ?? null,
      approvals,
      files,
    };
  }

  async createAddendum(args: {
    projectId: string;
    docType: DocType;
    releaseArtifactId: string;
    title: string;
    description?: string;
    changeReason: string;
    actorUserId?: string | null;
  }) {
    // Ensure release artifact exists for this project/docType.
    const { rows: arows } = await getPool().query(
      `select id from document_artifact where project_id = $1 and doc_type = $2 and id = $3`,
      [args.projectId, args.docType, args.releaseArtifactId],
    );
    if (!arows[0]) throw new BadRequestException('Release artifact not found for this project/docType');

    const { rows: cntRows } = await getPool().query(
      `select count(*)::int as n from document_addendum where release_artifact_id = $1`,
      [args.releaseArtifactId],
    );
    const n = Number(cntRows[0]?.n ?? 0);
    const letter = this.indexToLetter(n);

    const id = randomUUID();
    const now = new Date();
    await getPool().query(
      `insert into document_addendum (
        id, project_id, doc_type, release_artifact_id, letter, title, description, change_reason,
        status, created_by_user_id, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10,$10)`,
      [
        id,
        args.projectId,
        args.docType,
        args.releaseArtifactId,
        letter,
        args.title,
        args.description ?? null,
        args.changeReason,
        args.actorUserId ?? null,
        now,
      ],
    );

    // Create reviewer approval slot (same role requirements as the system currently supports).
    await getPool().query(
      `insert into document_addendum_approval (id, addendum_id, role, status) values ($1,$2,'reviewer','pending')
       on conflict (addendum_id, role) do nothing`,
      [randomUUID(), id],
    );

    return await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: id });
  }

  async updateAddendum(args: {
    projectId: string;
    docType: DocType;
    addendumId: string;
    title?: string;
    description?: string;
    changeReason?: string;
  }) {
    const current = await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
    if (current.status !== 'draft') throw new BadRequestException('Only draft addendums can be edited');

    const now = new Date();
    await getPool().query(
      `update document_addendum
       set title = coalesce($4, title),
           description = coalesce($5, description),
           change_reason = coalesce($6, change_reason),
           updated_at = $7
       where project_id=$1 and doc_type=$2 and id=$3`,
      [args.projectId, args.docType, args.addendumId, args.title ?? null, args.description ?? null, args.changeReason ?? null, now],
    );
    return await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
  }

  async startAddendumReview(args: { projectId: string; docType: DocType; addendumId: string }) {
    const current = await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
    if (current.status !== 'draft') throw new BadRequestException('Addendum is not in draft state');

    const now = new Date();
    await getPool().query(
      `update document_addendum set status='in_review', updated_at=$4 where project_id=$1 and doc_type=$2 and id=$3`,
      [args.projectId, args.docType, args.addendumId, now],
    );
    return await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
  }

  async approveAddendumAsReviewer(args: { projectId: string; docType: DocType; addendumId: string; actorUserId?: string | null; approve: boolean; comment?: string }) {
    const current = await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
    if (current.status !== 'in_review') throw new BadRequestException('Addendum is not in review');

    const now = new Date();
    await getPool().query(
      `update document_addendum_approval
       set status = $2, actor_user_id=$3, acted_at=$4, comment=$5
       where addendum_id=$1 and role='reviewer'`,
      [args.addendumId, args.approve ? 'approved' : 'rejected', args.actorUserId ?? null, now, args.comment ?? null],
    );

    if (args.approve) {
      // If reviewer approved, mark addendum approved (ready for signing).
      await getPool().query(
        `update document_addendum set status='approved', updated_at=$4 where project_id=$1 and doc_type=$2 and id=$3`,
        [args.projectId, args.docType, args.addendumId, now],
      );
    } else {
      // If rejected, send back to draft.
      await getPool().query(
        `update document_addendum set status='draft', updated_at=$4 where project_id=$1 and doc_type=$2 and id=$3`,
        [args.projectId, args.docType, args.addendumId, now],
      );
    }

    return await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
  }

  async signAddendum(args: { projectId: string; docType: DocType; addendumId: string; signerUserId?: string | null; signerRoles?: string[] }) {
    const current = await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
    if (current.status !== 'approved') throw new BadRequestException('Addendum must be approved before signing');

    const bytes = await this.buildAddendumPdfBytes({
      projectId: args.projectId,
      docType: args.docType,
      letter: current.letter,
      title: current.title,
      description: current.description ?? undefined,
      changeReason: current.changeReason,
      releaseArtifactId: current.releaseArtifactId,
      addendumId: current.id,
    });

    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const id = randomUUID();
    const fileName = `${args.docType}-addendum-${current.letter}.pdf`;
    const now = new Date();

    await getPool().query(
      `insert into document_artifact (id, project_id, doc_type, file_name, content_type, sha256, bytes, created_by_user_id, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, args.projectId, args.docType, fileName, 'application/pdf', sha256, bytes, args.signerUserId ?? null, now],
    );

    const roles = Array.isArray(args.signerRoles) ? args.signerRoles : [];
    await this.signArtifact({
      projectId: args.projectId,
      artifactId: id,
  signerUserId: args.signerUserId ?? '',
      signerRoles: roles,
    });

    await getPool().query(
      `update document_addendum set status='signed', signed_artifact_id=$4, updated_at=$5 where project_id=$1 and doc_type=$2 and id=$3`,
      [args.projectId, args.docType, args.addendumId, id, now],
    );

    return await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
  }

  async lockAddendum(args: { projectId: string; docType: DocType; addendumId: string }) {
    const current = await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
    if (current.status !== 'signed') throw new BadRequestException('Addendum must be signed before locking');

    const now = new Date();
    await getPool().query(
      `update document_addendum set status='locked', locked_at=$4, updated_at=$4 where project_id=$1 and doc_type=$2 and id=$3`,
      [args.projectId, args.docType, args.addendumId, now],
    );
    return await this.getAddendum({ projectId: args.projectId, docType: args.docType, addendumId: args.addendumId });
  }

  async listAddendumApprovals(args: { addendumId: string }) {
    const { rows } = await getPool().query(
      `select role, status, actor_user_id, acted_at, comment
       from document_addendum_approval
       where addendum_id=$1
       order by role asc`,
      [args.addendumId],
    );
    return rows.map((r) => ({
      role: String(r.role),
      status: String(r.status),
      actorUserId: r.actor_user_id ?? null,
      actedAt: r.acted_at ?? null,
      comment: r.comment ?? null,
    }));
  }

  async listAddendumFiles(args: { addendumId: string }) {
    const { rows } = await getPool().query(
      `select id, filename, mime_type, uploaded_by_user_id, uploaded_at
       from document_addendum_file
       where addendum_id=$1
       order by uploaded_at desc`,
      [args.addendumId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      filename: String(r.filename),
      mimeType: String(r.mime_type),
      uploadedByUserId: r.uploaded_by_user_id ?? null,
      uploadedAt: r.uploaded_at,
    }));
  }

  async uploadAddendumFile(args: { addendumId: string; filename: string; mimeType: string; bytes: Buffer; uploaderUserId?: string | null }) {
    const id = randomUUID();
    const now = new Date();
    await getPool().query(
      `insert into document_addendum_file (id, addendum_id, filename, mime_type, bytes, uploaded_by_user_id, uploaded_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [id, args.addendumId, args.filename, args.mimeType, args.bytes, args.uploaderUserId ?? null, now],
    );
    return { id, uploadedAt: now.toISOString() };
  }

  private async buildAddendumPdfBytes(args: {
    projectId: string;
    docType: DocType;
    letter: string;
    title: string;
    description?: string;
    changeReason: string;
    releaseArtifactId: string;
    addendumId: string;
  }): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const baseTitle = args.docType === 'protocol' ? 'Protocol' : 'Report';
    doc.fontSize(20).text(`${baseTitle} Addendum ${args.letter}`, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('gray').text(`Project ID: ${args.projectId}`);
    doc.text(`Release artifact: ${args.releaseArtifactId}`);
    doc.text(`Addendum ID: ${args.addendumId}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.fillColor('black');

    doc.moveDown(1);
    doc.fontSize(12).text('Title', { underline: true });
    doc.fontSize(11).text(args.title);
    doc.moveDown(0.75);

    doc.fontSize(12).text('Change reason', { underline: true });
    doc.fontSize(11).text(args.changeReason);
    doc.moveDown(0.75);

    if (args.description) {
      doc.fontSize(12).text('Description', { underline: true });
      doc.fontSize(11).text(args.description);
      doc.moveDown(0.75);
    }

    // Include file list (best effort)
    try {
      const { rows } = await getPool().query(
        `select filename, mime_type, uploaded_at from document_addendum_file where addendum_id=$1 order by uploaded_at asc`,
        [args.addendumId],
      );
      if (rows.length) {
        doc.fontSize(12).text('Attached files', { underline: true });
        doc.moveDown(0.25);
        doc.fontSize(10);
        for (const r of rows) {
          doc.text(`${String(r.filename)} (${String(r.mime_type)}) uploaded ${new Date(r.uploaded_at).toISOString()}`);
        }
        doc.moveDown(0.75);
      }
    } catch {
      // ignore
    }

    doc.end();
    return await done;
  }

}
