# Changelog — Splash redesign + app icon

## Modified
- `app/index.tsx` — splash / welcome screen fully redesigned (see below). The session-restore and role-routing `useEffect` is carried over unchanged; so are the two sign-up / sign-in routes and the "restoring" gate.
- `app.json` — added `icon`, `backgroundColor`, `android.backgroundColor`, `android.adaptiveIcon` (foreground, monochrome, background) and `web.favicon`. Every existing key is kept as it was.

## Added
- `assets/brand/icon.png` — 1024×1024 app icon built from `assets/guidance-logo.png`.
- `assets/brand/adaptive-foreground.png` — Android adaptive-icon foreground (mark kept inside the safe zone).
- `assets/brand/adaptive-monochrome.png` — Android 13+ themed-icon layer.
- `assets/brand/favicon.png` — 48×48 web favicon.
- The logo shapes were re-rendered at high resolution from the original 490 px PNG so the edges are crisp at 1024 px. Same shapes, same colours (`#2133FF`, mint "+").

## Splash design
- Deep ink-navy canvas with hairline rings and one flat brand-blue disc (no gradients).
- Hero photo in an arch (it echoes the arches in the photograph) with a champagne outline frame.
- Brand bar: logo tile, "Mentorship+" wordmark with a mint "+", "SPACE TO GROW" in champagne.
- Headline "Your next chapter / starts here." with the second line in champagne.
- White primary button with an arrow chip; quiet outline secondary button.
- While the session is checked, a thin champagne progress line replaces the buttons (same height, so nothing jumps).
- Entrance runs about 1 second, uses the native driver, and respects the system "reduce motion" setting. Buttons are usable from the first frame.
- The arch fills the space left over (measured with `onLayout`), so it adapts to small, tall and large Android screens. The content is capped at 480 px wide, and the whole screen scrolls if text scaling makes it taller than the display.

## Not changed
Authentication, `AppContext`, API client, other screens, `package.json` (no new dependencies).
