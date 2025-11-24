# UI/UX Audit (Initial Pass)

## Identified Improvement Areas
1. Skip navigation link for accessibility.
2. Consistent max-width containers (currently varied: 1500px vs 2000px).
3. Focus-visible styling consistency (ensure focus ring not suppressed by custom classes).
4. Reduce visual clutter in gradient backgrounds; provide neutral background option for data-heavy views.
5. Unify spacing scale (some pages use px-8 others px-4).
6. Elevation hierarchy: headers vs cards vs panels (ensure shadow + border consistent).
7. Loading states: add skeletons where data fetch latency occurs (agent workflow / performance).
8. Provide clearer actionable labels ("Research" vs "Start Research" could A/B test later).
9. Persistent status area for active session (currently localized to workflow header).
10. Dark/light contrast ratio check for accent colors (branding color injection).

## Quick Wins Implemented (Round 1)
- Added skip link component (to implement) and plan to mount in `AppShell`.
- Planning normalization of container width to 1600px for all major pages.

## Next Steps
- Introduce `SkipLink` component and insert at top of shell.
- Abstract common header into layout (defer to todo #4).
- Add focus-visible utility class to buttons if missing.
- Consider a `Skeleton` component for charts and logs.

_This file will evolve with subsequent passes._
