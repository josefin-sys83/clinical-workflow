# Implementation Prompt: Protocol Section Layout & Issues/Completeness

## Context

Vi bygger ett desktop enterprise UI för en reglerad MedTech Clinical Investigation Platform enligt ISO 14155. Systemet är ett komplett protokollutvecklingssystem där användare granskar, redigerar, godkänner och låser AI-genererat innehåll enligt regulatoriska roller och ansvar.

Designen ska vara:
- Grayscale/neutral
- Strukturerad
- Minimal decoration
- Hög informationstäthet men lugn
- Kännas som compliance/audit software, inte consumer-produkter

## Uppgift

Implementera eller uppdatera protokollsektionskomponenten (`/components/protocol-section.tsx`) så att den följer den layout och funktionalitet som beskrivs i dokumentationen.

## Dokumentation att följa

Läs och följ dessa dokument exakt:

1. **`/LAYOUT-OCH-FUNKTIONALITET-FORKLARING.md`**
   - Övergripande layout (11 block i rätt ordning)
   - Completeness Status funktionalitet och syfte
   - Issues Panel funktionalitet och syfte
   - Skillnaden mellan Completeness och Issues
   - Layout i olika scenarios (Draft, Review Mode, Locked)
   - Interaktionsflöden och beteenden

2. **`/COMPLETENESS-STATUS-VISUAL-SPEC.md`**
   - Exakta Tailwind-klasser för Completeness Status-komponenten
   - Färgpalett och typografi
   - Spacing och hierarki
   - Header, Inspection Note, Elements List, Footer

## Kritiska krav

### Layout-ordning (Expanderad sektion)
Följ exakt denna ordning när en sektion är expanderad:

1. **Review Header** (metadata: review cycle, approver, reviewer, etc.)
2. **Roles & Approval Card** (Content Owner + Required Approver)
3. **Completeness Status** (ISO 14155 Required Elements)
4. **AI Role Clarity Banner** (endast i Review Mode)
5. **Locked Section Banner** (endast om låst)
6. **Blocker Banner** (endast om blocker issues finns)
7. **Issues Panel** (endast om non-blocker issues finns)
8. **What This Section Must Include** (Guidance - collapsible)
9. **Purpose Line** (kort one-liner)
10. **Protocol Content** (editable, med inline issue markers)
11. **Section Actions** (Approve Section, Request Changes)

### Completeness Status

**Syfte**: Visar om alla ISO 14155:2020 Required Elements finns i sektionen

**Beteende**:
- Default: **EXPANDED** (inspection-kritiskt)
- Collapsible: Ja (men default expanded)
- Position: Block #3
- Färg: Neutral (`bg-white`, `border-slate-200`)
- Status: Complete (✓ blå), Partial (⚠ amber), Missing (○ grå)
- Header visar: "Completeness Status (ISO 14155:2020 Required Elements)" + counter (3/5)
- Expanded visar:
  - Inspection Note (ljusgrå bakgrund)
  - Lista av required elements med status
  - Human Verification Footer

**Viktigt**: Detta är INTE samma sak som Issues. Completeness = struktur finns, Issues = innehåll är bra.

### Issues Panel

**Syfte**: Visar kvalitetsproblem, regulatory gaps, och strukturella fel i innehållet

**Beteende**:
- Default: 
  - **COLLAPSED** i Authoring Mode
  - **EXPANDED** i Review Mode
