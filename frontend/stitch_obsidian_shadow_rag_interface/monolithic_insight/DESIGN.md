---
name: Monolithic Insight
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#c5c6ca'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#8f9194'
  outline-variant: '#45474a'
  surface-tint: '#c6c6c9'
  primary: '#ffffff'
  on-primary: '#2f3033'
  primary-container: '#e2e2e5'
  on-primary-container: '#636467'
  inverse-primary: '#5d5e61'
  secondary: '#c6c5cf'
  on-secondary: '#2f3038'
  secondary-container: '#4a4b53'
  on-secondary-container: '#bcbbc5'
  tertiary: '#ffffff'
  on-tertiary: '#352f2b'
  tertiary-container: '#ebe0da'
  on-tertiary-container: '#6a635e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e5'
  primary-fixed-dim: '#c6c6c9'
  on-primary-fixed: '#1a1c1e'
  on-primary-fixed-variant: '#454749'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#c6c5cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#ebe0da'
  tertiary-fixed-dim: '#cfc4bf'
  on-tertiary-fixed: '#201b17'
  on-tertiary-fixed-variant: '#4c4541'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  code-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 800px
  sidebar-width: 260px
  gutter: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The design system is centered on the concept of **Deep Focus**. It is built for researchers and knowledge workers who treat their Obsidian vaults as a digital extension of their minds. The aesthetic is ultra-minimalist and professional, utilizing high-contrast typography and a monochromatic palette to reduce cognitive load.

Visual principles:
- **Atmospheric Depth:** Using "black-on-black" layering to create a sense of vast digital space.
- **Precision:** Razor-sharp alignment and purposeful whitespace that mirrors the organization of a well-maintained vault.
- **Subtle Motion:** Employing rotating shadow effects to indicate "thinking" or "searching" states without breaking the user's concentration.

## Colors

The color palette is strictly monochromatic, drawing from the Zinc scale to provide warmth within a dark environment.

- **Background (Zinc-950):** The primary canvas, providing a void-like depth that makes content pop.
- **Primary (Zinc-200):** Used for the main interactive elements and primary text to ensure maximum readability.
- **Surface (Zinc-900):** Used for sidebar and input containers to create subtle separation from the background.
- **Muted (Zinc-500):** Reserved for metadata, timestamps, and secondary labels to maintain hierarchy.

## Typography

This design system utilizes a trio of sans-serif and monospaced fonts to balance editorial elegance with technical precision. 

- **Geist** is used for headings to provide a modern, geometric feel that feels engineered.
- **Inter** handles the bulk of the chat interface, chosen for its exceptional legibility in dark mode and high x-height.
- **JetBrains Mono** is utilized for "RAG" specific metadata, such as file paths from the Obsidian vault or source citations, distinguishing automated data from conversational text.

## Layout & Spacing

The layout follows a "Focused Center" philosophy. 

- **Sidebar:** A fixed 260px left sidebar (Zinc-950) contains the vault hierarchy and history. It uses a minimal border-right (Zinc-800).
- **Main Chat:** A fluid container that caps at 800px width to maintain optimal line lengths for reading long-form AI responses.
- **Rhythm:** An 8px linear scale is used for all padding and margins. Vertical rhythm in the chat is generous (32px between message pairs) to allow the "depth" effects room to breathe.

## Elevation & Depth

Elevation is conveyed through "Tonal Stacking" and advanced shadow techniques rather than traditional light-source shadows.

- **Base Layer:** Zinc-950 (The Vault).
- **Surface Layer:** Zinc-900 (Input bars, Sidebar).
- **The "Insight" Effect:** A custom rotating black shadow is applied to the primary input field during active processing. This is achieved via a conic-gradient border-image or a pseudo-element behind the input that rotates, creating a "pulsing depth" effect that suggests the AI is searching through the vault.
- **Overlays:** Modals and tooltips use a Zinc-800 background with a subtle 1px Zinc-700 border to ensure they remain distinct from the deep background.

## Shapes

The design system uses "Rounded" corners (8px) to soften the professional aesthetic and make the interface feel approachable.

- **Inputs & Cards:** Use a standard 8px (rounded-md) radius.
- **Action Buttons:** Small utility buttons use a 6px radius to appear more precise.
- **Pills:** Citation tags and "Source" chips use a full pill radius to differentiate them from actionable interface buttons.

## Components

### Primary Input
The center-piece of the interface. A wide, Zinc-900 container with a subtle 1px border. When active, it triggers the **Rotating Shadow** (a slow 360-degree rotation of a #000 shadow with a large spread) to signify focus.

### Message Bubbles
Messages do not use traditional "bubbles." Instead:
- **User Messages:** Right-aligned, plain text with a subtle Zinc-800 marker.
- **AI Responses:** Left-aligned, no background, using Zinc-200 text color.
- **Citations:** Inline monospaced chips that, when hovered, reveal a preview of the Obsidian note.

### Obsidian Source Chips
Small, high-contrast badges (Zinc-200 background, Zinc-950 text) used to indicate which specific files from the vault were retrieved to generate the answer.

### Sidebar Items
Navigation items are text-only. Hover states use a Zinc-900 background with a 2px vertical "active" bar on the far left.

### Action Buttons
Minimalist icons (20px) with no background until hover. Use `zinc-400` as the default state, shifting to `zinc-100` on interaction.