---
name: AyurCare Clinical Design System
colors:
  surface: '#f8fafb'
  surface-dim: '#d8dadb'
  surface-bright: '#f8fafb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f5'
  surface-container: '#eceeef'
  surface-container-high: '#e6e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#40484c'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#eff1f2'
  outline: '#70787d'
  outline-variant: '#bfc8cd'
  surface-tint: '#1e667f'
  primary: '#004357'
  on-primary: '#ffffff'
  primary-container: '#0d5c75'
  on-primary-container: '#93d3ef'
  inverse-primary: '#90cfec'
  secondary: '#006a60'
  on-secondary: '#ffffff'
  secondary-container: '#8cf5e4'
  on-secondary-container: '#007166'
  tertiary: '#761d06'
  on-tertiary: '#ffffff'
  tertiary-container: '#96341b'
  on-tertiary-container: '#ffb9a8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bde9ff'
  primary-fixed-dim: '#90cfec'
  on-primary-fixed: '#001f2a'
  on-primary-fixed-variant: '#004d64'
  secondary-fixed: '#8cf5e4'
  secondary-fixed-dim: '#6fd8c8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a2'
  on-tertiary-fixed: '#3c0700'
  on-tertiary-fixed-variant: '#83260e'
  background: '#f8fafb'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  bilingual-label-primary:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  bilingual-label-secondary:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  button-text:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  audio-caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-min: 48px
  touch-audio: 56px
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  gutter-xl: 32px
  screen-edge-mobile: 16px
  screen-edge-tablet: 24px
  card-padding-compact: 12px
  card-padding-default: 16px
  card-padding-relaxed: 20px
---

## Brand & Style

The design system establishes an atmosphere of clinical authority, deep human empathy, and accessible simplicity for modern Indian digital healthcare. Balancing modern AI-assisted diagnostic guidance with Ayurvedic holistic wellness, the UI communicates reliability, calm reassurance, and clarity under stress.

### Design Movement & Core Philosophy
The visual direction blends **Modern Clinical Functionalism** with **Accessible Organic Warmth**:
- **Clarity over ornament:** Absolute priority on legibility, multi-lingual bilingual labels (English paired with regional Indic scripts like Devanagari), and explicit visual confirmations.
- **Audio-first integration:** Ambient listening states, voice-guided symptom logging, and audible playbacks are natively woven into fundamental touch targets.
- **Dignified simplicity:** Generous spacing, soft clinical teal hues, soothing mint layers, and gentle tactile elevations eliminate medical anxiety without sacrificing institutional credibility.
- **Ergonomics & Inclusivity:** Adheres to WCAG 2.2 AAA standards for high contrast, strict minimum 48px hit areas, and distinct, unmistakable status cues for users across varying digital literacy levels.

## Colors

The color architecture is built around clinical precision and calming therapeutic tones, optimized for high visibility across low-cost mobile displays under bright outdoor light or low-light bedside conditions.

### Palette Architecture
- **Primary Clinical Teal (`#0D5C75`)**: The core brand and interactive color. Conveys deep medical trust, institutional stability, and grounding authority. Used for primary CTAs, active tab bars, critical header bars, and verified practitioner badges.
- **Secondary Mint Sage (`#2A9D8F`) & Soft Mint Wash (`#E6F4F1`)**: Symbolizes Ayurvedic balance, healing, vitality, and successful diagnostic states. Used for wellness metrics, primary toggles, health tags, and safe-range indicators.
- **Tertiary Amber Coral (`#E76F51`)**: Purpose-driven alert hue. Reserved for warnings, vitals out of normal bounds, appointment reminders, and immediate triage triggers.
- **Neutral & Surface Ecosystem**:
  - **Hospital Pure White (`#FFFFFF`)**: Card surfaces, modals, sheets, and focused input backgrounds.
  - **Clinical Slate Canvas (`#F8FAFB`)**: The base background layer, soft on the eyes during prolonged clinical reviews.
  - **Subtle Surface Container (`#F1F5F9`)**: Neutral section dividers, inactive button backings, and segmented control containers.
  - **Structural Outline (`#D9E2E8`)**: Crisp, subtle hairline borders providing structural edge distinction on white-on-slate surfaces.
  - **Text High-Contrast Primary (`#0F172A`)**: Near-black slate for maximum AAA body legibility.
  - **Text Secondary (`#475569`)**: Supportive context, bilingual subtitles, timestamps, and placeholder copy.

## Typography

Typography prioritizes extreme clarity, cross-lingual character heights, and structural stability. Paired with Noto Sans Devanagari at runtime, **Inter** provides neutral glyph proportions and tall x-heights that match Indic conjuncts without layout shifts, while **Plus Jakarta Sans** injects human warmth and approachability into headings.

### Bilingual Hierarchy System
The design system enforces a stacked bilingual layout standard:
- Primary line (`bilingual-label-primary`): Primary operative language (English or primary Indic script) in semibold weight.
- Subordinate line (`bilingual-label-secondary`): Mirror language context (e.g., Hindi, Tamil, Bengali) set at 80% scale in `#475569`, maintaining consistent line-height to eliminate clipping on mobile displays.
- Audio transcriptions and accessibility readouts employ `audio-caption` in all-caps tracking to denote live-assistant status.

## Layout & Spacing

A disciplined 8pt grid with 4pt baseline subdivision governs all spatial decisions, tailored specifically for single-thumb ergonomics on Android and iOS devices.

