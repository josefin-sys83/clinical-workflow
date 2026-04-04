# Completeness Status - Visual Specification

## Design Principles
- **Neutral, grayscale palette** - enterprise compliance software aesthetic
- **High information density** - all critical data visible without overwhelming
- **Clear regulatory context** - ISO 14155:2020 references prominent
- **Human responsibility emphasis** - AI assists, humans verify
- **Structured hierarchy** - clear visual separation between header, content, footer

---

## Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (collapsible)                                        │
├─────────────────────────────────────────────────────────────┤
│ INSPECTION NOTE (light background)                          │
├─────────────────────────────────────────────────────────────┤
│ REQUIRED ELEMENTS LIST                                       │
│   • Element 1                                                │
│   • Element 2                                                │
│   • Element 3                                                │
├─────────────────────────────────────────────────────────────┤
│ HUMAN VERIFICATION FOOTER (light background)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. HEADER (Collapsed & Expanded)

### Layout
```
┌──────────────────────────────────────────────────────┐
│ Completeness Status  (ISO 14155:2020 Required       │
│                       Elements)         [3/5]  [›]   │
└──────────────────────────────────────────────────────┘
```

### Specifications
- **Background**: `bg-white`
- **Border**: `border border-slate-200 rounded`
- **Padding**: `px-3 py-2.5`
- **Hover**: `hover:bg-slate-50` (entire header clickable)

#### Left Side
- **"Completeness Status"**: 
  - Font: `text-xs text-slate-900` (dark, prominent)
  - Weight: normal
  
- **"(ISO 14155:2020 Required Elements)"**: 
  - Font: `text-xs text-slate-500` (subdued)
  - Weight: normal
  - Gap from title: `gap-2`

#### Right Side
- **Progress Counter** (when not all complete):
  - Format: `3/5` (complete/total)
  - Font: `text-xs text-slate-600`
  
- **"Complete" Badge** (when all complete):
  - Font: `text-xs text-blue-700`
  - No background, no border
  
- **Chevron Icon**:
  - Size: `w-3.5 h-3.5`
  - Color: `text-slate-400`
  - Right-pointing when collapsed: `ChevronRight`
  - Down-pointing when expanded: `ChevronDown`

---

## 2. INSPECTION NOTE

### Layout
```
┌──────────────────────────────────────────────────────┐
│ [i] Inspection requirement: This section must        │
│     cover all required elements per ISO 14155:2020.  │
│     AI may assist in identifying gaps, but final     │
│     confirmation must be performed and verified by   │
│     the section owner or reviewer.                   │
└──────────────────────────────────────────────────────┘
```

### Specifications
- **Background**: `bg-slate-50`
- **Border**: `border-b border-slate-200` (bottom only)
- **Padding**: `px-3 py-2`

#### Icon
- **Info icon**: `Info` from lucide-react
- **Size**: `w-3.5 h-3.5`
- **Color**: `text-slate-500`
- **Alignment**: `flex-shrink-0 mt-0.5` (aligned to top)

#### Text
- **Font**: `text-xs text-slate-600`
- **Content**: Regulatory guidance emphasizing human responsibility
- **Gap from icon**: `gap-2`

---

## 3. REQUIRED ELEMENTS LIST

### Individual Element Layout
```
┌──────────────────────────────────────────────────────┐
│ Device Description and Specifications           [✓]  │
│ ISO 14155:2020 Section 7.2.3                         │
│ Verified by Emma Chen on 2026-02-18                  │
├──────────────────────────────────────────────────────┤
│ Patient Population and Selection Criteria       [⚠]  │
│ ISO 14155:2020 Section 7.2.4                         │
│ Partially covered - requires completion               │
├──────────────────────────────────────────────────────┤
│ Adverse Events Reporting                        [○]  │
│ ISO 14155:2020 Section 7.2.9                         │
│ Missing - must be added before approval               │
└──────────────────────────────────────────────────────┘
```

### Specifications
- **Container**: `px-3 py-2 space-y-2`
- **Each element**: `py-2 border-b border-slate-100 last:border-0`

#### Element Name (Line 1)
- **Font**: `text-xs text-slate-900`
- **Weight**: normal
- **Position**: left-aligned, flex-1

#### ISO Reference (Line 2)
- **Font**: `text-xs text-slate-500`
- **Format**: "ISO 14155:2020 Section X.X.X"
- **Margin**: `mb-1` (below name)

#### Status Message (Line 3, conditional)
- **Complete status** (when verified):
  - Font: `text-xs text-slate-500`
  - Format: "Verified by [Name] on [Date]"
  
- **Partial status**:
  - Font: `text-xs text-amber-600`
  - Format: "Partially covered - requires completion"
  - Margin: `mt-1`
  
- **Missing status**:
  - Font: `text-xs text-red-600`
  - Format: "Missing - must be added before approval"
  - Margin: `mt-1`

#### Status Icon (Right Side)
- **Position**: `flex-shrink-0 mt-0.5` (aligned to top)
- **Complete**: 
  - Icon: `CheckCircle2`
  - Size: `w-3.5 h-3.5`
  - Color: `text-blue-600`
  
