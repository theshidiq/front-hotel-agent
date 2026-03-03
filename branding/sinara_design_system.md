# Sinara Design System
*Reference document for UI agents, developers, and designers*
*Version 1.0 — 2026*

---

## Overview

Sinara is a **hospitality operations platform** (scheduling, allergen management, guest experience). It is a productivity and corporate SaaS tool — every design decision must prioritize clarity, speed of comprehension, and professional trust.

The brand is warm and human, but the **app interface is clean and functional first**. These are two separate design layers sharing the same palette.

---

## Two-Layer Design Model

This is the most important concept in the Sinara design system.

```
MARKETING LAYER          PRODUCT LAYER
─────────────────        ─────────────────────────
Landing page             Dashboard
Brand materials          Scheduling view
Campaigns                Allergen manager
Social assets            Menu builder
                         Settings

Tone: Editorial          Tone: Functional
Feel: Warm, premium      Feel: Clear, efficient
Bg:   Cream #F5F1EC      Bg:   White #FFFFFF
Font: Gloock + Inst.     Font: Instrument Sans + IBM Plex
```

**Rule:** Never use Cream as a background inside the app. Never use Gloock as a heading font inside the app. These belong to marketing only.

---

## Brand Identity

| | |
|---|---|
| **Product name** | Sinara |
| **Sub-brand** | Stella (AI connector — operator-facing and guest-facing) |
| **Tagline** | presence, by design |
| **Positioning** | Premium hospitality operations SaaS |
| **Target users** | Hotel/restaurant operators, kitchen managers, front-of-house staff |

---

## Color System

### Core Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Navy | `#1A2744` | 26, 39, 68 | Primary brand color. Sidebar, headings, primary text, CTA fill |
| Gold | `#B8956A` | 184, 149, 106 | Accent. Interactive elements, active states, highlights, progress |
| Cream | `#F5F1EC` | 245, 241, 236 | **Marketing only.** Never use inside the app as background |
| Stone | `#C8C0B4` | 200, 192, 180 | Borders (marketing), subtle tags, muted decorative elements |

### App UI Palette (Product Layer)

| Token | Hex | Role |
|-------|-----|------|
| `--bg-canvas` | `#FFFFFF` | Page/app background |
| `--bg-surface` | `#F8F9FA` | Cards, panels, table rows |
| `--bg-sidebar` | `#1A2744` | Left navigation sidebar |
| `--bg-sidebar-hover` | `#243561` | Sidebar nav item hover |
| `--bg-sidebar-active` | `#2D4275` | Sidebar nav item active |
| `--border-default` | `#E8E8E8` | Card borders, dividers, input borders |
| `--border-strong` | `#D1D1D1` | Emphasized borders, table borders |
| `--text-primary` | `#1A2744` | Main body text, headings inside app |
| `--text-secondary` | `#6B7280` | Labels, metadata, placeholder, captions |
| `--text-disabled` | `#B0B0B0` | Disabled states |
| `--text-on-dark` | `#FFFFFF` | Text on Navy sidebar and dark surfaces |
| `--text-on-dark-muted` | `#A8B8D8` | Secondary text on Navy sidebar |
| `--accent-default` | `#B8956A` | Buttons, active indicators, progress fill, links |
| `--accent-hover` | `#A07D55` | Accent hover state (darkened ~10%) |
| `--accent-light` | `#F5EDE3` | Accent background tint (badge bg, alert bg) |
| `--status-success` | `#16A34A` | Success states |
| `--status-warning` | `#D97706` | Warning / allergen alert |
| `--status-error` | `#DC2626` | Error states |
| `--status-info` | `#2563EB` | Info states |

### Stella Sub-brand (when rendering Stella UI elements)

| Name | Hex | Role |
|------|-----|------|
| Stella Indigo | `#2D2648` | Stella primary — chat bubble bg, header |
| Stella Amber | `#D2A362` | Stella accent — lighter than Gold |
| Stella Lavender | `#8C7DA5` | Stella secondary — soft UI elements |

---

## Typography

### Font Stack

| Font | Weight(s) | Role | Where used |
|------|-----------|------|------------|
| **Gloock** | Regular, Italic | Display serif | Marketing only — hero headings, poster, landing page |
| **Instrument Sans** | 400, 500, 600, 700 | Primary UI sans-serif | All app headings, nav labels, buttons, body |
| **IBM Plex Sans** | 400, 500, 600 | Body / form labels | Form labels, body copy in app, descriptions |
| **IBM Plex Mono** | 400, 500 | Data / code | Times, IDs, codes, numeric data, monospace values |

