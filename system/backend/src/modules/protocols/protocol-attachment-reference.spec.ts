import { getMissingProtocolAttachmentIssues } from './protocol-attachment-reference';

describe('getMissingProtocolAttachmentIssues', () => {
  it('flags Appendix 4 when only Appendices 1 through 3 exist', () => {
    const issues = getMissingProtocolAttachmentIssues(
      { id: 'methods', title: 'Methods', content: 'Supporting data are provided (see Appendix 4).' },
      [1, 2, 3],
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: 'blocker',
      textQuote: 'Appendix 4',
      description: expect.stringContaining('does not exist'),
    });
  });

  it('does not flag an existing stable appendix number', () => {
    const issues = getMissingProtocolAttachmentIssues(
      { id: 'methods', title: 'Methods', content: 'See Appendix 3.' },
      [1, 3],
    );

    expect(issues).toEqual([]);
  });

  it('reports a missing appendix only once per section', () => {
    const issues = getMissingProtocolAttachmentIssues(
      { id: 'methods', title: 'Methods', content: 'See Appendix 2, then review appendix 2 again.' },
      [1],
    );

    expect(issues).toHaveLength(1);
  });
});
