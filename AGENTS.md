# Agent guidance

## TREK UI and SDK

- TREK's design kit is injected through the `<!-- trek:ui -->` marker in
  `src/client/index.html` during `dev` and `pack`. Do not import or copy the
  kit's CSS or JavaScript into this plugin.
- Treat the installed `trek-plugin-sdk` and the upstream TREK source as the
  source of truth for kit classes, theme tokens, and bridge APIs. The relevant
  upstream files are:
  - [`plugin-sdk/src/ui/kit.ts`](https://github.com/mauriceboe/TREK/blob/main/plugin-sdk/src/ui/kit.ts)
  - [`plugin-sdk/src/cli/dev.ts`](https://github.com/mauriceboe/TREK/blob/main/plugin-sdk/src/cli/dev.ts)
  - [`plugin-sdk/src/cli/pack.ts`](https://github.com/mauriceboe/TREK/blob/main/plugin-sdk/src/cli/pack.ts)
- Prefer the existing `trek-*` primitives (`trek-card`, `trek-btn`,
  `trek-input`, `trek-chip`, and related classes) and `window.trek` bridge APIs
  when working within the plugin's established UI patterns.
- Read `src/client/app.css` before changing shared styles. It maps TREK theme
  tokens to Tailwind utilities and contains deliberate cascade overrides for
  the injected, unlayered design-kit CSS.

The SDK version used by this repository is declared in `package.json` and
resolved in `package-lock.json`. If the SDK changes, verify the injected kit
and its build behavior rather than assuming this guidance is exhaustive.
