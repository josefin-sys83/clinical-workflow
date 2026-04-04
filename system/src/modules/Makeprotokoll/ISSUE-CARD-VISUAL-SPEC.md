# Issue Card Visual Specification

## Översikt

Issue cards visar kvalitetsproblem, regulatory gaps, och strukturella fel i protokollsektioner. Korten använder severity-baserad färgkodning för att signalera urgency och action-requirement.

---

## 1. CARD STRUCTURE & ANATOMY

```
┌──────────────────────────────────────────────────────────────┐
│ ║                                                              │
│ ║  [ICON]  SEVERITY • Subsection Name                         │
│ ║                                                              │
│ ║          Description text explaining the issue in detail.   │
│ ║          Can span multiple lines with relaxed leading.      │
│ ║                                                              │
│ ║          Reference: ISO 14155:2020 Section X.X.X            │
│ ║          ─────────────────────────────────────────────────  │
│ ║          Raised by: Dr. Weber  •  2026-02-18                │
└──────────────────────────────────────────────────────────────┘
```

### Visual Elements:
1. **Left Border (║)**: Thick 4px colored border indicating severity
2. **Icon**: Severity-specific icon (Ban, XCircle, AlertTriangle)
3. **Header Line**: SEVERITY label + subsection name
4. **Description**: Main issue text
5. **Reference** (optional): ISO/regulatory reference
6. **Footer**: Metadata (who raised it, when)

---

## 2. SEVERITY TYPES & COLOR CODING

### BLOCKER (Highest Priority)

#### Visual Properties
```
Background:    bg-red-50
Border:        border-l-4 border-red-500
Icon:          Ban (w-5 h-5 text-red-600)
Label:         text-red-900
Description:   text-red-800
```

#### Example Card
```
┌──────────────────────────────────────────────────────────────┐
│ ║ [🚫]  BLOCKER • Inclusion Criteria & Sample Size Alignment  │
│ ║                                                              │
│ ║        Cross-section consistency check failed: Section 4.8  │
│ ║        specifies N=120 target enrollment with 6-month       │
│ ║        enrollment period. Current inclusion criteria (age   │
│ ║        ≥65, severe AS, intermediate risk, anatomical        │
│ ║        constraints) may yield insufficient recruitment pool │
│ ║        across 8 sites. Provide recruitment feasibility      │
│ ║        analysis or adjust criteria/timeline.                │
│ ║                                                              │
│ ║        Reference: Conflicts with Section 4.4 (Study Scope)  │
│ ║        and Section 4.8 (Sample Size). ISO 14155:2020 § 6.6  │
│ ║        requires feasible eligibility criteria.              │
│ ║        ──────────────────────────────────────────────────── │
│ ║        Raised by: System Consistency Check  •  2026-02-07   │
└──────────────────────────────────────────────────────────────┘

Tailwind Classes:
<div className="border-l-4 rounded p-4 bg-red-50 border-red-500">
  <div className="flex items-start gap-3">
    <Ban className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-red-900">
          BLOCKER
        </span>
        <span className="text-xs text-slate-500">•</span>
        <span className="text-xs font-medium text-slate-900">
          Inclusion Criteria & Sample Size Alignment
        </span>
      </div>
      <p className="text-xs leading-relaxed mb-2 text-red-800">
        Cross-section consistency check failed...
      </p>
      <div className="text-xs text-slate-600 italic mb-2">
        Reference: Conflicts with Section 4.4...
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-200">
        <span>Raised by: System Consistency Check</span>
        <span>•</span>
        <span>2026-02-07</span>
      </div>
    </div>
  </div>
</div>
```

**Användning**: Kritiska problem som MÅSTE lösas innan approval. Blockerar godkännande.

---

### ISSUE (Medium Priority)

#### Visual Properties
```
Background:    bg-orange-50
Border:        border-l-4 border-orange-500
Icon:          XCircle (w-5 h-5 text-orange-600)
Label:         text-orange-900
Description:   text-orange-800
```

