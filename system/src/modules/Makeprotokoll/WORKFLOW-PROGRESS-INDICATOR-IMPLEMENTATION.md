# Workflow Progress Indicator - Implementation Guide

## Översikt

`WorkflowProgressIndicator` är en horizontal breadcrumb-komponent som visar den aktiva fasen i Clinical Investigation Protocol-lifecykeln. Den ska implementeras konsekvent på **ALLA sidor** som är del av protokollutvecklings- och rapportarbetsflödet.

---

## 1. KOMPONENT-SPECIFIKATION

### Component Path
```
/components/workflow-progress-indicator.tsx
```

### Props Interface
```typescript
interface WorkflowProgressIndicatorProps {
  currentStep: 'project-setup' | 
               'protocol-authoring' | 
               'protocol-review' | 
               'protocol-approval' | 
               'report-authoring' | 
               'report-review' | 
               'report-approval';
  onAuditLogClick?: () => void;
}
```

### Visual Appearance
```
┌────────────────────────────────────────────────────────────────────────┐
│ Project setup › Protocol authoring › Protocol review › Protocol...    │
│                                                            [📜 Audit log]│
└────────────────────────────────────────────────────────────────────────┘
```

**Styling:**
- **Active step**: `text-slate-700 font-semibold text-[130%]` (slightly larger, bold)
- **Inactive steps**: `text-slate-500` (muted gray)
- **Separator**: `›` in `text-slate-400`
- **Background**: `bg-white border-b border-slate-200`
- **Padding**: `px-6 py-2.5`

---

## 2. WORKFLOW STAGES (7 steg)

```
1. Project setup         → Initial project configuration, team roles
2. Protocol authoring    → Main protocol writing (AI-assisted)
3. Protocol review       → Formal review cycle, reviewer comments
4. Protocol approval     → Approver sign-off, locking
5. Report authoring      → Clinical investigation report writing
6. Report review         → Report review cycle
7. Report approval       → Final report approval
```

---

## 3. IMPLEMENTATION PÅ VARJE SIDA

### 3.1. App.tsx (Main Protocol Authoring Page)

**Current Step:** `protocol-authoring`

**Placement:** Direkt efter "Main Content Area" div, före "Top Header"

```tsx
import { WorkflowProgressIndicator } from './components/workflow-progress-indicator';
import { AuditLogPanel } from './components/audit-log-panel';

export default function App() {
  const [showAuditLog, setShowAuditLog] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ... */}
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Protocol Structure */}
        <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
          {/* ... */}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ✅ WORKFLOW PROGRESS INDICATOR HERE */}
          <WorkflowProgressIndicator 
            currentStep="protocol-authoring" 
            onAuditLogClick={() => setShowAuditLog(true)}
          />

          {/* Top Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4">
            {/* ... */}
          </div>

          {/* ... rest of content ... */}
        </div>
      </div>

      {/* Audit Log Panel */}
      <AuditLogPanel
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </div>
  );
}
```

**Status:** ✅ Redan implementerad

---

### 3.2. Project Setup Page

**File:** `/components/pages/project-setup.tsx`

**Current Step:** `project-setup`

**Placement:** Efter global navigation, före main content area

```tsx
import { WorkflowProgressIndicator } from '../workflow-progress-indicator';

export function ProjectSetupPage() {
  const [showAuditLog, setShowAuditLog] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Global Header (if exists) */}
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (if exists) */}
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ✅ WORKFLOW PROGRESS INDICATOR */}
          <WorkflowProgressIndicator 
            currentStep="project-setup" 
            onAuditLogClick={() => setShowAuditLog(true)}
          />

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <h1>Project Setup</h1>
              {/* ... setup forms, team config, etc. ... */}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Panel */}
      <AuditLogPanel
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </div>
  );
}
```

---

### 3.3. Protocol Review Page

**File:** `/components/protocol-review.tsx` eller `/components/pages/review.tsx`

**Current Step:** `protocol-review`

**Placement:** Efter sidebar, före main header

```tsx
import { WorkflowProgressIndicator } from './workflow-progress-indicator';

export function ProtocolReview() {
  const [showAuditLog, setShowAuditLog] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-64 bg-white border-r border-slate-200">
          {/* Sections navigation */}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ✅ WORKFLOW PROGRESS INDICATOR */}
          <WorkflowProgressIndicator 
            currentStep="protocol-review" 
            onAuditLogClick={() => setShowAuditLog(true)}
          />

          {/* Review Mode Banner/Header */}
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <h2>Review Mode Active - Cycle 2</h2>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* ... sections, comments, review findings ... */}
          </div>
        </div>

        {/* Right Panel - Review Findings */}
        <div className="w-80 bg-white border-l border-slate-200">
          {/* ... */}
        </div>
      </div>

      <AuditLogPanel
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </div>
  );
}
```

