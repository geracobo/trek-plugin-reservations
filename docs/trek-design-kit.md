# TREK design-kit reference

This is a navigation aid for contributors exploring this plugin. It describes
the version of the design kit provided by this repository's installed
`trek-plugin-sdk`; it is not another runtime copy of the kit.

The SDK remains the source of truth. Copying its CSS and JavaScript into the
plugin would create a stale fork and would prevent `dev` and `pack` from
supplying fixes made in later compatible SDK releases.

## Where to read the source

The source installed for this repository is available at:

- `node_modules/trek-plugin-sdk/dist/ui/kit.js` — readable implementation with
  `TREK_UI_CSS`, `TREK_THEME_JS`, and `injectTrekUi`
- `node_modules/trek-plugin-sdk/dist/cjs/ui/kit.js` — CommonJS build of the same
  implementation
- `node_modules/trek-plugin-sdk/dist/ui/kit.d.ts` — exported API declarations

The upstream TypeScript source is available publicly in TREK:

- [`plugin-sdk/src/ui/kit.ts`](https://github.com/mauriceboe/TREK/blob/main/plugin-sdk/src/ui/kit.ts)
- [`plugin-sdk/src/cli/dev.ts`](https://github.com/mauriceboe/TREK/blob/main/plugin-sdk/src/cli/dev.ts) — development-time expansion
- [`plugin-sdk/src/cli/pack.ts`](https://github.com/mauriceboe/TREK/blob/main/plugin-sdk/src/cli/pack.ts) — package-time expansion

## How it enters the plugin

`src/client/index.html` contains the exact `<!-- trek:ui -->` marker. Vite keeps
that marker in the built `build/client/index.html`. The SDK's `injectTrekUi` function
replaces it during `dev` and `pack` with:

```html
<style data-trek-ui>/* TREK_UI_CSS */</style>
<script data-trek-ui>/* TREK_THEME_JS */</script>
```

The source HTML deliberately does not import either design-kit file. Vite emits
the plugin's JavaScript and stylesheet as normal static files under `build/client/`,
which TREK loads alongside the SDK-injected design kit.

## CSS supplied by the kit

The kit owns these foundations:

- a box-sizing reset and the `body.trek-ui` typography/background baseline;
- host-controlled color, border, shadow, radius, font, and glass CSS variables;
- light and dark defaults before the first host context arrives;
- focus-visible and reduced-motion behavior;
- no-transparency behavior for glass surfaces;
- `.trek-card`, `.trek-glass`, and `.trek-interactive`;
- `.trek-btn` with primary, secondary, ghost, and danger variants;
- `.trek-input`, `.trek-textarea`, `.trek-select`, and `.trek-label`;
- `.trek-chip` with accent, success, danger, warning, and info variants;
- `.trek-row`, `.trek-title`, `.trek-muted`, and `.trek-faint`;
- `.trek-stack` and `.trek-cluster`.

`src/client/app.css` maps the live tokens to semantic Tailwind utilities. The
React components use those utilities for plugin-specific composition and keep
the kit's `trek-*` classes for native primitives.

## JavaScript supplied by the kit

The bootstrap installs `window.trek`, adds `trek-ui` to the body, requests host
context, applies theme tokens and appearance attributes, and reports document
height through a `ResizeObserver`.

The bridge exposes:

- `trek.onContext` and `trek.context`;
- `trek.invoke`;
- `trek.notify`;
- `trek.navigate`;
- `trek.resize`, `trek.ready`, and `trek.requestContext`;
- small DOM helpers under `trek.ui`.

React does not use `trek.ui`; both are alternative ways to construct elements.
This plugin does use the bridge and the CSS primitives.

## Inspecting the exact packed result

Run `npm run pack`, then inspect `client/index.html` inside `plugin.zip`. The
blocks marked with `data-trek-ui` are the exact kit shipped for that artifact;
the plugin's Vite-bundled JavaScript and stylesheet remain separate assets under
`client/assets/`.
