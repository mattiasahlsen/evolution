# Make gh-pages web app mobile-friendly

## Context
The Evolution Simulator web app uses a fixed 260px left sidebar for controls alongside a flex canvas. On mobile screens, this layout breaks — the sidebar can't shrink below 260px, leaving almost no room for the canvas. There are no media queries or responsive breakpoints. The goal is to make the app usable on phones and tablets.

## Approach
On screens narrower than 600px, convert the controls panel into a toggleable slide-out drawer overlay, and let the canvas fill the full viewport. Add a floating toggle button to open/close the drawer.

## Files to modify

### 1. `src/style.css` — Add mobile responsive styles
- Add a `.menu-toggle` button style: floating button (top-left corner, z-index 200), styled to match the dark theme
- Add `@media (max-width: 600px)` breakpoint:
  - `.controls-panel`: position fixed, left 0, top 0, height 100vh, z-index 150, transform `translateX(-100%)` by default (hidden off-screen)
  - `.controls-panel.open`: transform `translateX(0)` (slide in)
  - Add CSS transition on transform for smooth slide animation
  - Add a semi-transparent backdrop overlay when panel is open
  - `#sim-canvas`: full width (no subtraction of panel width)
- Increase touch target sizes on mobile: buttons get larger padding, sliders get more height

### 2. `src/main.ts` — Fix canvas sizing for mobile
- In `resizeCanvas()`: detect if viewport is mobile-width (< 600px) and use full `window.innerWidth` instead of subtracting 260px
- Create the menu toggle button element and append to `#app`
- Add click handler to toggle `.open` class on the controls panel
- Add backdrop element that closes the panel when tapped

### 3. `src/ui/ui.ts` — No changes needed
The UI class builds the panel contents but doesn't control layout positioning, so no changes are required here.

## Implementation details

**Toggle button**: A `<button>` with a hamburger icon (Unicode `\u2630` or simple "Menu" text), only visible on mobile via the media query. Positioned fixed top-left.

**Backdrop**: A div with `position: fixed; inset: 0; background: rgba(0,0,0,0.5)` that appears behind the panel when open, and closes the panel on click.

**Canvas resize logic**:
```ts
function resizeCanvas(): void {
  const isMobile = window.innerWidth < 600
  const panelWidth = isMobile ? 0 : 260
  config.width = window.innerWidth - panelWidth
  config.height = window.innerHeight
  renderer.resize(config.width, config.height)
}
```

## Verification
1. Run `pnpm verify` to check TypeScript and tests pass
2. Run `pnpm dev` and test in browser:
   - Desktop (>600px): sidebar visible as before, no toggle button visible
   - Mobile (<600px or DevTools responsive mode): canvas fills screen, hamburger button visible, tapping it slides panel in, tapping backdrop closes it
   - Sliders and buttons are easy to tap on mobile
   - Canvas resizes correctly when toggling panel or rotating device
3. Build with `pnpm build` and check the `docs/` output