---

### 3.4. Protocol Approval Page

**File:** `/components/pages/protocol-approval.tsx` (om separat sida)

**Current Step:** `protocol-approval`

**Användning:** Samma pattern som Review Page

```tsx
<WorkflowProgressIndicator 
  currentStep="protocol-approval" 
  onAuditLogClick={() => setShowAuditLog(true)}
/>
```

---

### 3.5. Report Authoring Page

**File:** `/components/pages/report-authoring.tsx`

**Current Step:** `report-authoring`

**Användning:** Samma layout som Protocol Authoring

```tsx
<WorkflowProgressIndicator 
  currentStep="report-authoring" 
  onAuditLogClick={() => setShowAuditLog(true)}
/>
```

---

### 3.6. Report Review Page

**File:** `/components/pages/report-review.tsx`

**Current Step:** `report-review`

```tsx
<WorkflowProgressIndicator 
  currentStep="report-review" 
  onAuditLogClick={() => setShowAuditLog(true)}
/>
```

---

### 3.7. Report Approval Page

**File:** `/components/pages/report-approval.tsx`

**Current Step:** `report-approval`

```tsx
<WorkflowProgressIndicator 
  currentStep="report-approval" 
  onAuditLogClick={() => setShowAuditLog(true)}
/>
```

---

## 4. LAYOUT PLACEMENT PATTERN

### Standard Trelager Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ GLOBAL HEADER (optional, if exists)                             │
├─────────────────────────────────────────────────────────────────┤
│         │                                               │         │
│ LEFT    │ MAIN CONTENT AREA                            │ RIGHT  │
│ PANEL   │                                               │ PANEL  │
│         │ ┌──────────────────────────────────────────┐ │        │
│ Proto-  │ │ WORKFLOW PROGRESS INDICATOR              │ │ Issues │
│ col     │ ├──────────────────────────────────────────┤ │ /      │
│ Struc-  │ │ Page Header (Title, badges, etc)         │ │ Review │
│ ture    │ ├──────────────────────────────────────────┤ │ Panel  │
│         │ │                                           │ │        │
│         │ │ Main Content (sections, forms, etc)      │ │        │
│         │ │                                           │ │        │
│         │ │                                           │ │        │
│         │ └──────────────────────────────────────────┘ │        │
│         │                                               │         │
└─────────────────────────────────────────────────────────────────┘
```

**Key Point:** WorkflowProgressIndicator är **ALLTID:**
1. Direkt under global header (om den finns)
2. Först i "Main Content Area" `<div className="flex-1 flex flex-col overflow-hidden">`
3. Före page-specifik header (protocol title, review banner, etc)

---

## 5. INTEGRATION CHECKLIST

För **varje sida** i workflow:

- [ ] Import `WorkflowProgressIndicator` from `'./components/workflow-progress-indicator'`
- [ ] Import `AuditLogPanel` from `'./components/audit-log-panel'`
- [ ] Add `const [showAuditLog, setShowAuditLog] = useState(false);` state
- [ ] Place `<WorkflowProgressIndicator>` direkt efter main content area wrapper
- [ ] Set correct `currentStep` prop för sidans roll i workflow
- [ ] Connect `onAuditLogClick` till `setShowAuditLog(true)`
- [ ] Add `<AuditLogPanel>` modal före slutande `</div>` av page component
- [ ] Verify placement: Progress indicator ska vara ovanför page header men under global nav

---

## 6. VISUAL DESIGN DETAILS

### Typography
```css
Base font:        text-xs (0.75rem)
Active step:      font-semibold text-[130%] (scale up 30%)
Inactive steps:   Normal weight
Separator:        text-slate-400
```

### Colors
| Element | Color Class | Hex | Usage |
|---------|------------|-----|-------|
| Active step | `text-slate-700` | #334155 | Current workflow stage |
| Inactive steps | `text-slate-500` | #64748B | Future/past stages |
| Separator `›` | `text-slate-400` | #94A3B8 | Between steps |
| Background | `bg-white` | #FFFFFF | Bar background |
| Border | `border-slate-200` | #E2E8F0 | Bottom border |

### Spacing
```css
Horizontal padding:   px-6    (1.5rem)
Vertical padding:     py-2.5  (0.625rem)
Gap between steps:    gap-2   (0.5rem)
```

### Hover State (Audit Log Button)
```css
Default:  text-slate-500
Hover:    text-slate-700
Icon:     w-3.5 h-3.5 (History icon from lucide-react)
```

---

## 7. STATE MANAGEMENT

### Audit Log State
Varje sida som använder WorkflowProgressIndicator behöver:

```tsx
const [showAuditLog, setShowAuditLog] = useState<boolean>(false);
```

### Audit Log Panel Component
```tsx
<AuditLogPanel
  isOpen={showAuditLog}
  onClose={() => setShowAuditLog(false)}
