import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import contentDisposition from 'content-disposition';
import {
  PROTOCOL_UPLOAD_OPTIONS,
  RESULTS_UPLOAD_OPTIONS,
} from '../../common/upload-security';
import { parseTable, previewResultFile } from './result-intake';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateResultDto,
  ListResultsDto,
  ResultDecisionDto,
  UpdateResultDto,
  SupportingDocumentDto,
  ParseTableDto,
  AssignResultSectionDto,
} from './dto';
import { ResultsService } from './results.service';

const input = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@ApiBearerAuth()
@ApiTags('results')
@UseGuards(JwtAuthGuard, ProjectAccessGuard, RolesGuard)
@Controller('/api/projects/:projectId/results')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get('workspace')
  @Header('Cache-Control', 'no-store')
  workspace(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.results.workspace(projectId);
  }

  @Post('parse-table')
  @Roles('author', 'admin')
  parse(@Body(input) body: ParseTableDto) {
    return parseTable(body.text);
  }

  @Post('preview')
  @Roles('author', 'admin')
  @UseInterceptors(FileInterceptor('file', RESULTS_UPLOAD_OPTIONS))
  preview(@UploadedFile() file: any) {
    return previewResultFile(file);
  }

  @Post('supporting-documents')
  @Roles('author', 'admin')
  @UseInterceptors(FileInterceptor('file', PROTOCOL_UPLOAD_OPTIONS))
  uploadSupportingDocument(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body(input) body: SupportingDocumentDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.results.uploadSupportingDocument(
      projectId,
      body,
      file,
      req.user,
    );
  }

  @Get('supporting-documents/:documentId')
  async downloadSupportingDocument(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const document = await this.results.downloadSupportingDocument(
      projectId,
      id,
    );
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': contentDisposition(document.filename),
      'Cache-Control': 'no-store',
    });
    res.send(document.bytes);
  }

  @Delete('supporting-documents/:documentId')
  @Roles('author', 'admin')
  @HttpCode(204)
  removeSupportingDocument(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.results.removeSupportingDocument(projectId, id, req.user);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query(input) query: ListResultsDto,
  ) {
    return this.results.list(projectId, query);
  }

  @Post()
  @Roles('author', 'admin')
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body(input) body: CreateResultDto,
    @Req() req: any,
  ) {
    return this.results.create(projectId, body, req.user);
  }

  @Patch(':resultId')
  @Roles('author', 'admin')
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @Body(input) body: UpdateResultDto,
    @Req() req: any,
  ) {
    return this.results.update(projectId, resultId, body, req.user);
  }

  @Delete(':resultId')
  @Roles('author', 'admin')
  @HttpCode(204)
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @Req() req: any,
  ) {
    return this.results.remove(projectId, resultId, req.user);
  }

  @Post(':resultId/decisions')
  @Roles('reviewer', 'approver', 'admin')
  @HttpCode(200)
  decide(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @Body(input) body: ResultDecisionDto,
    @Req() req: any,
  ) {
    return this.results.decide(projectId, resultId, body, req.user);
  }

  @Patch(':resultId/section')
  @Roles('author', 'reviewer', 'approver', 'admin')
  assignSection(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @Body(input) body: AssignResultSectionDto,
    @Req() req: any,
  ) {
    return this.results.assignSection(projectId, resultId, body, req.user);
  }
}