### App Typography Scale

```
Display (app page title)
  Font:   Instrument Sans 600
  Size:   24px / line-height: 32px
  Color:  --text-primary (#1A2744)

Heading 1 (section title)
  Font:   Instrument Sans 600
  Size:   20px / line-height: 28px
  Color:  --text-primary

Heading 2 (card title, panel header)
  Font:   Instrument Sans 600
  Size:   16px / line-height: 24px
  Color:  --text-primary

Body (default text)
  Font:   IBM Plex Sans 400
  Size:   14px / line-height: 20px
  Color:  --text-primary

Body Small (labels, captions, metadata)
  Font:   IBM Plex Sans 400
  Size:   12px / line-height: 16px
  Color:  --text-secondary

Data / Numeric
  Font:   IBM Plex Mono 400
  Size:   13px / line-height: 20px
  Color:  --text-primary

Button
  Font:   Instrument Sans 600
  Size:   14px / line-height: 20px
  Case:   Sentence case (not ALL CAPS)

Label / Input
  Font:   IBM Plex Sans 500
  Size:   13px / line-height: 16px
  Color:  --text-primary
```

### Marketing Typography Scale

```
Hero Heading
  Font:   Gloock Regular
  Size:   64–80px
  Color:  #1A2744

Hero Accent (italic line)
  Font:   Gloock Italic
  Size:   64–80px
  Color:  #B8956A (Gold)

Subheading / Section Label
  Font:   Instrument Sans 600
  Size:   11px / letter-spacing: 0.1em
  Case:   ALL CAPS
  Color:  #B8956A

Body
  Font:   Instrument Sans 400
  Size:   16–18px
  Color:  #1A2744
```

---

## App Layout

### Sidebar Navigation
- Width: `240px` (collapsed: `64px` icon-only)
- Background: `#1A2744` (Navy)
- Logo area: top, with white Sinara wordmark
- Nav items: `Instrument Sans 500`, `14px`, white text
- Active state: `#2D4275` background fill + Gold `#B8956A` left border `3px`
- Icons: outline style, `20px`
- Bottom of sidebar: user avatar, settings, logout

### Main Content Area
- Background: `#FFFFFF`
- Padding: `32px` desktop / `16px` mobile
- Max content width: `1280px`

### Page Header (inside app)
- Contains: page title + breadcrumb + primary action button
- Border-bottom: `1px #E8E8E8`
- Height: `64px`

### Cards
- Background: `#FFFFFF` or `#F8F9FA`
- Border: `1px solid #E8E8E8`
- Border-radius: `8px`
- Padding: `20px 24px`
- Shadow: `0 1px 3px rgba(0,0,0,0.06)` (subtle)

---

## Components

### Buttons

**Primary**
```
bg:           #1A2744
text:         #FFFFFF
font:         Instrument Sans 600, 14px
padding:      10px 20px
border-radius: 6px
hover-bg:     #243561
```

**Accent (Gold CTA)**
```
bg:           #B8956A
text:         #FFFFFF
font:         Instrument Sans 600, 14px
padding:      10px 20px
border-radius: 6px
hover-bg:     #A07D55
```

**Secondary (outlined)**
```
bg:           transparent
border:       1px solid #E8E8E8
text:         #1A2744
font:         Instrument Sans 500, 14px
padding:      10px 20px
border-radius: 6px
hover-bg:     #F8F9FA
```

**Destructive**
```
bg:           #DC2626
text:         #FFFFFF
hover-bg:     #B91C1C
```

### Badges / Tags

**Dietary badges** (V / VG / H / GF)
```
bg:           #F5EDE3 (accent-light)
text:         #B8956A (accent)
font:         IBM Plex Mono 500, 11px
border:       1px solid #E8D5BC
border-radius: 4px
padding:      2px 6px
```

**Status badge — Active**
```
bg:           #DCFCE7
text:         #16A34A
```

**Status badge — Warning / Allergen**
```
bg:           #FEF3C7
text:         #D97706
```

**Status badge — Error**
```
bg:           #FEE2E2
text:         #DC2626
```

### Form Inputs
```
bg:           #FFFFFF
border:       1px solid #E8E8E8
border-radius: 6px
padding:      8px 12px
font:         IBM Plex Sans 400, 14px
color:        #1A2744
focus-border: #B8956A (Gold)
focus-shadow: 0 0 0 2px rgba(184,149,106,0.15)
placeholder:  #B0B0B0
```