- **Partial**:
  - Icon: `AlertCircle`
  - Size: `w-3.5 h-3.5`
  - Color: `text-amber-600`
  
- **Missing**:
  - Icon: `Circle` (empty circle)
  - Size: `w-3.5 h-3.5`
  - Color: `text-slate-300`

---

## 4. HUMAN VERIFICATION FOOTER

### Layout
```
┌──────────────────────────────────────────────────────┐
│ Note: Completeness verification is a human           │
│ responsibility. AI suggestions for gaps are           │
│ advisory only.                                        │
└──────────────────────────────────────────────────────┘
```

### Specifications
- **Background**: `bg-slate-50`
- **Border**: `border-t border-slate-200` (top only)
- **Padding**: `px-3 py-2`
- **Font**: `text-xs text-slate-600`
- **Content**: Emphasizes human responsibility over AI assistance

---

## Color Palette Reference

### Text Colors
- **Primary text**: `text-slate-900` (headings, element names)
- **Secondary text**: `text-slate-600` (body text, notes)
- **Tertiary text**: `text-slate-500` (metadata, ISO references)
- **Complete status**: `text-blue-700` (success)
- **Complete icon**: `text-blue-600` (success)
- **Partial status**: `text-amber-600` (warning)
- **Missing status**: `text-red-600` (critical)
- **Missing icon**: `text-slate-300` (neutral/empty)

### Background Colors
- **Main container**: `bg-white`
- **Note sections**: `bg-slate-50` (subtle distinction)
- **Hover state**: `hover:bg-slate-50`

### Border Colors
- **Outer border**: `border-slate-200`
- **Section dividers**: `border-slate-200`
- **Element separators**: `border-slate-100` (lighter, less prominent)

---

## Typography Hierarchy

All text uses `text-xs` for consistency with enterprise dashboard aesthetic.

### Weight Hierarchy
1. **Element names**: normal weight, `text-slate-900`
2. **ISO references**: normal weight, `text-slate-500`
3. **Status messages**: normal weight, color-coded by severity
4. **Guidance text**: normal weight, `text-slate-600`

---

## Spacing System

- **Outer padding**: `px-3 py-2.5` (header), `px-3 py-2` (content)
- **Element spacing**: `space-y-2` (between elements)
- **Individual element**: `py-2` (vertical padding)
- **Icon gaps**: `gap-2` (between icon and text)
- **Text line gaps**: `mb-1` (between lines within element)

---

## Interaction States

### Header (Collapsible)
- **Default**: `bg-white`
- **Hover**: `bg-slate-50`
- **Cursor**: `cursor-pointer`
- **Transition**: `transition-colors`

### No Other Interactive Elements
- List items are read-only displays
- No buttons or clickable actions within elements
- Focus on information presentation, not interaction

---

## Regulatory Compliance Notes

### Audit Trail Integration
- Each completeness verification should log to audit trail
- ISO reference must always be visible
- Human verifier name and date required for "complete" status

### Amendment Support
- Locked sections can still show completeness status
- Status reflects the current (locked) content
- Amendments may require re-verification

---

## Visual Consistency with Protocol Section Design

### Shared Design Language
- Same grayscale palette (`slate-*` scales)
- Same border treatment (`border-slate-200`, `rounded`)
- Same text sizing (`text-xs` throughout)
- Same background patterns (`bg-slate-50` for notes)
- Same icon sizing (`w-3.5 h-3.5`)

### Distinguishing Features
- Completeness Status uses more vertical structure
- ISO references are prominent (regulatory context)
- Three-state system (complete/partial/missing) vs binary (yes/no)
- Human verification emphasis throughout

---

## Implementation Notes

### Component Location
`/components/section-completeness-indicator.tsx`

### Key Props
- `sectionNumber`: string - identifies which protocol section
- `requiredElements`: RequiredElement[] - list of ISO-mandated elements
- `onVerify`: (elementId: string) => void - callback for verification actions

### Data Structure
```typescript
interface RequiredElement {
  id: string;
  name: string;
  status: 'complete' | 'partial' | 'missing';
  reference: string; // ISO 14155 reference
  verifiedBy?: string;
  verifiedDate?: string;
}
```

### Integration Points
- Appears in Protocol Section expanded view
- Between "Issues Panel" and "Protocol Content"
- Always visible in Review Mode
- Collapsible but defaults to expanded

---

## Future Considerations

### Phase 2 Enhancements
- Interactive verification workflow (mark as verified)
- AI gap detection (highlight potentially missing elements)
- Cross-reference to protocol content (click to jump)
- Bulk verification actions
- Export completeness report

### Accessibility
- Screen reader support for status states
- Keyboard navigation for collapsible header
- Clear ARIA labels for icons
- Sufficient color contrast (already meets WCAG AA)

---

**Last Updated**: 2026-02-20  
**Design System**: ISO 14155 Clinical Investigation Platform  
**Component Version**: 1.0
