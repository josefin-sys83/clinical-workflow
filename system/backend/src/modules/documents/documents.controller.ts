import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Req,
  Res,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { Roles } from '../auth/roles.decorator';
import { FinalizeDocumentDto, CreateAddendumDto, UpdateAddendumDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { WorkflowService } from '../workflow/workflow.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('api/projects/:projectId/documents')
export class DocumentsController {
  constructor(
    private readonly docs: DocumentsService,
    private readonly audit: AuditService,
    private readonly workflow: WorkflowService,
  ) {}

  @Post(':docType/finalize')
  @Roles('admin', 'approver')
  async finalize(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Body() body: Partial<FinalizeDocumentDto>,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;
    const roles: string[] | undefined = Array.isArray(user?.roles) ? user.roles : undefined;

    const created = await this.docs.finalize({ projectId, docType, userId, userRoles: roles, note: body?.note });

    // Best-effort: mark the corresponding PDF step finalized.
    const stepId = docType === 'protocol' ? 'protocol-pdf' : 'report-pdf';
    await this.workflow.transition(projectId, stepId, {
      action: 'finalize',
      reason: body?.note ?? `Finalized ${docType} export (${created.sha256.slice(0, 12)}…)`,
      actorUserId: userId,
    } as any);

    await this.audit.record({
      projectId,
      stepId,
      type: 'document.finalized',
      message: `Finalized ${docType} export`,
      actorUserId: userId ?? null,
      metadata: { artifactId: created.id, sha256: created.sha256, fileName: created.fileName },
    });

    return {
      artifactId: created.id,
      sha256: created.sha256,
      fileName: created.fileName,
      finalizedBy: { userId: userId ?? null, roles: roles ?? null },
      downloadUrl: `/api/projects/${projectId}/documents/artifacts/${created.id}`,
    };
  }

  @Get('artifacts/:artifactId')
  @Roles('admin', 'author', 'reviewer', 'approver')
  async download(
    @Param('projectId') projectId: string,
    @Param('artifactId') artifactId: string,
    @Res() res: Response,
  ) {
    const a = await this.docs.get({ projectId, artifactId });
    res.setHeader('Content-Type', a.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${a.fileName}"`);
    res.setHeader('X-Artifact-SHA256', a.sha256);
    res.send(a.bytes);
  }

  @Get('artifacts/:artifactId/verify')
  @Roles('admin', 'author', 'reviewer', 'approver')
  async verify(
    @Param('projectId') projectId: string,
    @Param('artifactId') artifactId: string,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;
    const result = await this.docs.verify({ projectId, artifactId, verifierUserId: userId });
    await this.audit.record({
      projectId,
      stepId: 'documents',
      type: 'document.verified',
      message: `Verified artifact ${artifactId}`,
      actorUserId: userId ?? null,
      metadata: result,
    });
    return result;
  }

  @Post('artifacts/:artifactId/sign')
  @Roles('admin', 'approver')
  async sign(
    @Param('projectId') projectId: string,
    @Param('artifactId') artifactId: string,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];

    const signed = await this.docs.signArtifact({
      projectId,
      artifactId,
      signerUserId: userId,
      signerRoles: roles,
    });

    await this.audit.record({
      projectId,
      stepId: 'documents',
      type: 'document.signed',
      message: `Signed artifact ${artifactId}`,
      actorUserId: userId ?? null,
      metadata: signed,
    });

    return signed;
  }

  @Get('artifacts/:artifactId/signatures')
  @Roles('admin', 'author', 'reviewer', 'approver')
  async signatures(
    @Param('projectId') projectId: string,
    @Param('artifactId') artifactId: string,
  ) {
    return await this.docs.listSignatures({ projectId, artifactId });
  }

  @Get('artifacts/:artifactId/verify-chain')
  @Roles('admin', 'author', 'reviewer', 'approver')
  async verifyChain(
    @Param('projectId') projectId: string,
    @Param('artifactId') artifactId: string,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;
    const result = await this.docs.verifyChain({ projectId, artifactId, verifierUserId: userId });

    await this.audit.record({
      projectId,
      stepId: 'documents',
      type: 'document.chain_verified',
      message: `Verified signature chain for artifact ${artifactId}`,
      actorUserId: userId ?? null,
      metadata: {
        artifactMatch: result.artifact.match,
        signatures: result.signatures.map((s: any) => ({ signatureId: s.signatureId, match: s.match, keyId: s.keyId })),
      },
    });

    return result;
  }


  // -------------------------
  // Addendums (appendices)
  // -------------------------

  @Get(':docType/releases/:releaseArtifactId/addendums')
  @Roles('admin', 'author', 'reviewer', 'approver')
  async listAddendums(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('releaseArtifactId') releaseArtifactId: string,
  ) {
    return await this.docs.listAddendums({ projectId, docType, releaseArtifactId });
  }

  @Post(':docType/releases/:releaseArtifactId/addendums')
  @Roles('admin', 'author')
  async createAddendum(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('releaseArtifactId') releaseArtifactId: string,
    @Body() body: CreateAddendumDto,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;
    const created = await this.docs.createAddendum({
      projectId,
      docType,
      releaseArtifactId,
      title: body.title,
      description: body.description,
      changeReason: body.changeReason,
      actorUserId: userId ?? null,
    });

    await this.audit.record({
      projectId,
      stepId: docType === 'protocol' ? 'protocol-pdf' : 'report-pdf',
      type: 'addendum.created',
      message: `Created addendum ${created.letter}`,
      actorUserId: userId ?? null,
      metadata: { addendumId: created.id, letter: created.letter, releaseArtifactId },
    });

    return created;
  }

  @Get(':docType/addendums/:addendumId')
  @Roles('admin', 'author', 'reviewer', 'approver')
  async getAddendum(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
  ) {
    return await this.docs.getAddendum({ projectId, docType, addendumId });
  }

  @Patch(':docType/addendums/:addendumId')
  @Roles('admin', 'author')
  async updateAddendum(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
    @Body() body: UpdateAddendumDto,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;

    const updated = await this.docs.updateAddendum({
      projectId,
      docType,
      addendumId,
      title: body.title,
      description: body.description,
      changeReason: body.changeReason,
    });

    await this.audit.record({
      projectId,
      stepId: docType === 'protocol' ? 'protocol-pdf' : 'report-pdf',
      type: 'addendum.updated',
      message: `Updated addendum ${updated.letter}`,
      actorUserId: userId ?? null,
      metadata: { addendumId: updated.id, letter: updated.letter },
    });

    return updated;
  }

  @Post(':docType/addendums/:addendumId/start-review')
  @Roles('admin', 'author')
  async startAddendumReview(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;
    const res = await this.docs.startAddendumReview({ projectId, docType, addendumId });

    await this.audit.record({
      projectId,
      stepId: docType === 'protocol' ? 'protocol-review' : 'report-review',
      type: 'addendum.review_started',
      message: `Started review for addendum ${res.letter}`,
      actorUserId: userId ?? null,
      metadata: { addendumId: res.id, letter: res.letter },
    });

    return res;
  }

  @Post(':docType/addendums/:addendumId/review/approve')
  @Roles('admin', 'reviewer')
  async approveAddendum(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
    @Req() req: Request,
    @Body() body: any,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;

    const res = await this.docs.approveAddendumAsReviewer({
      projectId,
      docType,
      addendumId,
      actorUserId: userId ?? null,
      approve: true,
      comment: body?.comment,
    });

    await this.audit.record({
      projectId,
      stepId: docType === 'protocol' ? 'protocol-review' : 'report-review',
      type: 'addendum.approved',
      message: `Approved addendum ${res.letter}`,
      actorUserId: userId ?? null,
      metadata: { addendumId: res.id, letter: res.letter },
    });

    return res;
  }

  @Post(':docType/addendums/:addendumId/review/reject')
  @Roles('admin', 'reviewer')
  async rejectAddendum(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
    @Req() req: Request,
    @Body() body: any,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;

    const res = await this.docs.approveAddendumAsReviewer({
      projectId,
      docType,
      addendumId,
      actorUserId: userId ?? null,
      approve: false,
      comment: body?.comment,
    });

    await this.audit.record({
      projectId,
      stepId: docType === 'protocol' ? 'protocol-review' : 'report-review',
      type: 'addendum.rejected',
      message: `Rejected addendum ${res.letter}`,
      actorUserId: userId ?? null,
      metadata: { addendumId: res.id, letter: res.letter },
    });

    return res;
  }

  @Post(':docType/addendums/:addendumId/sign')
  @Roles('admin', 'approver')
  async signAddendum(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];

    const res = await this.docs.signAddendum({
      projectId,
      docType,
      addendumId,
      signerUserId: userId ?? null,
      signerRoles: roles,
    });

    await this.audit.record({
      projectId,
      stepId: 'documents',
      type: 'addendum.signed',
      message: `Signed addendum ${res.letter}`,
      actorUserId: userId ?? null,
      metadata: { addendumId: res.id, letter: res.letter, signedArtifactId: res.signedArtifactId },
    });

    return res;
  }

  @Post(':docType/addendums/:addendumId/lock')
  @Roles('admin', 'approver')
  async lockAddendum(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;
    const res = await this.docs.lockAddendum({ projectId, docType, addendumId });

    await this.audit.record({
      projectId,
      stepId: 'documents',
      type: 'addendum.locked',
      message: `Locked addendum ${res.letter}`,
      actorUserId: userId ?? null,
      metadata: { addendumId: res.id, letter: res.letter },
    });

    return res;
  }

  @Get(':docType/addendums/:addendumId/files')
  @Roles('admin', 'author', 'reviewer', 'approver')
  async listAddendumFiles(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
  ) {
    // validate existence
    await this.docs.getAddendum({ projectId, docType, addendumId });
    return await this.docs.listAddendumFiles({ addendumId });
  }

  @Post(':docType/addendums/:addendumId/files')
  @Roles('admin', 'author')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAddendumFile(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.sub;
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // validate existence and that it's draft
    const current = await this.docs.getAddendum({ projectId, docType, addendumId });
    if (current.status !== 'draft') {
      throw new BadRequestException('Files can only be uploaded while addendum is in draft');
    }

    await this.docs.uploadAddendumFile({
      addendumId,
      filename: file.originalname,
      mimeType: file.mimetype ?? 'application/octet-stream',
      bytes: file.buffer,
      uploaderUserId: userId ?? null,
    });

    await this.audit.record({
      projectId,
      stepId: 'documents',
      type: 'addendum.file_uploaded',
      message: `Uploaded file to addendum ${current.letter}`,
      actorUserId: userId ?? null,
      metadata: { addendumId, filename: file.originalname },
    });

    return await this.docs.listAddendumFiles({ addendumId });
  }

}