### Tables (Scheduling grid)
```
header-bg:    #F8F9FA
header-text:  IBM Plex Sans 600, 12px, #6B7280
header-case:  Uppercase, letter-spacing: 0.05em
row-border:   1px solid #E8E8E8
row-hover:    #F8F9FA
data-font:    IBM Plex Mono 400, 13px
data-color:   #1A2744
```

### Shift / Schedule Blocks
```
Morning Shift:  bg #EEF2FF, border-left 3px solid #4F6AC8
Evening Shift:  bg #F0FDF4, border-left 3px solid #16A34A
Night Shift:    bg #FDF4FF, border-left 3px solid #9333EA
Day Off:        bg #F9FAFB, text #9CA3AF, border-left 3px solid #E8E8E8
Auto-generated: Gold indicator badge — bg #B8956A, text white
```

---

## Interaction & States

| State | Visual |
|-------|--------|
| Default | As described above |
| Hover | Lighten bg by 4%, cursor pointer |
| Active / Pressed | Darken bg by 6% |
| Focus | Gold `#B8956A` 2px outline ring |
| Disabled | Opacity `0.45`, cursor not-allowed |
| Loading | Skeleton: `#F0F0F0` with shimmer animation |
| Error | Red border `#DC2626`, error text below |
| Success | Green border `#16A34A`, success text below |

---

## Icons

- Style: **Outline / Stroke** (not filled)
- Size: `20px` standard, `16px` inline, `24px` page headers
- Color: inherits text color of context
- Recommended library: Lucide Icons (already used in the codebase via lucide-react / matches SvelteKit implementation)

---

## Spacing Scale

Use multiples of `4px`.

| Token | Value | Use |
|-------|-------|-----|
| `xs` | 4px | Inline tight gaps |
| `sm` | 8px | Between related elements |
| `md` | 16px | Component internal padding |
| `lg` | 24px | Between components |
| `xl` | 32px | Section gaps |
| `2xl` | 48px | Page section dividers |

---

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `sm` | 4px | Badges, tags, small elements |
| `md` | 6px | Inputs, buttons |
| `lg` | 8px | Cards, panels |
| `xl` | 12px | Modals, drawers |
| `full` | 9999px | Pill badges, avatars |

---

## Dark Mode (future consideration)

Not implemented in v1. When added:
- Sidebar stays Navy (already dark)
- Canvas: `#0F1117`
- Surface: `#1A1D27`
- Text: `#F1F1F1`
- Borders: `#2D2D3A`
- Gold accent remains unchanged

---

## What NOT to do

| ❌ Don't | ✅ Do instead |
|----------|--------------|
| Use Cream `#F5F1EC` as app background | Use White `#FFFFFF` |
| Use Gloock inside the dashboard | Use Instrument Sans |
| Use ALL CAPS for body text or buttons | Use Sentence case |
| Use Stone `#C8C0B4` as primary border inside app | Use `#E8E8E8` neutral |
| Use multiple accent colors (rainbow tags) | Use shift-type colors for schedule, Gold for brand accents |
| Use drop shadows heavier than `0 1px 3px rgba(0,0,0,0.06)` | Keep shadows flat and subtle |
| Use Cream as hero background inside app sections | Reserve Cream for marketing/landing pages only |
| Center-align long body text | Left-align; center only for empty states and short taglines |

---

## File Reference

| Asset | File |
|-------|------|
| Logo (light bg) | `sinara_logo_light.png` |
| Logo (dark bg) | `sinara_logo_dark.png` |
| App icon | `sinara_icon.png` |
| Brand poster | `sinara_poster.png` |
| Stella identity | `stella_identity.png` |
| Brand guidelines (PDF) | `sinara_brand_guidelines.pdf` |
| Brand hierarchy map | `sinara_brand_hierarchy.png` |
| Brand story (Word) | `sinara_brand_story.docx` |
| Manifesto (Word) | `sinara_manifesto.docx` |
| Personal branding strategy | `sinara_personal_branding_strategy.md` |
| Social media threads | `sinara_social_threads.md` |
| **This file** | `sinara_design_system.md` |

---

## Quick Reference Card