- Position: Block #6-7 (efter Completeness, före Guidance)
- Två separata paneler:
  - **Blocker Banner** (Block #6): Röd, kritisk
  - **Issues/Warnings Panel** (Block #7): Orange/Amber

**Blocker Issues**:
- Färg: `bg-red-50`, `border-red-400`
- Alltid i egen panel högst upp
- Authoring Mode: Collapsible
- Review Mode: Alltid expanderad
- Text: "Blocked by unresolved Issue"

**Issue/Warning Issues**:
- Färg: Orange (`bg-orange-50`) eller Amber (`bg-amber-50`)
- Egen panel under Blocker
- Authoring Mode: Collapsible
- Review Mode: Alltid expanderad
- Text: "Issues requiring attention (X)"

### Collapsed State (Authoring Mode)

När issues är collapsed i Authoring Mode, visa kompakta banners:

```tsx
// Blocker (collapsed)
<button className="w-full p-3 bg-red-50 border-l-4 border-red-500 rounded">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-red-900">Blocked by unresolved Issue</span>
    <ChevronDown className="w-4 h-4 text-red-600 -rotate-90" />
  </div>
</button>

// Issues/Warnings (collapsed)
<button className="w-full p-3 bg-amber-50 border border-amber-200 rounded">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <AlertCircle className="w-4 h-4 text-amber-600" />
      <span className="text-sm text-amber-900">3 Issues requiring attention</span>
      {blockerCount > 0 && (
        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
          1 Blocker
        </span>
      )}
    </div>
    <ChevronDown className="w-4 h-4 text-amber-600 -rotate-90" />
  </div>
</button>
```

### Review Mode vs Authoring Mode

| Feature | Authoring Mode | Review Mode |
|---------|----------------|-------------|
| Issues default state | Collapsed | Expanded |
| Issues collapsible | Ja | Nej |
| AI Role Clarity Banner | Dold | Synlig |
| Visual prominence | Subtle | Prominent |
| Border på issues | `border` | `border-2` |

### Färgpalett

**Neutral/Metadata**:
- Primär text: `text-slate-900`
- Sekundär text: `text-slate-600`
- Tertiär text: `text-slate-500`
- Bakgrund: `bg-white`, `bg-slate-50`
- Border: `border-slate-200`, `border-slate-300`

**Severity-baserade färger**:
- Blocker: `bg-red-50`, `border-red-400/500`, `text-red-600/800/900`
- Issue: `bg-orange-50`, `border-orange-500`, `text-orange-600/800/900`
- Warning: `bg-amber-50`, `border-amber-500`, `text-amber-600/800/900`

**Status-färger**:
- Complete: `text-blue-600/700`
- Partial: `text-amber-600`
- Missing: `text-slate-300`

### Typografi

All body text använder `text-xs` för hög informationstäthet. Hierarki skapas genom färg och spacing, inte size/weight.

### Conditional Rendering

```tsx
// Completeness Status: Visa alltid om data finns
{section.requiredElements && section.requiredElements.length > 0 && (
  <SectionCompletenessIndicator ... />
)}

// AI Role Clarity: Endast i Review Mode + AI-generated
{section.aiGenerated && isReviewMode && (
  <AIRoleClarityBanner ... />
)}

// Locked Banner: Endast om låst
{section.locked && (
  <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded">
    ...
  </div>
)}

// Blocker Banner: Endast om blocker issues finns
{isBlocked && blockerIssues.length > 0 && (
  <div className="border-2 border-red-400 rounded bg-red-50">
    ...
  </div>
)}

// Issues Panel: Endast om non-blocker issues finns
{openIssues.length > 0 && !isBlocked && (
  // Different rendering för authoring vs review mode
  isReviewMode ? (
    // Always expanded
  ) : (
    // Collapsible
  )
)}
```

### Issue Data Structure

```typescript
interface ProtocolIssue {
  id: string;
  severity: 'blocker' | 'issue' | 'warning';
  subsection: string; // Vilken underrubrik i sektionen
  description: string; // Beskrivning av problemet
  reference?: string; // ISO 14155 referens
  raisedBy: string; // Vem som rapporterade
  raisedDate: string; // När
  status: 'open' | 'potentially-resolved' | 'resolved';
}
```

### Required Elements Data Structure

```typescript
interface RequiredElement {
  id: string;
  name: string; // "Device Description and Specifications"
  status: 'complete' | 'partial' | 'missing';
  reference: string; // "ISO 14155:2020 Section 7.2.3"
  verifiedBy?: string; // "Emma Chen"
  verifiedDate?: string; // "2026-02-18"
}
```

## Interaktioner

### Completeness Status
- Click på header → toggle expand/collapse
- Chevron roterar (› → ∨)
- Content fades in/out
- Påverkar INTE issues eller protocol content

### Issues Panel
- Click på collapsed banner → expanderar
- Click på issue description → scrollar smooth till relevant subsection
- I Review Mode: Kan inte collapse (alltid synlig)
- I Authoring Mode: Kan collapse för att fokusera på content

### Click on Issue → Scroll to Content
```tsx
onClick={() => {
  const subsectionId = issue.subsection.toLowerCase().replace(/\s+/g, '-');
  const element = document.getElementById(subsectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}}
```

## Section Actions

Längst ner i expanded section:

```tsx
<div className="flex items-center justify-between pt-4 border-t border-slate-200">
  <div className="text-xs text-slate-500">
    {isReviewMode 
      ? 'Review mode active • Focus on issues and completeness'
      : 'Owner can edit content • Reviewers can comment and raise issues'
    }
  </div>
  <div className="flex items-center gap-2">
    {/* Request Changes: Endast om locked ELLER approved */}
    {(section.locked || isApproved) && (
      <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded">
        Request Changes
      </button>
    )}
    {/* Approve Section: Endast om INTE approved */}
    {!isApproved && (
      <button className="px-4 py-2 bg-blue-600 text-white rounded">
        Approve Section
      </button>
    )}
  </div>
</div>
```

**Viktigt**: "Request Changes" ska INTE visas för draft sections (endast locked/approved). Detta fixades nyligen.

## Testing Scenarios

Testa att layouten fungerar korrekt i dessa scenarios:

1. **Clean Draft**: 
   - Ingen issues, några required elements complete
   - Endast: Review Header → Roles → Completeness → Guidance → Purpose → Content → Actions

2. **Draft with Blocker** (Authoring Mode):
   - Blocker banner collapsed som default
   - Click expanderar den
   - Blocker visas före Issues Panel

3. **Draft with Issues** (Review Mode):
   - Blocker banner expanded, cannot collapse
   - Issues panel expanded, cannot collapse
   - AI Role Clarity Banner synlig
   - Prominent borders (`border-2`)

4. **Locked Section**:
   - Locked banner synlig högst upp (efter Completeness)
   - "Initiate Amendment" knapp
   - "Request Changes" i actions
   - Ingen "Approve Section" knapp

5. **Approved but not Locked**:
   - "Approved" badge i header
   - "Request Changes" i actions
   - Ingen "Approve Section" knapp

## Edge Cases

- **Sektion utan required elements**: Completeness Status visas inte alls
- **Sektion utan issues**: Ingen Issues Panel
- **Alla issues resolved**: Issues Panel försvinner
- **Blocker resolved men andra issues finns**: Blocker Banner försvinner, Issues Panel finns kvar
- **Review Mode → Authoring Mode switch**: Issues kollapsar till compact state
- **Authoring Mode → Review Mode switch**: Issues expanderar automatiskt

## Components att använda

Använd befintliga komponenter:
- `<SectionCompletenessIndicator>` från `/components/section-completeness-indicator.tsx`
- `<AIRoleClarityBanner>` från `/components/ai-role-clarity-banner.tsx`
- `<AmendmentWarning>` från `/components/amendment-warning.tsx`
- `<ProtocolTextSeparator>` från `/components/protocol-text-separator.tsx`
- `<ReferencedDocumentsPanel>` från `/components/referenced-documents-panel.tsx`

Lucide Icons:
- `AlertCircle` - Issues icon
- `Ban` - Blocker icon
- `XCircle` - Issue icon
- `AlertTriangle` - Warning icon
- `Info` - Information icon
- `Lock` - Locked icon
- `ChevronDown` - Expand/collapse
- `ChevronRight` - Collapsed state

## Accessibility

- Alla collapsible sections har `aria-label` för expand/collapse
- Status icons har semantic meaning genom färg OCH form
- Keyboard navigation fungerar för alla interactive elements
- Focus states är tydliga (`focus:ring-2 focus:ring-blue-500`)

## Audit Trail Integration

Både Completeness och Issues loggar till audit trail:

**Completeness events**:
- "Element marked as complete: Device Description"
- "Element verified by Emma Chen"
- "Completeness status changed from partial to complete"

**Issues events**:
- "Issue raised: [BLOCKER] Missing safety procedures"
- "Issue status changed from open to resolved"
- "Issue resolved by Dr. Weber"

## Performance

- Använd `useState` för lokala collapse/expand states
- Använd conditional rendering för att undvika rendering av hidden content
- Smooth scroll animation vid click på issue → content
- Lazy load audit trail (modal, inte inline)

## Slutkommentar

Målet är en **tydlig, strukturerad, audit-säker layout** där användaren snabbt kan:
1. Se metadata och kontext (Review Header, Roles)
2. Kontrollera regulatory compliance (Completeness Status)
3. Identifiera problem (Issues Panel)
4. Få hjälp vid behov (Guidance)
5. Redigera innehåll (Protocol Content)
6. Godkänna eller begära ändringar (Actions)

Följ dokumentationen exakt. Använd exakta Tailwind-klasser från specs. Behåll enterprise/compliance-känslan genom neutral färgpalett och hög informationstäthet.

**Lycka till!** 🎯