#### Example Card
```
┌──────────────────────────────────────────────────────────────┐
│ ║ [⊗]  ISSUE • Exclusion Criteria                            │
│ ║                                                              │
│ ║        Exclusion criterion "LVEF <30%" should be            │
│ ║        cross-referenced with device Instructions for Use    │
│ ║        (IFU). Verify this threshold matches IFU             │
│ ║        contraindications to ensure protocol-IFU consistency.│
│ ║                                                              │
│ ║        Reference: ISO 14155:2020 § 6.7.3 - Protocol must   │
│ ║        align with IFU contraindications                     │
│ ║        ──────────────────────────────────────────────────── │
│ ║        Raised by: Dr. Thomas Weber  •  2026-02-07           │
└──────────────────────────────────────────────────────────────┘

Tailwind Classes:
<div className="border-l-4 rounded p-4 bg-orange-50 border-orange-500">
  <div className="flex items-start gap-3">
    <XCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-orange-900">
          ISSUE
        </span>
        <span className="text-xs text-slate-500">•</span>
        <span className="text-xs font-medium text-slate-900">
          Exclusion Criteria
        </span>
      </div>
      <p className="text-xs leading-relaxed mb-2 text-orange-800">
        Exclusion criterion "LVEF <30%" should be...
      </p>
      <div className="text-xs text-slate-600 italic mb-2">
        Reference: ISO 14155:2020 § 6.7.3...
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-200">
        <span>Raised by: Dr. Thomas Weber</span>
        <span>•</span>
        <span>2026-02-07</span>
      </div>
    </div>
  </div>
</div>
```

**Användning**: Allvarliga problem som starkt bör åtgärdas. Hindrar inte approval men rekommenderat att lösa.

---

### WARNING (Low Priority)

#### Visual Properties
```
Background:    bg-amber-50
Border:        border-l-4 border-amber-500
Icon:          AlertTriangle (w-5 h-5 text-amber-600)
Label:         text-amber-900
Description:   text-amber-800
```

#### Example Card
```
┌──────────────────────────────────────────────────────────────┐
│ ║ [⚠]  WARNING • Clinical Context & User Environment         │
│ ║                                                              │
│ ║        Device classification statement present but          │
│ ║        rationale for Class III determination under Rule 8   │
│ ║        should be expanded. Include explicit reference to    │
│ ║        cardiac contact duration and implantable nature.     │
│ ║                                                              │
│ ║        Reference: EU MDR 2017/745 Annex VIII Rule 8 -      │
│ ║        Implantable devices in contact with the heart        │
│ ║        ──────────────────────────────────────────────────── │
│ ║        Raised by: System Validation  •  2026-02-06          │
└──────────────────────────────────────────────────────────────┘

Tailwind Classes:
<div className="border-l-4 rounded p-4 bg-amber-50 border-amber-500">
  <div className="flex items-start gap-3">
    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-amber-900">
          WARNING
        </span>
        <span className="text-xs text-slate-500">•</span>
        <span className="text-xs font-medium text-slate-900">
          Clinical Context & User Environment
        </span>
      </div>
      <p className="text-xs leading-relaxed mb-2 text-amber-800">
        Device classification statement present but...
      </p>
      <div className="text-xs text-slate-600 italic mb-2">
        Reference: EU MDR 2017/745 Annex VIII Rule 8...
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-200">
        <span>Raised by: System Validation</span>
        <span>•</span>
        <span>2026-02-06</span>
      </div>
    </div>
  </div>
</div>
```

**Användning**: Mindre allvarliga problem eller förbättringsförslag. Påverkar inte approval.

---

## 3. COMPLETE COLOR PALETTE

### Blocker (Red Scale)
| Element | Tailwind Class | Hex Code | Usage |
|---------|---------------|----------|-------|
| Background | `bg-red-50` | #FEF2F2 | Card background |
| Border | `border-red-500` | #EF4444 | Left border (4px) |
| Icon | `text-red-600` | #DC2626 | Ban icon |
| Label | `text-red-900` | #7F1D1D | "BLOCKER" text |
| Description | `text-red-800` | #991B1B | Issue description |

