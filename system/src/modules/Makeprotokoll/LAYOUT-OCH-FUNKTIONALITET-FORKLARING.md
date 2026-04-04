# Layout och Funktionalitet: Issues vs Completeness Status

## Översikt

När en protokollsektion är **expanderad** visas flera komponenter i en specifik ordning. Detta dokument förklarar layouten och hur Issues-panelen och Completeness Status-komponenten fungerar tillsammans.

---

## 1. ÖVERGRIPANDE LAYOUT (Expanderad Sektion)

När användaren klickar för att expandera en protokollsektion visas följande i ordning:

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER (Alltid synlig - collapsed/expanded)                     │
│ • Section X.X: Titel                                             │
│ • Status badges: Draft/Approved/Locked                           │
│ • Owner, Comments, Completeness counter                          │
│ • [Expand/Collapse chevron]                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. REVIEW HEADER (Metadata)                                      │
│    • Review Cycle, Approver, Reviewer, Status                   │
│    • Last Updated, Final Lock Role                               │
│    • [View audit trail] länk                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ROLES & APPROVAL CARD                                         │
│    • Content Owner (vänster)                                     │
│    • Required Approver (höger)                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. COMPLETENESS STATUS (ISO 14155:2020 Required Elements)       │
│    • Collapsible, default: expanded                              │
│    • Listar alla required elements med status                    │
│    • Complete / Partial / Missing                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. AI ROLE CLARITY BANNER (endast i Review Mode)                │
│    • Visar att innehåll är AI-genererat                          │
│    • Emphaserar human responsibility                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. LOCKED SECTION BANNER (endast om låst)                       │
│    • Amendment Required for Changes                              │
│    • [Initiate Amendment] knapp                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. BLOCKER BANNER (endast om blockerad)                         │
│    • Blocked by unresolved Issue                                 │
│    • Röd border, collapsible i authoring mode                    │
│    • Alltid expanderad i review mode                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. ISSUES PANEL (endast om det finns non-blocker issues)        │
│    • Amber färg (warnings/issues)                                │
│    • Collapsible i authoring mode                                │
│    • Alltid expanderad i review mode                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. WHAT THIS SECTION MUST INCLUDE (Guidance)                    │
│    • Collapsible, default: collapsed                             │
│    • Regulatory requirements                                     │
│    • Common pitfalls                                             │
│    • Referenced documents                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. PURPOSE LINE                                                  │
│    • Kort one-liner om sektionens syfte                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. PROTOCOL CONTENT (Editable)                                 │
│     • Faktiskt protokollinnehåll                                 │
│     • Med inline issue markers                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 11. SECTION ACTIONS                                              │
│     • [Request Changes] (endast om locked/approved)              │
│     • [Approve Section] (endast om inte approved)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. COMPLETENESS STATUS - Detaljerad Funktionalitet

### Syfte
Visar om sektionen uppfyller alla **ISO 14155:2020 Required Elements** - regulatoriskt obligatoriska innehållselement.

### Placering
- **Position**: Block #3 (efter Roles & Approval Card)
- **Alltid synlig**: Ja, om `section.requiredElements` finns
- **Oberoende av**: Issues, blockers, approval status

### Visuell Struktur

