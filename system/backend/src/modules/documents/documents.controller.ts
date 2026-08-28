import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Req,
  Res,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard, ProjectAccessGuard, Roles, RolesGuard } from '../auth';
import { FinalizeDocumentDto, CreateAddendumDto, UpdateAddendumDto, UploadProtocolAttachmentDto } from './dto';
import { ADDENDUM_UPLOAD_OPTIONS, PROTOCOL_UPLOAD_OPTIONS } from '../../common/upload-security';

@Catch(PayloadTooLargeException)
class ProtocolUploadSizeExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(413).json({
      statusCode: 413,
      message: 'File is too large. Protocol attachments must be 10 MB or smaller.',
    });
  }
}

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard, RolesGuard)
@Controller('api/projects/:projectId/documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  // Protocol attachments belong to the protocol as a whole. All project members
  // may list them; the service performs the authoritative project-role check for
  // upload/remove using project_members and the real JWT user id.
  @Get('protocol/attachments')
  @Roles('admin', 'author', 'reviewer', 'approver')
  listProtocolAttachments(@Param('projectId') projectId: string) {
    return this.docs.listProtocolAttachments({ projectId });
  }

  @Post('protocol/attachments')
  @Roles('admin', 'author', 'reviewer', 'approver')
  @UseFilters(ProtocolUploadSizeExceptionFilter)
  @UseInterceptors(FileInterceptor('file', PROTOCOL_UPLOAD_OPTIONS))
  uploadProtocolAttachment(
    @Param('projectId') projectId: string,
    @UploadedFile() file: any,
    @Body() body: UploadProtocolAttachmentDto,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Choose a file to upload');
    const user: any = (req as any).user;
    return this.docs.uploadProtocolAttachment({
      projectId,
      filename: file.originalname,
      mimeType: file.mimetype ?? 'application/octet-stream',
      bytes: file.buffer,
      description: body.description,
      actor: user,
    });
  }

  @Delete('protocol/attachments/:attachmentId')
  @Roles('admin', 'author', 'reviewer', 'approver')
  removeProtocolAttachment(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    return this.docs.removeProtocolAttachment({ projectId, attachmentId, actor: user });
  }

  @Post(':docType/finalize')
  @Roles('admin', 'approver')
  async finalize(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Body() body: Partial<FinalizeDocumentDto>,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.userId;
    const roles: string[] | undefined = Array.isArray(user?.roles) ? user.roles : undefined;

    const created = await this.docs.finalize({
      projectId,
      docType,
      userId,
      userRoles: roles,
      note: body?.note,
      actor: user,
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
    const userId = user?.userId;
    return this.docs.verify({ projectId, artifactId, verifierUserId: userId, actor: user });
  }

  @Post('artifacts/:artifactId/sign')
  @Roles('admin', 'approver')
  async sign(
    @Param('projectId') projectId: string,
    @Param('artifactId') artifactId: string,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.userId;
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];

    const signed = await this.docs.signArtifact({
      projectId,
      artifactId,
      signerUserId: userId,
      signerRoles: roles,
      actor: user,
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
    const userId = user?.userId;
    return this.docs.verifyChain({ projectId, artifactId, verifierUserId: userId, actor: user });
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
    const userId = user?.userId;
    const created = await this.docs.createAddendum({
      projectId,
      docType,
      releaseArtifactId,
      title: body.title,
      description: body.description,
      changeReason: body.changeReason,
      actor: user,
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
    const userId = user?.userId;

    const updated = await this.docs.updateAddendum({
      projectId,
      docType,
      addendumId,
      title: body.title,
      description: body.description,
      changeReason: body.changeReason,
      actor: user,
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
    const userId = user?.userId;
    return this.docs.startAddendumReview({ projectId, docType, addendumId, actor: user });
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
    const userId = user?.userId;

    const res = await this.docs.approveAddendumAsReviewer({
      projectId,
      docType,
      addendumId,
      actor: user,
      approve: true,
      comment: body?.comment,
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
    const userId = user?.userId;

    const res = await this.docs.approveAddendumAsReviewer({
      projectId,
      docType,
      addendumId,
      actor: user,
      approve: false,
      comment: body?.comment,
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
    const userId = user?.userId;
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];

    const res = await this.docs.signAddendum({
      projectId,
      docType,
      addendumId,
      signerUserId: userId ?? null,
      signerRoles: roles,
      actor: user,
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
    const userId = user?.userId;
    return this.docs.lockAddendum({ projectId, docType, addendumId, actor: user });
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
  @UseInterceptors(FileInterceptor('file', ADDENDUM_UPLOAD_OPTIONS))
  async uploadAddendumFile(
    @Param('projectId') projectId: string,
    @Param('docType') docType: 'protocol' | 'report',
    @Param('addendumId') addendumId: string,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    const userId = user?.userId;
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // validate existence and that it's draft
    const current = await this.docs.getAddendum({ projectId, docType, addendumId });
    if (current.status !== 'draft') {
      throw new BadRequestException('Files can only be uploaded while addendum is in draft');
    }

    await this.docs.uploadAddendumFile({
      projectId,
      docType,
      addendumId,
      filename: file.originalname,
      mimeType: file.mimetype ?? 'application/octet-stream',
      bytes: file.buffer,
      uploaderUserId: userId ?? null,
      actor: user,
    });

    return await this.docs.listAddendumFiles({ addendumId });
  }

}
