# Workflow Sidebar - Detaljerad Design Specifikation

## 📐 Layout & Struktur

### Container
- **Bredd:** 320px (w-80)
- **Höjd:** 100vh (full skärmhöjd)
- **Bakgrund:** Vit (#FFFFFF)
- **Höger border:** 1px solid #E5E7EB (border-slate-200)
- **Display:** Flexbox column
- **Position:** Fast vänster kant av skärmen

---

## 🎨 Innehåll

### 1. Header Section
**Position:** Överst i sidebar, inuti nav-elementet  
**Padding:** 16px (p-4)

#### "Workflow Steps" Titel
- **Text:** "Workflow Steps"
- **Font size:** 14px (text-sm)
- **Font weight:** 600 (font-semibold)
- **Färg:** #111827 (text-slate-900)
- **Margin bottom:** 16px (mb-4)
- **Padding horizontal:** 12px (px-3)

---

### 2. Category Header
**Position:** Under "Workflow Steps" titel  
**Padding:** 12px horizontal (px-3)  
**Margin bottom:** 8px (mb-2)

#### "PROJECT SETUP" Label
- **Text:** "Project setup" (visas i uppercase via CSS)
- **Font size:** 12px (text-xs)
- **Font weight:** 600 (font-semibold)
- **Färg:** #64748B (text-slate-500)
- **Text transform:** UPPERCASE
- **Letter spacing:** 0.05em (tracking-wider)

---

### 3. Workflow Step Items
**Container:** Vertical stack med 4px gap (space-y-1)

Varje step är en DIV med följande struktur:

#### Step Container
- **Display:** Flex, items-start
- **Gap:** 12px mellan ikon och text (gap-3)
- **Padding:** 12px (p-3)
- **Border radius:** 8px (rounded-lg)
- **Transition:** colors

#### States och visuell feedback:

**ACTIVE State (nuvarande steg - "Project setup"):**
- **Background:** #EFF6FF (bg-blue-50)
- **Border:** 1px solid #BFDBFE (border-blue-200)
- **Ikon:** Blå cirkel med vit siffra "1"
  - Cirkel: w-4 h-4, bg-blue-600, rund
  - Siffra: text-white, text-xs, font-medium
- **Text färg:** #1E3A8A (text-blue-900)
- **Text weight:** 500 (font-medium)

**LOCKED State (framtida steg - alla efter "Project setup"):**
- **Background:** Ingen specifik bakgrund
- **Border:** Transparent
- **Opacity:** 60% (opacity-60) - gör hela elementet nedtonat
- **Ikon:** Lock-ikon (Lucide Lock)
  - Storlek: w-4 h-4
  - Färg: #94A3B8 (text-slate-400)
- **Text färg:** #334155 (text-slate-700)
- **Text weight:** Normal

**COMPLETED State (ej implementerat än, för framtida completed steps):**
- **Background:** Ingen specifik bakgrund
- **Border:** Transparent
- **Ikon:** CheckCircle2 från Lucide
  - Storlek: w-4 h-4
  - Färg: #16A34A (text-green-600)
- **Text färg:** #334155 (text-slate-700)
- **Text weight:** Normal

#### Step Text
- **Font size:** 14px (text-sm)
- **Flex:** 1 med min-width: 0 för text truncation
- **Line height:** Default

---

### 4. Step List (Exakt ordning)
1. **Project setup** ← ACTIVE
2. **Protocol authoring** ← LOCKED
3. **Protocol review** ← LOCKED
4. **Protocol approval** ← LOCKED
5. **Report authoring** ← LOCKED
6. **Report review** ← LOCKED
7. **Report approval** ← LOCKED

---

## 5. Footer Section (System Information)
**Position:** Botten av sidebar  
**Border top:** 1px solid #E5E7EB (border-slate-200)  
**Background:** #F8FAFC (bg-slate-50)  
**Padding:** 16px (p-4)

#### Content
- **Titel:** "System Information"
  - Font size: 12px (text-xs)
  - Color: #475569 (text-slate-600)
  - Font weight: 500 (font-medium)
  - Margin bottom: 4px (mb-1)

- **Version:** "Version 2.4.1"
  - Font size: 12px (text-xs)
  - Color: #475569 (text-slate-600)

- **Last Updated:** "Last updated: Jan 24, 2026"
  - Font size: 12px (text-xs)
  - Color: #475569 (text-slate-600)

---

## 🎯 Interaktionsdesign

### Hover States
- **Ej implementerat för locked items** - de är inte klickbara än
- **Active item** - ingen hover effect (redan selected)

### Click Behavior
- **Active step** - ingen action (redan på denna sida)
- **Locked steps** - ingen action (steps är locked tills Project setup är completed)

---

## 📦 Data Structure

```typescript
const workflowSteps = [
  { name: 'Project setup', active: true, locked: false },
  { name: 'Protocol authoring', active: false, locked: true },
  { name: 'Protocol review', active: false, locked: true },
  { name: 'Protocol approval', active: false, locked: true },
  { name: 'Report authoring', active: false, locked: true },
  { name: 'Report review', active: false, locked: true },
  { name: 'Report approval', active: false, locked: true },
];
```

---

## 🎨 Färgpalett (Sammanfattning)

| Element | Färg | Hex |
|---------|------|-----|
| Sidebar background | Vit | #FFFFFF |
| Border | Slate-200 | #E5E7EB |
| Active step background | Blue-50 | #EFF6FF |
| Active step border | Blue-200 | #BFDBFE |
| Active step text | Blue-900 | #1E3A8A |
| Active step icon bg | Blue-600 | #2563EB |
| Lock icon | Slate-400 | #94A3B8 |
| Completed icon | Green-600 | #16A34A |
| Category label | Slate-500 | #64748B |
| Footer background | Slate-50 | #F8FAFC |
| Footer text | Slate-600 | #475569 |

---

## 📱 Responsive Behavior
- **Desktop:** Fast width 320px, full height
- **Tablet/Mobile:** Ej specificerat än - sidebar kan kollapsa eller bli drawer

---

## ♿ Accessibility
- **Semantic HTML:** `<aside>`, `<nav>` används korrekt
- **Keyboard navigation:** Ej implementerat än
- **Screen readers:** Kan förbättras med aria-labels för locked state
- **Focus states:** Behöver adderas för keyboard navigation

---

## 🔮 Framtida Förbättringar
1. **Hover tooltip** på locked items som förklarar varför de är låsta
2. **Progress bar** mellan steg
3. **Estimated time** för varje steg
4. **Keyboard navigation** mellan steg
5. **Collapse/expand** funktionalitet för sidebar
6. **Mini-sidebar mode** med bara ikoner