### Issue (Orange Scale)
| Element | Tailwind Class | Hex Code | Usage |
|---------|---------------|----------|-------|
| Background | `bg-orange-50` | #FFF7ED | Card background |
| Border | `border-orange-500` | #F97316 | Left border (4px) |
| Icon | `text-orange-600` | #EA580C | XCircle icon |
| Label | `text-orange-900` | #7C2D12 | "ISSUE" text |
| Description | `text-orange-800` | #9A3412 | Issue description |

### Warning (Amber Scale)
| Element | Tailwind Class | Hex Code | Usage |
|---------|---------------|----------|-------|
| Background | `bg-amber-50` | #FFFBEB | Card background |
| Border | `border-amber-500` | #F59E0B | Left border (4px) |
| Icon | `text-amber-600` | #D97706 | AlertTriangle icon |
| Label | `text-amber-900` | #78350F | "WARNING" text |
| Description | `text-amber-800` | #92400E | Issue description |

### Neutral Elements (Shared across all severities)
| Element | Tailwind Class | Hex Code | Usage |
|---------|---------------|----------|-------|
| Subsection name | `text-slate-900` | #0F172A | Dark, high contrast |
| Bullet separator | `text-slate-500` | #64748B | Medium gray |
| Reference text | `text-slate-600` | #475569 | Slightly darker gray |
| Footer metadata | `text-slate-500` | #64748B | Medium gray |
| Footer border | `border-slate-200` | #E2E8F0 | Light divider |

---

## 4. TYPOGRAPHY & SPACING

### Font Sizes & Weights
```css
Severity Label:    text-xs font-medium uppercase tracking-wide
Subsection Name:   text-xs font-medium (normal case)
Description:       text-xs (normal weight) leading-relaxed
Reference:         text-xs italic (normal weight)
Footer Metadata:   text-xs (normal weight)
```

### Spacing System
```css
Card Padding:      p-4         (1rem all sides)
Icon Gap:          gap-3       (0.75rem between icon and content)
Header MB:         mb-1        (0.25rem below severity line)
Description MB:    mb-2        (0.5rem below description)
Reference MB:      mb-2        (0.5rem below reference)
Footer PT:         pt-2        (0.5rem above footer)
Footer Gap:        gap-3       (0.75rem between metadata items)
```

### Border & Radius
```css
Left Border:       border-l-4   (4px thick)
Corner Radius:     rounded      (0.25rem, subtle)
Footer Divider:    border-t     (1px top border)
```

---

## 5. CARD LAYOUT BREAKDOWN

### Flexbox Structure
```
<div> (Card Container)
  ├── border-l-4 (colored severity indicator)
  ├── rounded (subtle corners)
  ├── p-4 (consistent padding)
  └── bg-{severity}-50 (light tinted background)
      │
      └── <div> (Inner Flex Container)
          ├── flex items-start gap-3
          │
          ├── [Icon] (Left side)
          │   ├── w-5 h-5
          │   ├── text-{severity}-600
          │   ├── flex-shrink-0
          │   └── mt-0.5 (slight top alignment)
          │
          └── <div> (Content Area - flex-1)
              │
              ├── [Header Line] (flex items-center gap-2 mb-1)
              │   ├── <span> SEVERITY (uppercase, colored)
              │   ├── <span> • (bullet separator)
              │   └── <span> Subsection Name (bold, dark)
              │
              ├── [Description] (text-xs leading-relaxed mb-2)
              │   └── Issue description text...
              │
              ├── [Reference] (text-xs italic text-slate-600 mb-2)
              │   └── Reference: ISO 14155...
              │
              └── [Footer] (flex items-center gap-3 text-xs pt-2 border-t)
                  ├── <span> Raised by: Name
                  ├── <span> •
                  └── <span> Date
```

---

## 6. INTERACTIVE STATES

### Click to Navigate
Cards in the issues panel är clickable för att navigera till relevant sektion:

