Clinical workflow system
• - AI/Python: Receives the result and TFL content in the same AI call and suggests a report section. Returns supporting
    quotes from the TFL. Without a TFL, placement is based on the result content.

  - Backend: Reads the project’s TFL files in XLSX, PDF, DOCX and TXT formats. Sends the content to AI, validates the
    response and assigns the appropriate placement label. SAP files are not treated as TFLs.

  - Frontend: Displays the placement label during import review. Marks suggestions as outdated when TFL files change and
    provides Reanalyze placement. Preserves human edits. The label is not saved permanently.

  The recent changes to improve conflict detection and prevent TFL facts from appearing in descriptions were rolled back, as
  agreed with the team.