### Grid & Responsiveness
- **Mobile Grid (under 600px)**: 4-column fluid layout with `16px` outer gutters and `12px` column gaps. Critical navigation and action centers sit inside the lower 40% thumb zone.
- **Tablet Grid (600px - 1024px)**: 8-column fluid layout with `24px` outer margins, allowing split-pane consultation views (doctor's notes on left, patient vitals & AI synthesis on right).
- **Desktop/Clinical Web (1024px+)**: 12-column max-width container capped at `1200px` with `32px` margins.

### Touch Target Mandate
Every interactive primitive—including icons, stepper controls, checkboxes, and audio triggers—must strictly encompass at least **48×48px** of interactive real estate, regardless of visual glyph size. Standalone floating voice buttons step up to **56×56px** to support patients with motor challenges or tremors.

## Elevation & Depth

This design system rejects heavy, dark, dramatic drops in favor of **clinical tonal layering** and **low-contrast ambient teal-slate shadows**. Depth conveys state priority and interactive affordance without visual noise.

### Layer Tiers
- **Surface Level 0 (Base Canvas)**: `#F8FAFB`. Flat base layer for root view controllers and scroll regions.
- **Surface Level 1 (Default Cards & Tiles)**: `#FFFFFF` encased in a `1px` crisp border (`#D9E2E8`). Zero blur shadow in default state; depth is defined by edge crispness against the slate canvas.
- **Surface Level 2 (Elevated & Active Cards)**: `#FFFFFF` with `0px 4px 16px rgba(13, 92, 117, 0.06)`, bordered by `#CBD5E1`. Used for active medication cards, consultation alerts, and pending diagnostic tests.
- **Surface Level 3 (Floating Voice Mic & Sticky Bars)**: `#FFFFFF` or `#0D5C75` with `0px 8px 24px rgba(13, 92, 117, 0.14)`. Creates clear spatial separation for emergency SOS triggers and bottom sheet sheets.
- **Surface Level 4 (Clinical Dialogs & Modals)**: Centered cards with `0px 16px 40px rgba(15, 23, 42, 0.18)` against a `rgba(15, 23, 42, 0.45)` backdrop blur (`4px`).

## Shapes

The shape system expresses clinical precision softened by holistic warmth. Geometry is uniformly rounded without veering into toy-like circles.

### Geometry Specifications
- **Cards and Containers**: Standardized at a consistent **16px border-radius** (`rounded-lg` under token level 2). This radius gives health records, AI diagnostics, and doctor profiles an organic, approachable feel.
- **Input Fields & Dropdowns**: **12px border-radius** for natural resting focus.
- **Buttons & Chips**: **12px** for standard buttons; fully pill-shaped (**9999px**) for triage status badges, filter chips, and floating audio-listening indicator capsules.
- **Corner Balance**: Inner nested elements must scale down proportionally (e.g., inside a 16px card with 16px padding, internal status badges use 8px to 10px curves) to avoid optical dissonance.

## Components

### Buttons
- **Primary CTA**: Deep Clinical Teal (`#0D5C75`) background with crisp white typography. Height: 52px (desktop/tablet: 48px). Fully centered bilingual label hierarchy. Disabled state: `#E2E8F0` with `#94A3B8` text.
- **Secondary Healing CTA**: Mint Wash (`#E6F4F1`) fill with `#0D5C75` border (`1.5px`) and `#0D5C75` text.
- **Audio Voice Action Button**: Prominent circular (56px) button with `#0D5C75` base, pulsating ripple rings in `#E6F4F1` during active speech capture, accompanied by a dynamic waveform icon.

### Bilingual Cards
- Built on `#FFFFFF` with `16px` corner radiuses and a `1px` outline of `#D9E2E8`.
- Contains a mandatory top metadata header: clinical category tag (e.g., "Ayurvedic Dosha Analysis / वात-पित्त विश्लेषण") on the left and an audio playback speaker button (`48×48px` touch target) on the right for automatic voice read-out.
- High-contrast value blocks: Metrics (like blood sugar or pulse) rendered in bold 24px text accompanied by color-coded indicator pills (Mint Sage for normal, Amber Coral for attention).

### Input Fields & Steppers
- Height: 54px. Clean `#FFFFFF` fill with `1.5px` border in `#CBD5E1`. On focus: changes to `#0D5C75` with a subtle 3px glow ring in `rgba(13, 92, 117, 0.12)`.
- Inputs support dual-input methods: typed text accompanied by an inline microphone glyph (`#0D5C75`, 48px target) on the trailing edge for instant vernacular speech-to-text input.

### Checkboxes & Radio Selectors
- Touch target: Strict 48px outer bounding box; visual box size: 24×24px with a 6px border radius.
- Active state: Filled with `#0D5C75` showcasing a 2px white checkmark icon. High visual contrast border (`#94A3B8` when unselected, never faint gray) guarantees AAA readability.

### Audio-First Assistive Bar
- Docked sticky bottom bar or floating pill featuring real-time AI transcription: shows an ambient equalizer animation, active language indicator chip (e.g., "Hindi / हिंदी"), and a single tap "Tap to Speak / बोलने के लिए छुएं" action.

### Status Chips & Pills
- Pill-shaped (9999px radius). Height: 32px; padding: 6px 14px.
- Normal/Stable: Background `#E6F4F1`, text `#2A9D8F`, border `#BCE3DC`.
- Alert/Action Required: Background `#FDF0ED`, text `#E76F51`, border `#F7C7BD`.
- Informational/Dosha: Background `#F1F5F9`, text `#0D5C75`, border `#CBD5E1`.