#### COLLAPSED STATE (minimal)
```
┌─────────────────────────────────────────────────────────────────┐
│ Completeness Status  (ISO 14155:2020 Required        [3/5]  [›] │
│                       Elements)                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### EXPANDED STATE (default)
```
┌─────────────────────────────────────────────────────────────────┐
│ Completeness Status  (ISO 14155:2020 Required        [3/5]  [v] │
│                       Elements)                                  │
├─────────────────────────────────────────────────────────────────┤
│ [i] Inspection requirement: This section must cover all         │
│     required elements per ISO 14155:2020. AI may assist in      │
│     identifying gaps, but final confirmation must be performed  │
│     and verified by the section owner or reviewer.              │
├─────────────────────────────────────────────────────────────────┤
│ ✓  Device Description and Specifications                        │
│    ISO 14155:2020 Section 7.2.3                                 │
│    Verified by Emma Chen on 2026-02-18                          │
├─────────────────────────────────────────────────────────────────┤
│ ⚠  Patient Population and Selection Criteria                    │
│    ISO 14155:2020 Section 7.2.4                                 │
│    Partially covered - requires completion                       │
├─────────────────────────────────────────────────────────────────┤
│ ○  Adverse Events Reporting                                     │
│    ISO 14155:2020 Section 7.2.9                                 │
│    Missing - must be added before approval                       │
├─────────────────────────────────────────────────────────────────┤
│ Note: Completeness verification is a human responsibility.      │
│ AI suggestions for gaps are advisory only.                      │
└─────────────────────────────────────────────────────────────────┘
```

### Status-typer
1. **Complete (✓)**: 
   - Blå checkmark (`text-blue-600`)
   - Visar verifier och datum
   
2. **Partial (⚠)**:
   - Amber varning (`text-amber-600`)
   - Visar "Partially covered - requires completion"
   
3. **Missing (○)**:
   - Grå tom cirkel (`text-slate-300`)
   - Visar "Missing - must be added before approval"

### Beteende
- **Default state**: EXPANDED (eftersom det är inspection-kritiskt)
- **Collapsible**: Ja (användaren kan stänga om de behöver fokusera på annat)
- **Uppdateras**: När innehåll redigeras (i produktion: AI/human verification)
- **Independent**: Påverkas INTE av Issues-panelen

---

## 3. ISSUES PANEL - Detaljerad Funktionalitet

### Syfte
Visar **strukturella problem, regulatory gaps, och kvalitetsproblem** som identifierats i sektionens innehåll.

### Issue-typer
1. **BLOCKER** (röd): 
   - Hindrar approval
   - Måste lösas innan sektion kan godkännas
   - Exempel: "Missing required safety monitoring procedures per ISO 14155:2020 § 7.2.9"

2. **ISSUE** (orange): 
   - Allvarligt problem som bör åtgärdas
   - Hindrar inte approval men starkt rekommenderat
   - Exempel: "Unclear exclusion criteria - may cause screening inconsistencies"

3. **WARNING** (amber): 
   - Mindre problem eller förbättringsförslag
   - Påverkar inte approval
   - Exempel: "Consider adding more detail on adverse event classification"

### Placering
Issues visas på **olika platser** beroende på **severity** och **mode**:

#### 3A. BLOCKER ISSUES (Severity: blocker)
```
┌─────────────────────────────────────────────────────────────────┐
│ [!] BLOCKED BY UNRESOLVED ISSUE                             [v] │
│                                                                  │
│  • Missing required safety monitoring procedures per             │
│    ISO 14155:2020 § 7.2.9                                       │
│                                                                  │
│  Raised by: Dr. Weber • 2026-02-18                              │
├─────────────────────────────────────────────────────────────────┤
│ (Röd border, bg-red-50)                                         │
└─────────────────────────────────────────────────────────────────┘
```
- **Position**: Block #6 (före "What this section must include")
- **Färg**: Röd (`border-red-400`, `bg-red-50`)
- **Authoring mode**: Collapsible (compact banner när collapsed)
- **Review mode**: Alltid expanderad

#### 3B. ISSUES & WARNINGS (Severity: issue, warning)
```
┌─────────────────────────────────────────────────────────────────┐
│ [!] Issues requiring attention (3)                  [Collapse]  │
├─────────────────────────────────────────────────────────────────┤
│ [!] ISSUE • Patient Population                                  │
│     Unclear exclusion criteria - may cause screening            │
│     inconsistencies                                             │
│                                                                  │
│     Reference: ISO 14155:2020 Section 7.2.4                     │
│     Raised by: Dr. Weber • 2026-02-18                           │
├─────────────────────────────────────────────────────────────────┤
│ [⚠] WARNING • Statistical Analysis                              │
│     Consider adding more detail on adverse event classification │
│                                                                  │
│     Raised by: AI Assistant • 2026-02-17                        │
└─────────────────────────────────────────────────────────────────┘
```
- **Position**: Block #7 (efter Blocker, före Guidance)
- **Färg**: Orange/Amber (`border-orange-500`, `bg-orange-50` / `border-amber-500`, `bg-amber-50`)
- **Authoring mode**: Collapsible (compact banner när collapsed)
- **Review mode**: Alltid expanderad

### Collapsed State (Authoring Mode)

#### Blocker (collapsed)
```
┌─────────────────────────────────────────────────────────────────┐
│ [!] Blocked by unresolved Issue                             [>] │
└─────────────────────────────────────────────────────────────────┘
```

#### Issues/Warnings (collapsed)
```
┌─────────────────────────────────────────────────────────────────┐
│ [!] 3 Issues requiring attention  [1 Blocker]               [>] │
└─────────────────────────────────────────────────────────────────┘
```

### Beteende per Mode

| Feature                   | Authoring Mode          | Review Mode             |
|---------------------------|-------------------------|-------------------------|
| Default state             | Collapsed               | Expanded                |
| User can collapse         | Ja                      | Nej                     |
| Visual prominence         | Subtle (kan ignoreras)  | Prominent (måste ses)   |
| Click on issue            | Scrollar till subsection| Scrollar till subsection|
| Border weight             | `border`                | `border-2`              |

---

## 4. COMPLETENESS vs ISSUES - Vad är skillnaden?

| Aspect                    | Completeness Status                    | Issues Panel                          |
|---------------------------|----------------------------------------|---------------------------------------|
| **Syfte**                 | ISO 14155 regulatory compliance        | Kvalitetsproblem, gaps, errors        |
| **Kontrollerar**          | Required elements finns                | Innehållets korrekthet och kvalitet   |
| **Exempel**               | "Device Description saknas"            | "Device Description är för vag"       |
| **Verifieras av**         | Section Owner eller Reviewer           | Reviewer eller AI Assistant           |
| **Blockar approval**      | Nej (advisory)                         | Ja (Blocker severity)                 |
| **Regulatorisk grund**    | ISO 14155:2020 struktur                | ISO 14155:2020 innehållskrav          |
| **Färg**                  | Neutral/grayscale med accent           | Red/Orange/Amber (severity-based)     |
| **Default state**         | Expanded (inspection-critical)         | Collapsed (authoring), Expanded (review)|
| **Position i layout**     | Block #3 (tidigt, metadata-område)     | Block #6-7 (efter guidance)           |

### Praktiskt Exempel

**Scenario**: Section 5.2 (Patient Population)

#### Completeness Status visar:
```
✓ Patient Population and Selection Criteria (complete)
  ISO 14155:2020 Section 7.2.4
  Verified by Dr. Weber on 2026-02-18

