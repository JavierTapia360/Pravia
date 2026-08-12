# PRAVIA OS — Application shell override

This page-level guidance overrides the landing-page patterns in `MASTER.md` for the authenticated product shell.

## Product intent

- Desktop-first legal operations workspace with responsive tablet and mobile behavior.
- High information density without visual noise.
- Light work surface, navy navigation, copper accent reserved for primary actions and attention.
- No oversized marketing typography, scroll-reveal effects, decorative glassmorphism, or hover movement.
- Use system fonts first so the operational shell remains legible and available offline.

## Shell dimensions

- Expanded sidebar: `264px`; collapsed: `76px`.
- Top bar: `64px`.
- Main content maximum width: `1600px` with `24px` desktop gutters.
- Mobile breakpoint: `900px`; sidebar becomes a dismissible overlay.

## Interaction rules

- Every icon-only action needs an accessible label and visible tooltip via `title` where appropriate.
- Active navigation uses a light inset surface and a 3px copper indicator.
- Group labels remain visible only in the expanded desktop/mobile navigation.
- Focus rings use the institutional navy and must never be removed without a replacement.
- Transitions are 120–200ms and disabled under `prefers-reduced-motion`.

## Compatibility

Legacy modules may still contain dark Tailwind surfaces. New shell and shared components use semantic tokens; individual modules are migrated in their corresponding functional phase.