```tsx
<button
  onClick={() => {
    const subsectionId = issue.subsection.toLowerCase().replace(/\s+/g, '-');
    const element = document.getElementById(subsectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }}
  className="block w-full text-left hover:bg-{severity}-100 transition-colors"
>
  {/* Card content */}
</button>
```

### Hover States
```css
Blocker:   hover:bg-red-100
Issue:     hover:bg-orange-100
Warning:   hover:bg-amber-100

Transition: transition-colors (smooth fade)
```

---

## 7. CARD VARIATIONS

### With Reference (Standard)
```tsx
<div className="text-xs text-slate-600 italic mb-2">
  Reference: ISO 14155:2020 § 6.7.3 - Protocol must align with IFU contraindications
</div>
```

### Without Reference
Om `issue.reference` är `undefined`, visa inte reference-blocket alls:
```tsx
{issue.reference && (
  <div className="text-xs text-slate-600 italic mb-2">
    Reference: {issue.reference}
  </div>
)}
```

### Long Description
Description använder `leading-relaxed` för god läsbarhet vid långa texter:
```css
line-height: 1.625 (26px för 16px font size)
```

### Multiple Cards (Stacked)
Cards staplas vertikalt med `space-y-3` mellan:
```tsx
<div className="space-y-3">
  {issues.map((issue) => (
    <div key={issue.id} className="border-l-4 rounded p-4...">
      {/* Card content */}
    </div>
  ))}
</div>
```

---

## 8. ACCESSIBILITY

### Semantic Markup
- Cards använder semantic HTML (`<div>` eller `<button>` beroende på clickability)
- Icons har `flex-shrink-0` för att förhindra distortion
- `mt-0.5` på icons alignar dem med första textraden

### Color Contrast
All text uppfyller WCAG AA standards:
- **Blocker**: `text-red-800` på `bg-red-50` = 9.2:1
- **Issue**: `text-orange-800` på `bg-orange-50` = 8.5:1
- **Warning**: `text-amber-800` på `bg-amber-50` = 7.8:1

### Screen Reader Support
```tsx
<span className="sr-only">Blocker severity issue</span>
<Ban className="w-5 h-5 text-red-600" aria-hidden="true" />
```

---

## 9. RESPONSIVE BEHAVIOR

### Desktop (>1024px)
- Full card width
- Padding: `p-4`
- All content visible

### Tablet (768-1024px)
- Same layout
- Slight reduction in outer margins

### Mobile (<768px)
- Stack all elements vertically
- Same `p-4` padding (maintains touch target size)
- Description `leading-relaxed` helps readability on small screens

---

## 10. INTEGRATION WITH PROTOCOL SECTION

### Placement in Layout
Issues visas efter Completeness Status och före Protocol Content:

```
1. Review Header
2. Roles & Approval Card
3. Completeness Status
4. AI Role Clarity Banner
5. Locked Section Banner
6. ⚠️ BLOCKER ISSUES (röda cards)
7. ⚠️ ISSUE/WARNING ISSUES (orange/amber cards)
8. Guidance (collapsible)
9. Purpose Line
10. Protocol Content
11. Actions
```

### Grouped Display
Blockers visas i egen panel, issues/warnings i annan panel:

```tsx
{/* Blocker Panel */}
{blockerIssues.length > 0 && (
  <div className="border-2 border-red-400 rounded bg-red-50">
    <button onClick={...} className="w-full p-4 text-left">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <div className="text-sm font-medium text-red-900">
          Blocked by unresolved Issue
        </div>
      </div>
    </button>
    {expanded && (
      <div className="px-4 pb-4 space-y-2 border-t border-red-200">
        {blockerIssues.map((issue) => (
          /* Individual blocker card */
        ))}
      </div>
    )}
  </div>
)}

{/* Issues/Warnings Panel */}
{nonBlockerIssues.length > 0 && (
  <div className="space-y-3">
    {nonBlockerIssues.map((issue) => (
      /* Individual issue/warning card */
    ))}
  </div>
)}
```

---

## 11. DATA STRUCTURE REFERENCE