```
BACKGROUNDS
  App canvas:    #FFFFFF
  App surface:   #F8F9FA
  Sidebar:       #1A2744
  Marketing bg:  #F5F1EC  ← marketing only

TEXT
  Primary:       #1A2744
  Secondary:     #6B7280
  On dark:       #FFFFFF

ACCENT
  Default:       #B8956A
  Hover:         #A07D55
  Light tint:    #F5EDE3

BORDERS
  Default:       #E8E8E8
  Strong:        #D1D1D1

FONTS (APP)
  Headings:      Instrument Sans 600
  Body:          IBM Plex Sans 400
  Data/Numbers:  IBM Plex Mono 400

FONTS (MARKETING)
  Display:       Gloock Regular / Italic
  Body:          Instrument Sans 400

BORDER RADIUS
  Buttons/inputs: 6px
  Cards:          8px
  Modals:         12px
```

---

---

## Constellation Pattern

The Sinara signature background pattern. Used on the marketing landing page hero and section backgrounds. References the sparkle logo mark and *sinar* (ray of light) etymology. Never use inside the app dashboard — marketing layer only.

### Reference file
`/branding/pattern_A_constellation.png` — 1400×900px static reference. Use this to match the visual target.

### Visual spec

```
Background:       Cream #F5F1EC
Node color:       Navy #1A2744 at 45–65% opacity
Node size:        1.5px (regular) — 3–5px (sparkle nodes, ~15% of total)
Sparkle nodes:    Gold #B8956A arms (cardinal, 65% opacity, length ~12px)
                  Navy #1A2744 diagonal arms (45% opacity, length ~7px)
Connecting lines: Navy #1A2744
  — min opacity:  20% (far connections, ~130px distance)
  — max opacity:  65% (close connections, <20px distance)
  — line width:   1px
Max link distance: 140px
Node count:       ~80–90 nodes across 1400×900
```

### Brand sparkle anchors (static version)
Three fixed sparkle markers placed as brand accents:

| Position | Arm length | Gold opacity | Navy opacity |
|---|---|---|---|
| Top-right `(1100, 155)` | 64px (primary), 36px (ring) | 65% | 50% |
| Bottom-left `(175, 745)` | 36px (primary), 20px (ring) | 50% | 40% |
| Mid-left edge `(60, 380)` | 18px | 35% | 28% |

---

## Animated Constellation — Implementation Guide

### Recommended: tsParticles (SvelteKit)

The animated version of the constellation pattern for the marketing landing page. Nodes float slowly across the cream background, lines appear and fade based on proximity. Cursor hover causes lines to stretch toward the mouse ("grab" mode) — this is the key interaction.

#### Install

```bash
pnpm add @tsparticles/svelte @tsparticles/slim
```

#### Component — `ConstellationBg.svelte`

```svelte
<script>
  import Particles from '@tsparticles/svelte';
  import { loadSlim } from '@tsparticles/slim';

  const particlesInit = loadSlim;

  const options = {
    fullScreen: { enable: false },          // contained — not full viewport
    background: {
      color: { value: "#F5F1EC" }           // Cream
    },
    fpsLimit: 60,
    particles: {
      number: {
        value: 85,
        density: { enable: true, area: 900 }
      },
      color: {
        value: ["#1A2744", "#1A2744", "#1A2744", "#B8956A"]  // mostly Navy, ~25% Gold
      },
      links: {
        enable: true,
        color: "#1A2744",
        opacity: 0.28,
        distance: 140,
        width: 1,
        triangles: { enable: false }
      },
      move: {
        enable: true,
        speed: 0.55,                         // slow drift
        direction: "none",
        random: true,
        straight: false,
        outModes: { default: "bounce" }
      },
      size: {
        value: { min: 1, max: 3.5 },
        animation: { enable: false }
      },
      opacity: {
        value: { min: 0.35, max: 0.65 },
        animation: { enable: false }
      },
      shape: {
        type: "circle"                       // dots only — sparkles handled below
      }
    },
    interactivity: {
      detectsOn: "canvas",
      events: {
        onHover: {
          enable: true,
          mode: "grab"                       // lines stretch toward cursor
        },
        onClick: { enable: false }
      },
      modes: {
        grab: {
          distance: 180,                     // grab radius
          links: { opacity: 0.55 }           // grabbed lines are stronger
        }
      }
    },
    detectRetina: true
  };
</script>

<!-- Wrap in a positioned container so it sits behind content -->
<div class="relative w-full h-full">
  <Particles
    id="sinara-constellation"
    class="absolute inset-0 w-full h-full"
    {options}
    {particlesInit}
  />
  <div class="relative z-10">
    <slot />
  </div>
</div>
```