/>
```

**Note:** AuditLogPanel är en slide-in modal från höger som visar all audit trail history för projektet.

---

## 8. RESPONSIVE BEHAVIOR

### Desktop (>1024px)
- Full horizontal layout med alla 7 steg synliga
- Audit log button till höger

### Tablet (768-1024px)
- Samma layout
- Text wrapping för långa step names

### Mobile (<768px)
- Consider hiding inactive steps och endast visa active + neighbors
- **ELLER** scroll horizontally med overflow
- Audit log button kan collapse till endast icon

**Current Implementation:** Desktop-only, ingen responsive behavior än.

---

## 9. ACCESSIBILITY

### Semantic HTML
```tsx
<div className="bg-white border-b border-slate-200 px-6 py-2.5">
  <div className="flex items-center justify-between">
    <nav aria-label="Workflow progress">
      <ol className="flex items-center gap-2 text-xs">
        {steps.map((step, index) => (
          <li key={step.id}>
            <span className={...} aria-current={step.id === currentStep ? 'step' : undefined}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span aria-hidden="true" className="text-slate-400">›</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
    
    <button aria-label="Open audit log" onClick={onAuditLogClick}>
      <History aria-hidden="true" />
      <span>Audit log</span>
    </button>
  </div>
</div>
```

**Improvements:**
- Use `<nav>` with `aria-label`
- Use `<ol>` för ordered list (workflow är sekventiell)
- Add `aria-current="step"` för active step
- Add `aria-hidden="true"` för separator characters
- Add `aria-label` för audit log button

---

## 10. INTEGRATION EXAMPLES

### Example 1: Protocol Development Page (already exists)

```tsx
// /components/protocol-development-page.tsx
import React, { useState } from 'react';
import { WorkflowProgressIndicator } from './workflow-progress-indicator';
import { AuditLogPanel } from './audit-log-panel';

export function ProtocolDevelopmentPage() {
  const [showAuditLog, setShowAuditLog] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200">
        {/* ... */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ✅ ADD THIS */}
        <WorkflowProgressIndicator 
          currentStep="protocol-authoring" 
          onAuditLogClick={() => setShowAuditLog(true)}
        />

        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h1>Protocol Development</h1>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ... sections ... */}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-80 bg-white border-l border-slate-200">
        {/* Issues panel */}
      </div>

      {/* ✅ ADD THIS */}
      <AuditLogPanel
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </div>
  );
}
```

---

### Example 2: Review Page (protocol-review.tsx)

```tsx
// /components/protocol-review.tsx
import React, { useState } from 'react';
import { WorkflowProgressIndicator } from './workflow-progress-indicator';
import { AuditLogPanel } from './audit-log-panel';

export function ProtocolReview() {
  const [showAuditLog, setShowAuditLog] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel */}
      <div className="w-64 bg-white border-r border-slate-300">
        {/* Sections nav */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ✅ ADD THIS */}
        <WorkflowProgressIndicator 
          currentStep="protocol-review" 
          onAuditLogClick={() => setShowAuditLog(true)}
        />

        {/* Review Banner */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <span className="text-sm font-semibold text-blue-900">
            Review Mode Active - Cycle 2
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ... review content ... */}
        </div>
      </div>

      {/* Right Panel - Review Findings */}
      <div className="w-80 bg-white border-l border-slate-300">
        {/* ... */}
      </div>

      {/* ✅ ADD THIS */}
      <AuditLogPanel
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </div>
  );
}
```

---

### Example 3: Project Setup Page (new implementation)

```tsx
// /components/pages/project-setup.tsx
import React, { useState } from 'react';
import { WorkflowProgressIndicator } from '../workflow-progress-indicator';
import { AuditLogPanel } from '../audit-log-panel';

