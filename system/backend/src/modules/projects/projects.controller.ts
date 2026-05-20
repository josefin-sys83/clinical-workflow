import { Body, Controller, Get, Param, Patch, Post, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from './dto';
import { ProjectsService } from './projects.service';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';

@ApiTags('projects')
@Controller('/api/projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() { return this.projects.list(); }

  @Get('/completed')
  listCompleted() { return this.projects.listCompleted(); }

  @Get('/:projectId')
  get(@Param('projectId') projectId: string) { return this.projects.get(projectId); }

  @Post()
  create(@Body() dto: CreateProjectDto) { return this.projects.create(dto); }

  @Patch('/:projectId')
  async update(@Param('projectId') projectId: string, @Body() body: { name?: string; description?: string; data?: any }) {
    const existing = await this.projects.get(projectId);
    const result = await this.projects.update(projectId, body);
    if (body.data?.roles) {
      const oldRoles: any[] = existing?.data?.roles || [];
      const changes: string[] = [];
      for (const newRole of body.data.roles) {
        const oldRole = oldRoles.find((r: any) => r.title === newRole.title);
        const oldPeople = (oldRole?.assignedTo || []).map((p: any) => p.name + ' (' + p.email + ')').join(', ') || 'unassigned';
        const newPeople = (newRole.assignedTo || []).map((p: any) => p.name + ' (' + p.email + ')').join(', ') || 'unassigned';
        if (oldPeople !== newPeople) {
          changes.push(newRole.title + ': ' + oldPeople + ' -> ' + newPeople);
        }
      }
      if (changes.length > 0) {
        await this.audit.create(projectId, {
          type: 'project.roles.updated',
          message: 'Project roles updated',
          stepId: 'project-setup',
          actorUserId: 'unknown',
          metadataJson: JSON.stringify({ roles: changes.join(' | ') })
        });
      }
    }
    if (body.name) {
      await this.audit.create(projectId, {
        type: 'project.setup.completed',
        message: 'Project setup completed: ' + body.name,
        stepId: 'project-setup',
        actorUserId: 'unknown',
        metadataJson: JSON.stringify({ projectName: body.name, description: body.description })
      });
    }
    return result;
  }

  @Patch('/:projectId/protocol/sections/:sectionId')
  async updateSection(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { content: string; userId?: string; userName?: string; previousContent?: string; reason?: string }
  ) {
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol;
    if (!protocol) return null;
    const now = new Date().toISOString();
    const section = protocol.sections.find((s: any) => s.id === sectionId);
    const sections = protocol.sections.map((s: any) =>
      s.id === sectionId ? { ...s, content: body.content, updatedAt: now } : s
    );
    await this.projects.update(projectId, {
      data: { ...project.data, protocol: { ...protocol, sections } }
    });

    // Log audit event
    await this.audit.create(projectId, {
      type: 'section.content.updated',
      message: `Section "${section?.title || sectionId}" content updated`,
      stepId: 'protocol-make',
      actorUserId: body.userId || 'unknown',
      metadataJson: JSON.stringify({ sectionId, sectionTitle: section?.title, updatedAt: now, editedBy: body.userName || 'Unknown user', reason: body.reason || '', previousContent: (body.previousContent || '').substring(0, 500), newContent: body.content.substring(0, 500) })
    });

    return { ok: true, updatedAt: now };
  }

  @Post('/:projectId/synopsis-file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSynopsisFile(@Param('projectId') projectId: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    await this.projects.saveSynopsisFile(projectId, file.originalname, file.buffer, file.mimetype ?? 'application/octet-stream');
    return { fileName: file.originalname };
  }

  @Get('/:projectId/synopsis-file')
  async getSynopsisFile(@Param('projectId') projectId: string, @Res() res: any) {
    const file = await this.projects.getSynopsisFile(projectId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    res.send(file.bytes);
  }

  @Post('/:projectId/analyze-synopsis')
  @UseInterceptors(FileInterceptor('file'))
  async analyzeSynopsis(@Param('projectId') projectId: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    let text = '';
    const mimetype = file.mimetype || '';
    const filename = file.originalname || '';
    if (mimetype.includes('word') || filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(file.buffer);
      text = parsed.text;
    } else {
      text = file.buffer.toString('utf-8');
    }
    console.log('[analyzeSynopsis] extracted text length:', text.length, '| preview:', text.slice(0, 300));
    const results = await this.ai.analyzeSynopsis(text);
    console.log('[analyzeSynopsis] AI response:', JSON.stringify(results));
    return results;
  }

  @Post('/:projectId/analyze-scope')
  async analyzeScope(@Param('projectId') projectId: string, @Body() body: { prompt: string }) {
    const results = await this.ai.analyzeScope(body.prompt);
    return results;
  }

  @Post('/:projectId/generate-protocol')
  async generateProtocol(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    const projectData = project?.data?.projectData || {};
    const roles = project?.data?.roles || [];
    const scope = project?.data?.scope || {};
    const synopsisData = project?.data?.synopsis || {};
    const synopsisText = synopsisData.reviewResult ? JSON.stringify(synopsisData.reviewResult) : '';
    const targetMarkets = projectData?.targetMarkets || ['EU'];
    const deviceCategory = scope?.deviceCategory || '';
    const intendedUse = scope?.intendedUse || '';

    const protocol = await this.ai.generateProtocol(projectData, roles, synopsisText, scope);
    if (!protocol) return null;

    await Promise.all(
      protocol.sections.map(async (section: any) => {
        const elements = await this.ai.generateRequiredElements(
          section.title,
          targetMarkets,
          deviceCategory,
          intendedUse
        );
        section.requiredElements = elements;
      })
    );

    // Log audit event
    await this.audit.create(projectId, {
      type: 'protocol.generated',
      message: 'Protocol generated by AI',
      stepId: 'protocol-make',
      actorUserId: 'system',
      metadataJson: JSON.stringify({ sections: protocol.sections.length, generatedAt: new Date().toISOString() })
    });

    return protocol;
  }

  @Post('/:projectId/analyze-section')
  async analyzeSection(
    @Param('projectId') projectId: string,
    @Body() body: { sectionTitle: string; sectionContent: string; requiredElements?: any[] }
  ) {
    const project = await this.projects.get(projectId);
    const targetMarkets = project?.data?.projectData?.targetMarkets || ['EU'];
    const deviceCategory = project?.data?.scope?.deviceCategory || '';
    const intendedUse = project?.data?.scope?.intendedUse || '';
    const result = await this.ai.analyzeSection(body.sectionTitle, body.sectionContent, targetMarkets, deviceCategory, intendedUse, body.requiredElements);
    return result;
  }
}