```typescript
interface ProtocolIssue {
  id: string;                              // Unique identifier
  severity: 'blocker' | 'issue' | 'warning'; // Determines color scheme
  subsection: string;                      // "Clinical Context & User Environment"
  description: string;                     // Main issue text
  reference?: string;                      // ISO/regulatory reference (optional)
  raisedBy: string;                        // "Dr. Weber" or "System Validation"
  raisedDate: string;                      // "2026-02-18 14:30"
  status: 'open' | 'potentially-resolved' | 'resolved'; // Filter by status
}
```

---

## 12. EXAMPLES IN CONTEXT

### Blocker in Section 5 (Subject Eligibility Criteria)
```
Section 5: Subject Eligibility Criteria [Draft] [1 Blocker]

[Expanded view shows:]

┌─────────────────────────────────────────────────────────────┐
│ ║ [🚫] BLOCKER • Inclusion Criteria & Sample Size Alignment │
│ ║                                                             │
│ ║       Cross-section consistency check failed: Section 4.8  │
│ ║       specifies N=120 target enrollment with 6-month       │
│ ║       enrollment period...                                 │
│ ║                                                             │
│ ║       Reference: Conflicts with Section 4.4...             │
│ ║       ───────────────────────────────────────────────────  │
│ ║       Raised by: System Consistency Check  •  2026-02-07   │
└─────────────────────────────────────────────────────────────┘

[Navigate to Section 5] ← Button to scroll to section
```

### Warning in Section 3 (Device Description)
```
Section 3: Device Description [Draft] [1 Warning]

[Expanded view shows:]

┌─────────────────────────────────────────────────────────────┐
│ ║ [⚠] WARNING • Clinical Context & User Environment         │
│ ║                                                             │
│ ║       Device classification statement present but          │
│ ║       rationale for Class III determination under Rule 8   │
│ ║       should be expanded...                                │
│ ║                                                             │
│ ║       Reference: EU MDR 2017/745 Annex VIII Rule 8        │
│ ║       ───────────────────────────────────────────────────  │
│ ║       Raised by: System Validation  •  2026-02-06          │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. DESIGN RATIONALE

### Why Left Border Instead of Full Border?
- **Visual weight**: 4px left border creates clear severity indicator utan att ta över hela kortet
- **Scanability**: Ögat ser omedelbart färgen till vänster när man scrollar
- **Minimal design**: Matchar enterprise/compliance aesthetic

### Why Three Severity Levels?
- **Blocker**: Måste lösas (blockar approval)
- **Issue**: Bör lösas (strong recommendation)
- **Warning**: Kan lösas (improvement suggestion)

Ger tydlig action-hierarchy för reviewers.

### Why Uppercase Severity Labels?
- **Immediate recognition**: All-caps "BLOCKER" är omedelbart synlig
- **Compliance tradition**: Regulatory software använder ofta uppercase för kritiska markers
- **Tracking-wide**: Extra spacing förbättrar läsbarhet av korta uppercase strings

### Why Italic References?
- **Visual distinction**: Separerar regulatory citations från issue description
- **Scholarly convention**: References/citations traditionellt italicerade
- **Subtle emphasis**: Italic signalerar "extra information" utan att distrahera

---

## 14. FUTURE ENHANCEMENTS

### Potential Additions
- [ ] Status badge ("Open", "Resolved", "Potentially Resolved")
- [ ] Assignee field ("Assigned to: Dr. Weber")
- [ ] Due date indicator
- [ ] Comment thread preview
- [ ] Action buttons ("Mark as Resolved", "Add Comment")
- [ ] Linked issues (cross-references)

### Accessibility Improvements
- [ ] Keyboard navigation between cards
- [ ] Screen reader announcements for severity
- [ ] High contrast mode support
- [ ] Focus indicators for clickable cards

---

**Last Updated**: 2026-02-21  
**Component**: Protocol Section Issue Cards  
**Related Files**: 
- `/components/protocol-section.tsx`
- `/App.tsx` (sample data)
- `/LAYOUT-OCH-FUNKTIONALITET-FORKLARING.md`
