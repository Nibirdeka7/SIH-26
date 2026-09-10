---
name: Clinical Precision Interface
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3e4948'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7978'
  outline-variant: '#bdc9c7'
  surface-tint: '#006a65'
  primary: '#005a56'
  on-primary: '#ffffff'
  primary-container: '#0d746f'
  on-primary-container: '#a2f7f0'
  inverse-primary: '#80d5cf'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#a4000e'
  on-tertiary: '#ffffff'
  tertiary-container: '#cd181d'
  on-tertiary-container: '#ffe1dd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9df1eb'
  primary-fixed-dim: '#80d5cf'
  on-primary-fixed: '#00201e'
  on-primary-fixed-variant: '#00504c'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  data-metric:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: -0.01em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
  code-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  pane-gutter: 0.75rem
  table-cell-y: 0.5rem
  table-cell-x: 0.75rem
---

## Brand & Style
The design system establishes a clinical-grade digital environment engineered explicitly for fast-paced outpatient departments (OPD), critical care triage, and national digital health ecosystems (ABHA / ABDM). The user experience prioritizes cognitive ease, high-contrast information scent, and zero-latency visual parsing—empowering clinicians to complete comprehensive pre-consultation patient syntheses within 30 seconds.

The aesthetic blends **Corporate/Modern** precision with **Data-Dense Functionalism**:
- **Trustworthy & Authoritative:** Cool clinical teals replace generic tech blues, evoking institutional reliability, antiseptic hygiene, and calm decision-making.
- **Urgent Visual Scent:** Critical flags (abnormal vitals, drug-drug interactions, emergency triage statuses) possess uncompromised visual priority over baseline documentation.
- **Ergonomic Density:** Maximizes screen real estate on hospital desktop monitors (1080p to 1440p) while avoiding visual clutter through crisp baseline alignment, rigid borders, and deliberate typographic rhythm.
- **Standards-Compliant Identity:** Designed natively for FHIR JSON interoperability, ABHA identity tokens, and standard clinical classification frameworks (ICD-10, SNOMED CT, LOINC).

## Colors
The color architecture relies on high-contrast semantic discipline. Medical UI cannot afford ambiguous color coding; every hue correlates directly with clinical urgency or transactional workflow states.

### Primary Spectrum (Clinical Governance)
- **Deep Clinical Teal (`#0D746F`):** Primary action buttons, active navigation states, verified patient identification badges.
- **Teal Shade (`#09534F`):** Hover and pressed states for primary triggers; active tab borders.
- **Slate Cyan Accent (`#14B8A6`):** Focused element rings, active workflow progression bars, ABDM consent active triggers.
- **Teal Substrate (`#F0FDFA`):** Selected patient table rows, primary panel container fills.

### Urgency & Status Matrix
- **Critical Red Flag (`#DC2626`):** Triage category 1/red-alert, severe allergic reactions, critical lab values exceeding panic thresholds.
- **Critical Alert Wash (`#FEF2F2`):** Background fill for critical banners and panic-tier vitals; paired with border `#FCA5A5` and dark text `#7F1D1D`.
- **Abnormal / Caution Amber (`#D97706`):** Borderline vitals, pending diagnostic investigations, non-critical drug interactions.
- **Amber Warning Wash (`#FFFBEB`):** Lab alert background; paired with border `#FCD34D` and dark text `#78350F`.
- **Verified / Stable Emerald (`#059669`):** Vitals within normal reference ranges, synchronized ABDM records, fulfilled e-prescriptions.
- **Stable Emerald Wash (`#ECFDF5`):** Positive status badge fills; paired with text `#065F46`.

### Neutral & Surface Hierarchy
- **Canvas Base (`#F8FAFC`):** Low-glare cool hospital slate canvas for extended 12-hour screen shifts.
- **Card / Surface (`#FFFFFF`):** High-clarity foreground surface for patient records, charts, and input forms.
- **Borders & Dividers (`#E2E8F0`):** Hairline separation for clinical tables, split panes, and modular cards.
- **Typography Matrix:** `#0F172A` (Primary titles, biometric values, active diagnostics), `#334155` (Labels, metadata, secondary body), `#64748B` (Inactive states, unit measurements, timestamps), `#94A3B8` (Disabled input states, placeholder text).

## Typography
Typographic clarity directly impacts diagnosis speed and clinical safety. The pairing of **Inter** and **JetBrains Mono** guarantees error-free scan paths:

- **Inter with Tabular Figures (`font-variant-numeric: tabular-nums`):** Mandatory for all numeric lab data, blood pressures, oxygen saturations, and pulse measurements to align numbers across multi-row data tables and prevent scanning misalignment.
- **JetBrains Mono for Identifiers:** Assigned to ABHA IDs (`91-XXXX-XXXX-XXXX`), FHIR Resource UUIDs, batch numbers, NDC codes, and timestamps. Monospace sizing ensures identical width across variable hashes, preventing accidental character truncation.
- **Strict Scale Constraints:** Line-height is kept compact (1.2 to 1.4) across body text to support clinical data density without sacrificing horizontal tracking.

## Layout & Spacing
The layout model employs an **asymmetric multi-pane workspace** configured for standard clinical diagnostic monitors (1440px to 1920px width) with fluid vertical adaptation:

