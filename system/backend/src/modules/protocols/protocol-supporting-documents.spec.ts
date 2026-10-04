import { ProtocolAttachmentsService } from './protocol-attachments.service';
import { getPool } from '../../db/pg';
import { extractDocumentText } from '../../common/document-text';
import { getRuleBasedIssues } from './protocol-analysis-rules';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));
jest.mock('../../common/document-text', () => ({ extractDocumentText: jest.fn() }));

describe('supporting protocol document evidence', () => {
  const requirements = [{ id: 'iso', title: 'ISO 14155:2020', description: 'Clinical study', status: 'accepted' }];
  const document = { id: 'file', appendix_number: 4, filename: 'SAP.docx', bytes: Buffer.from('file'), mime_type: 'application/docx',
    requirement_ids: ['iso', 'unaccepted'], finding_requirement_ids: [], extracted_text: null, extraction_error: null };
  let query: jest.Mock;
  let service: ProtocolAttachmentsService;
  beforeEach(() => {
    query = jest.fn(async (sql: string) => ({ rows: sql.startsWith('select pa.id') ? [document] : [] }));
    (getPool as jest.Mock).mockReturnValue({ query });
    (extractDocumentText as jest.Mock).mockReset().mockResolvedValue('Significance level is 0.05');
    service = new ProtocolAttachmentsService({ record: jest.fn() } as any);
  });

  it('prepares metadata without text and filters unaccepted requirement IDs', async () => {
    const metadata = await service.supportingDocuments('project', requirements);
    expect(metadata[0]).toMatchObject({ appendixNumber: 4, requirementIds: ['iso'] });
    expect(metadata[0]).not.toHaveProperty('extractedText');
    expect(metadata[0]).not.toHaveProperty('bytes');
    expect(extractDocumentText).not.toHaveBeenCalled();
  });

  it('analysis extracts existing uploads, caches text, and sends the requirement details', async () => {
    const evidence = await service.supportingDocuments('project', requirements, true);
    expect(evidence[0]).toMatchObject({ extractedText: 'Significance level is 0.05', requirements: [{ id: 'iso', title: 'ISO 14155:2020' }] });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('set extracted_text='), ['file', 'Significance level is 0.05', null]);
  });

  it('retains an unreadable attachment with an explicit error rather than inventing content', async () => {
    (extractDocumentText as jest.Mock).mockRejectedValue(new Error('Scanned PDF has no readable text'));
    expect((await service.supportingDocuments('project', requirements, true))[0])
      .toMatchObject({ extractedText: '', extractionError: 'Scanned PDF has no readable text' });
  });

  it('leaves document coverage to AI while keeping ordinary text checks for unlinked documents', () => {
    const section = { id: '8', title: 'Statistical Considerations', content: 'See Appendix 4' };
    const findings = getRuleBasedIssues(section, [], {}, requirements);
    expect(findings.find(issue => issue.severity === 'blocker')).toMatchObject({ requirementId: 'iso' });
    expect(getRuleBasedIssues(section, [], {}, requirements, [{ requirementIds: ['iso'], extractedText: 'SAP evidence' }])).toEqual([]);
    expect(getRuleBasedIssues(section, [], {}, requirements, [{ requirementIds: [], extractedText: 'Unrelated text' }])).toHaveLength(findings.length);
  });
});