✓ Inclusion Criteria (complete)
  ISO 14155:2020 Section 7.2.4.1
  Verified by Dr. Weber on 2026-02-18

○ Exclusion Criteria (missing)
  ISO 14155:2020 Section 7.2.4.2
  Missing - must be added before approval
```
**Tolkning**: Strukturen finns, men exclusion criteria saknas helt.

#### Issues Panel visar:
```
[!] ISSUE • Inclusion Criteria
    Age range unclear - states "adults" but no specific age defined.
    May cause screening inconsistencies across sites.
    
    Reference: ISO 14155:2020 Section 7.2.4.1
    Raised by: Dr. Weber • 2026-02-18
```
**Tolkning**: Inclusion criteria finns (så Completeness är OK), men innehållet är otydligt.

---

## 5. LAYOUT I OLIKA SCENARIOS

### Scenario A: Draft Section, No Issues (Clean State)
```
1. Review Header
2. Roles & Approval Card
3. Completeness Status (expanded)
4. [Guidance - collapsed]
5. Purpose Line
6. Protocol Content
7. Section Actions: [Approve Section]
```

### Scenario B: Draft Section, Issues Present (Authoring Mode)
```
1. Review Header
2. Roles & Approval Card
3. Completeness Status (expanded)
4. [Blocker Banner - collapsed] ← Click to expand
5. [Issues Panel - collapsed] ← Click to expand
6. [Guidance - collapsed]
7. Purpose Line
8. Protocol Content (med inline issue markers)
9. Section Actions: [Approve Section] (disabled if blockers)
```

### Scenario C: Draft Section, Issues Present (Review Mode)
```
1. Review Header
2. Roles & Approval Card
3. Completeness Status (expanded)
4. AI Role Clarity Banner ← Synlig i Review Mode
5. Blocker Banner (EXPANDED, prominent) ← Auto-expanded
6. Issues Panel (EXPANDED, prominent) ← Auto-expanded
7. [Guidance - collapsed]
8. Purpose Line
9. Protocol Content (med inline issue markers)
10. Section Actions: [Approve Section]
```

### Scenario D: Locked Section (Amendment Required)
```
1. Review Header
2. Roles & Approval Card
3. Completeness Status (expanded)
4. Locked Section Banner ← Röd/prominent med [Initiate Amendment]
5. [Old issues - resolved/archived] ← Ej längre relevanta
6. [Guidance - collapsed]
7. Purpose Line
8. Protocol Content (read-only styling)
9. Section Actions: [Request Changes] ← Amendment workflow
```

---

## 6. VISUAL HIERARCHY & INFORMATION DENSITY

### Färgkodning (Severity-baserad)

| Element                   | Färg          | Border          | Användning                |
|---------------------------|---------------|-----------------|---------------------------|
| Completeness Status       | `bg-white`    | `slate-200`     | Neutral, informativ       |
| Blocker Issue             | `bg-red-50`   | `border-red-400`| Kritisk, måste åtgärdas   |
| Issue                     | `bg-orange-50`| `border-orange-500`| Allvarlig, bör åtgärdas|
| Warning                   | `bg-amber-50` | `border-amber-500`| Mindre allvarlig         |
| Locked Banner             | `bg-slate-50` | `border-slate-300`| Informativ, ej alarmerad |
| Guidance (collapsed)      | `bg-slate-50` | `border-slate-200`| Subtil, sekundär         |
| Guidance (expanded)       | `bg-slate-100`| `border-slate-300`| Något mer framträdande   |

### Typografi

| Element                   | Font Size | Weight    | Color           |
|---------------------------|-----------|-----------|-----------------|
| Section Header            | (default) | normal    | `text-slate-900`|
| Element Name              | `text-xs` | normal    | `text-slate-900`|
| ISO Reference             | `text-xs` | normal    | `text-slate-500`|
| Status Message            | `text-xs` | normal    | Severity-based  |
| Issue Description         | `text-xs` | normal    | Severity-based  |
| Metadata (dates, users)   | `text-xs` | normal    | `text-slate-500`|

**Observation**: All body text är `text-xs` för high information density, men hierarki skapas genom färg och spacing istället för size/weight.

---

## 7. INTERAKTIONSFLÖDEN

### Completeness Status

#### Användaren klickar på header
1. Toggle expand/collapse state
2. Chevron roterar (right → down)
3. Content fades in/out
4. **Ingen påverkan på**: Issues, Protocol Content, Approval Actions

#### Elementstatus uppdateras (AI eller human)
1. Icon ändras (○ → ⚠ → ✓)
2. Status message uppdateras
3. Counter i header uppdateras (3/5 → 4/5)
4. **Om alla complete**: Badge ändras från "3/5" till "Complete"
5. Audit log uppdateras (bakgrund)

### Issues Panel

#### Användaren klickar på collapsed banner (Authoring Mode)
1. Expanderar panelen
2. Visar alla issues med full info
3. Chevron roterar (right → down)
4. **Ingen påverkan på**: Completeness Status, Protocol Content

#### Användaren klickar på en issue-description
1. Scrollar smooth till relevant subsection i Protocol Content
2. Highlightar relevant inline issue marker
3. **Visuell koppling**: Issue i panel ↔ Inline marker i content

#### Reviewer markerar issue som resolved
1. Issue försvinner från "Open" list
2. Counter uppdateras (3 Issues → 2 Issues)
3. **Om blocker resolved**: Blocker Banner försvinner
4. **Om alla issues resolved**: Issues Panel försvinner helt
5. Audit log uppdateras

---

## 8. RESPONSIVE BETEENDE

### Desktop (>1024px)
- Full width för alla komponenter
- Two-column grid för Roles & Approval Card
- Completeness elements som single column list
- Issues som full-width cards

### Tablet (768px - 1024px)
- Roles & Approval Card: Still two columns
- Completeness: Same single column
- Issues: Same full-width
- Något mindre padding

### Mobile (<768px)
- Roles & Approval Card: Stacks to single column
- Completeness: Remains single column (naturligt responsive)
- Issues: Remains full-width cards
- Reduced padding throughout

**Design princip**: Komponenter är naturligt stackade vertikalt, så responsive design är enkel.

---

## 9. AUDIT TRAIL & TRACEABILITY

### Completeness Status
**Loggade events**:
- Element marked as complete
- Element verified by [User]
- Element status changed from [old] to [new]
- AI suggested completeness gap in [element]

### Issues Panel
**Loggade events**:
- Issue raised: [severity] [description]
- Issue status changed from [old] to [new]
- Issue resolved by [User]
- Issue commented on by [User]

**Koppling**: Både Completeness och Issues loggas till samma Audit Trail, men med olika "action types" för filtrering.

---

## 10. SAMMANFATTNING: KEY DESIGN DECISIONS

### Separation of Concerns
- **Completeness** = Structure (finns elementen?)
- **Issues** = Content Quality (är innehållet bra?)
- **Båda krävs** för full regulatory compliance

### Visibility Strategy
| Mode           | Completeness Status | Issues Panel          |
|----------------|---------------------|-----------------------|
| Authoring      | Expanded (default)  | Collapsed (default)   |
| Review         | Expanded (default)  | Expanded (forced)     |

**Rationale**: 
- Authoring: fokus på att skapa innehåll, issues stör inte
- Review: fokus på att hitta problem, allt måste synas

### Information Architecture
1. **Metadata först** (vem, när, status)
2. **Compliance checks** (Completeness, AI clarity)
3. **Problems** (Blockers, Issues)
4. **Guidance** (hjälp vid behov)
5. **Content** (själva protokolltexten)
6. **Actions** (approve, request changes)

**Rationale**: "Context before content" - användaren får all kontext innan de dyker in i innehållet.

### Color Strategy
- **Neutral grayscale**: Metadata, guidance, completeness
- **Severity colors**: Issues (red > orange > amber)
- **Action colors**: Approve (blue), Locked (slate), Amendment (amber)

**Rationale**: Färg används strategiskt för att signalera urgency och action-requirement, inte för dekoration.

---

## 11. FRAMTIDA ÖVERVÄGANDEN

### Completeness Enhancements
- [ ] Click på element → jump to relevant content section
- [ ] Bulk verify action
- [ ] AI-powered gap detection (real-time)
- [ ] Export completeness report

### Issues Enhancements
- [ ] Filter by severity
- [ ] Sort by date/section
- [ ] Batch resolve actions
- [ ] Issue discussion threads (vs comments)

### Layout Improvements
- [ ] Sticky Issues summary när user scrollar i Protocol Content
- [ ] Split-screen mode: Issues left, Content right
- [ ] "Focus Mode" som döljer all metadata för pure content editing

---

**Last Updated**: 2026-02-21  
**Component**: Protocol Section (`/components/protocol-section.tsx`)  
**Related Docs**: 
- `/COMPLETENESS-STATUS-VISUAL-SPEC.md`
- `/components/section-completeness-indicator.tsx`
- `/components/protocol-section.tsx`