#### Usage in `+page.svelte`

```svelte
<script>
  import ConstellationBg from '$lib/components/ConstellationBg.svelte';
</script>

<!-- Hero section with constellation behind content -->
<section class="relative min-h-screen overflow-hidden">
  <ConstellationBg>
    <div class="flex flex-col items-start justify-center min-h-screen px-16 py-24 max-w-7xl mx-auto">
      <h1 class="font-display text-6xl text-navy">Your operations.</h1>
      <h1 class="font-display italic text-6xl text-gold">Automated.</h1>
      <!-- etc -->
    </div>
  </ConstellationBg>
</section>
```

#### Tailwind config additions needed (`tailwind.config.js`)

```js
theme: {
  extend: {
    colors: {
      navy:  '#1A2744',
      gold:  '#B8956A',
      cream: '#F5F1EC',
    },
    fontFamily: {
      display: ['Gloock', 'serif'],           // marketing headings
      sans:    ['Instrument Sans', 'sans-serif'],
      mono:    ['IBM Plex Mono', 'monospace'],
    }
  }
}
```

---

### Alternative: Custom Canvas (full brand control)

Use this if you need the exact gold sparkle-cross nodes (4-point star shape) matching the static PNG reference. tsParticles only renders circles — custom canvas gives you the full branded sparkle nodes.

#### Component — `ConstellationCanvas.svelte`

```svelte
<script>
  import { onMount } from 'svelte';

  let canvas;
  let animId;

  const NAVY_RGB  = '26,39,68';
  const GOLD_RGB  = '184,149,106';
  const NODE_COUNT = 85;
  const MAX_DIST   = 140;
  const SPEED      = 0.45;

  onMount(() => {
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // build nodes — 15% are sparkle type
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:         Math.random() * canvas.width,
      y:         Math.random() * canvas.height,
      vx:        (Math.random() - 0.5) * SPEED,
      vy:        (Math.random() - 0.5) * SPEED,
      r:         Math.random() < 0.15 ? 3 : 1.5,
      isSparkle: Math.random() < 0.15,
    }));

    const drawSparkle = (x, y, r) => {
      const arm  = r * 3.5;
      const diag = arm * 0.6;
      // gold cardinal arms
      ctx.strokeStyle = `rgba(${GOLD_RGB},0.65)`;
      ctx.lineWidth   = 1;
      [[arm,0],[0,arm],[-arm,0],[0,-arm]].forEach(([ex, ey]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x+ex, y+ey);
        ctx.stroke();
      });
      // navy diagonal arms
      ctx.strokeStyle = `rgba(${NAVY_RGB},0.45)`;
      [[diag,diag],[-diag,diag],[diag,-diag],[-diag,-diag]].forEach(([ex, ey]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x+ex, y+ey);
        ctx.stroke();
      });
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < MAX_DIST) {
            const t   = 1 - dist / MAX_DIST;
            const op  = (0.08 + t * 0.42).toFixed(2);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${NAVY_RGB},${op})`;
            ctx.lineWidth   = 1;
            ctx.stroke();
          }
        }
      }

      // nodes
      nodes.forEach(n => {
        if (n.isSparkle) drawSparkle(n.x, n.y, n.r);

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.isSparkle
          ? `rgba(${GOLD_RGB},0.70)`
          : `rgba(${NAVY_RGB},0.50)`;
        ctx.fill();

        // move + bounce
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  });
</script>

<canvas
  bind:this={canvas}
  class="absolute inset-0 w-full h-full"
  style="background: #F5F1EC;"
/>
```

---

### When to use which

| Scenario | Use |
|---|---|
| Fast implementation, no sparkle nodes needed | tsParticles |
| Need gold 4-point sparkle nodes to match brand PNG | Custom Canvas |
| Static background (SSR, no JS, email) | PNG pattern file |
| App dashboard background | Neither — white `#FFFFFF` only |

### Performance notes
- Keep node count ≤ 90 — O(n²) line checks become expensive above that
- Set `fpsLimit: 60` in tsParticles (already in config above)
- Canvas version: consider pausing animation with `IntersectionObserver` when section is off-screen
- Never use on mobile at full node count — reduce to 40 nodes on `window.innerWidth < 768`

```svelte
<!-- Mobile-aware node count -->
const isMobile = window.innerWidth < 768;
const NODE_COUNT = isMobile ? 40 : 85;
```

---

*sinara · design system v1.0 · 2026 · presence, by design*
