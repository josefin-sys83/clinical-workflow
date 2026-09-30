alter table protocol_section_issue
  add constraint protocol_section_issue_severity_check
  check (severity in (
    'blocker',
    'warning',
    'cross_reference',
    'recommendation',
    'human_decision_required'
  ));