### Structural Breakpoints
- **Desktop Primary (`≥1440px`):** Three-column split clinical workspace:
  1. *Left Pane (280px fixed):* Real-time triage patient queue with dynamic priority sorting.
  2. *Center Primary Pane (Flexible, min 680px):* Split tabs for SOCRATES pain framework, historical encounters, longitudinal lab timelines, and FHIR resource inspection.
  3. *Right Pane (380px fixed):* Immediate prescription composer, clinical note drafting, diagnostic ordering, and ABDM consent artifact validation.
- **Sub-Desktop / Tablet (`1024px - 1439px`):** Right clinical pane collapses into an off-canvas slide-out sheet or bottom dock; left queue collapses to an icon-and-severity strip (64px width).
- **Mobile (`<1024px`):** Strict single-column stack reserved for emergency on-call review; tabbed bottom-bar navigation switches between Queue, Vitals, and Rx Pad.

### Spacing Principles
All internal element layout follows a strict 4px sub-grid (built on 8px base units). Tables, summary lists, and metric ribbons use dense vertical padding (`space-sm` = 8px) to guarantee that patient vitals, active medications, and top 3 chief complaints appear above the physical screen fold without scrolling.

## Elevation & Depth
In a safety-critical clinical interface, ambient shadows and faux 3D depths introduce visual fatigue and reduce contrast. Visual hierarchy is achieved predominantly through **Low-Contrast Structural Outlines** and **Surface Tonal Layering**:

- **Level 0 (App Canvas):** `#F8FAFC` base surface background.
- **Level 1 (Clinical Panes & Cards):** `#FFFFFF` surfaces bounded by crisp, 1px solid `#E2E8F0` borders. Zero box-shadow.
- **Level 2 (Active Focus & Flyouts):** Used solely for quick-order auto-completes, diagnostic reference popovers, and drug interaction alerts:
  - `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04);`
  - Border: 1px solid `#CBD5E1`.
- **Level 3 (Emergency Modal Overlays):** Used exclusively for system-wide critical triage overrides and unverified drug contraindication alerts:
  - `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1);`
  - Backdrop: `#0F172A` at 60% opacity with 2px backdrop blur.

## Shapes
The design system operates with **Soft (`1`)** roundedness. Precision instruments avoid circular forms in clinical data presentation to maximize data grid alignment and text boundaries.

- **Base Components (`rounded-sm` / `0.25rem`):** Buttons, input fields, queue row items, diagnostic pills, table cell highlights.
- **Container Panes (`rounded-md` / `0.375rem`):** Patient header banner, diagnostic timeline cards, FHIR payload viewers.
- **System Badges & Chips (`rounded-sm` / `0.125rem` to `0.25rem`):** Metric status badges, ICD-10 tags, and ABHA confirmation chips. Fully circular ("pill") treatments are strictly restricted to unread count indicators.

## Components

### Buttons
- **Primary Clinical Action:** Solid `#0D746F` background, `#FFFFFF` text, 32px height for dense layouts, 40px for primary form triggers. Focus ring: 2px solid `#14B8A6` with 2px offset.
- **Destructive / Flag Action:** Solid `#DC2626` background, `#FFFFFF` text. Used only for "Mark Emergency Code Red" or "Revoke ABDM Consent".
- **Secondary / Ghost Outline:** White background, 1px solid `#CBD5E1` border, `#334155` text; hover state transitions to `#F1F5F9`.

### Chips & Semantic Badges
- **Triage Priority Tag:** 20px height, uppercase `label-sm`. Red Flag uses `#FEF2F2` fill, `#DC2626` text, `#FCA5A5` 1px border.
- **Lab Value Indicators:** 
  - *High/Low Panic:* Red fill with bold arrow indicator (`▲ High 188 mg/dL`).
  - *Abnormal:* Amber fill (`▲ 142 mg/dL`).
  - *Normal Reference:* Slate fill `#F1F5F9`, `#475569` text.
- **ABHA Verification Chip:** `#ECFDF5` background, `#059669` text, JetBrains Mono font containing the ABHA identifier prefixed with a shield icon.

### Patient Queue Table
- High-density layout using fixed 40px row height.
- Alternating subtle hover states (`#F0FDFA`).
- Left-edge 4px colored border stripe indicating Emergency / Triage category (Red, Yellow, Green).
- Numeric vitals display using tabular figures with LOINC code tooltips on hover.

### Form Inputs & Prescription Composer
- **Input Fields:** 32px height, `#FFFFFF` background, 1px solid `#CBD5E1` border, `#0F172A` text.
- **Inline Error / Contraindication:** Input border changes to `#DC2626` with immediate inline alert wash and drug-interaction warning panel directly below the input field.
- **Dosage Stepper Input:** Monospace value input flanked by +/- tight step buttons for fast tactile quantity alteration without keyboard entry.

### Clinical Split Panes & Tabs
- **SOCRATES Framework Tabs:** Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/Relieving factors, Severity. Underlined tab design with active state highlighted by 2px `#0D746F` bottom border and semi-bold text.
- **FHIR Resource Bundle Card:** Nested card component with `#F8FAFC` background, monospace header bar showing resource type (`Observation`, `MedicationRequest`, `Condition`), and expandable JSON payload inspector.

### Emergency Alert Ribbon
- Full-bleed or pane-width top banner with `#FEF2F2` background, 2px solid `#DC2626` left accent bar, high-contrast `#7F1D1D` text, displaying immediate clinical red flags (e.g., "Penicillin Anaphylaxis Alert", "Critical SpO2 < 88%").