export function ProjectSetupPage() {
  const [showAuditLog, setShowAuditLog] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Optional Left Sidebar */}
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ✅ WORKFLOW PROGRESS */}
          <WorkflowProgressIndicator 
            currentStep="project-setup" 
            onAuditLogClick={() => setShowAuditLog(true)}
          />

          {/* Page Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4">
            <h1 className="text-slate-900">Project Setup</h1>
            <p className="text-sm text-slate-600">
              Configure project details, assign roles, and initialize protocol
            </p>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl">
              {/* Setup forms, team management, etc. */}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ AUDIT LOG PANEL */}
      <AuditLogPanel
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </div>
  );
}
```

---

## 11. TESTING CHECKLIST

När du implementerar WorkflowProgressIndicator på en ny sida:

- [ ] **Visual verification**: Progress bar visas ovanför page header
- [ ] **Correct step highlighted**: Active step är bold och slightly larger
- [ ] **Audit log button**: Klickar öppnar AuditLogPanel
- [ ] **Audit log modal**: Kan stängas med X-knapp
- [ ] **No layout shift**: Progress bar tar inte för mycket vertical space
- [ ] **Consistent spacing**: Matches spacing på andra sidor
- [ ] **Color accuracy**: Active step är `text-slate-700`, inactive är `text-slate-500`
- [ ] **Separator rendering**: `›` characters visas korrekt mellan steps
- [ ] **No console errors**: Inga React warnings eller errors

---

## 12. COMMON MISTAKES TO AVOID

❌ **Fel placering:**
```tsx
// WRONG - Progress indicator AFTER page header
<div className="flex-1 flex flex-col">
  <div className="bg-white border-b px-6 py-4">
    <h1>Page Title</h1>
  </div>
  <WorkflowProgressIndicator currentStep="protocol-authoring" />
  {/* ... */}
</div>
```

✅ **Korrekt placering:**
```tsx
// CORRECT - Progress indicator BEFORE page header
<div className="flex-1 flex flex-col">
  <WorkflowProgressIndicator currentStep="protocol-authoring" onAuditLogClick={...} />
  <div className="bg-white border-b px-6 py-4">
    <h1>Page Title</h1>
  </div>
  {/* ... */}
</div>
```

---

❌ **Glömmer onAuditLogClick:**
```tsx
<WorkflowProgressIndicator currentStep="protocol-review" />
```

✅ **Inkluderar handler:**
```tsx
<WorkflowProgressIndicator 
  currentStep="protocol-review" 
  onAuditLogClick={() => setShowAuditLog(true)}
/>
```

---

❌ **Glömmer AuditLogPanel component:**
```tsx
// Missing AuditLogPanel - clicking "Audit log" does nothing visible
```

✅ **Inkluderar modal:**
```tsx
<AuditLogPanel
  isOpen={showAuditLog}
  onClose={() => setShowAuditLog(false)}
/>
```

---

## 13. FUTURE ENHANCEMENTS

### Potential improvements:
1. **Clickable steps**: Navigate to different workflow stages
2. **Progress percentage**: Show completion % för current step
3. **Step status icons**: Checkmarks för completed steps
4. **Collapse on mobile**: Auto-hide inactive steps på små screens
5. **Transition animations**: Smooth fade när active step ändras
6. **Tooltip on hover**: Show description of each workflow stage
7. **Keyboard navigation**: Tab through steps, Enter to navigate
8. **Locked step indicator**: Show lock icon för approved/locked stages

---

## 14. RELATED COMPONENTS

### Components som används tillsammans:
- **AuditLogPanel** (`/components/audit-log-panel.tsx`) - Visar audit trail history
- **WorkflowSidebar** (`/components/workflow-sidebar.tsx`) - Left panel navigation (om den finns)
- **ReviewModeIndicator** (`/components/review-mode-indicator.tsx`) - Review-specifik status banner
- **LifecycleStrip** (`/components/lifecycle-strip.tsx`) - Alternativ progress visualization?

### State Management:
- `showAuditLog` state behövs på varje sida
- Future: Global context för workflow state?

---

## 15. IMPLEMENTATION PRIORITY

Lägg till WorkflowProgressIndicator på följande sidor i prioritetsordning:

1. ✅ **App.tsx (Protocol Authoring)** - Already done
2. 🔲 **protocol-review.tsx** - High priority (active feature)
3. 🔲 **pages/project-setup.tsx** - High priority (workflow start)
4. 🔲 **protocol-development-page.tsx** - Medium priority
5. 🔲 **pages/submission-preparation.tsx** - Medium priority (if exists)
6. 🔲 **Report Authoring** - Low priority (future feature)
7. 🔲 **Report Review** - Low priority (future feature)
8. 🔲 **Report Approval** - Low priority (future feature)

---

## 16. SUMMARY

**What:** Horizontal breadcrumb showing current workflow stage  
**Where:** Top of main content area, below global header, above page header  
**Why:** Provides consistent context på alla sidor om var i protocol lifecycle användaren befinner sig  
**How:** Import component, add state för audit log, place before page header, connect onAuditLogClick

**Key Principle:** 
> WorkflowProgressIndicator ska vara första elementet användaren ser när de kommer till en workflow-sida, vilket etablerar context innan page-specific content visas.

---

**Last Updated:** 2026-02-21  
**Status:** Active implementation guide  
**Maintained by:** Clinical Investigation Platform Team  
**Related Docs:**
- `/LAYOUT-OCH-FUNKTIONALITET-FORKLARING.md`
- `/COMPLETENESS-STATUS-VISUAL-SPEC.md`
- `/ISSUE-CARD-VISUAL-SPEC.md`
