# Plugin tooling

This document describes the development and release tooling used by this
plugin: React and TypeScript authoring, Vite bundling, artifact assembly, SDK
preview and reload behavior, validation, and packaging. It is an implementation
guide for this repository, not a replacement for TREK's evolving plugin
contract.

For the authoritative contract, see:

- [Plugin Development](https://github.com/mauriceboe/TREK/wiki/Plugin-Development)
- [Plugin Cookbook](https://github.com/mauriceboe/TREK/wiki/Plugin-Cookbook)
- [Plugin Permissions](https://github.com/mauriceboe/TREK/wiki/Plugin-Permissions)

## Toolchain

- React and TypeScript implement the browser client.
- Tailwind generates layout utilities mapped to TREK's live design tokens.
- Vite and Rollup compile the client into one self-contained HTML document.
- `scripts/dev.mjs` coordinates Vite's build watcher with the TREK SDK server.
- `trek-plugin-sdk` previews, validates, and packages the assembled plugin.

## Runtime constraints

TREK runs a plugin's server in an isolated child process and its client in a
sandboxed, opaque-origin iframe. The iframe cannot read the host DOM or cookies.
Its content security policy also prevents loading external scripts and styles,
so a normal Vite build containing references to JavaScript and CSS assets does
not fit the boundary.

The runtime artifact therefore needs one self-contained `client/index.html`
with the application JavaScript and CSS inlined. Communication with the host
goes through the `window.trek` bridge installed by TREK's design kit.

## Project and artifact layouts

The repository keeps editable source separate from the generated plugin:

```text
src/
  client/
    index.html       HTML shell and TREK design-kit marker
    main.tsx         React entry point
    App.tsx          top-level React component
    app.css          Tailwind entry, TREK token mapping, and iframe root rule
    reservations/    reservation UI, domain model, and types
  server/
    index.js         TREK server entry point
trek-plugin.json     plugin manifest
vite.config.ts       client bundling and artifact assembly
```

`npm run build` produces the directory consumed by TREK's SDK:

```text
build/
  client/index.html
  server/index.js
  trek-plugin.json
  README.md
  package.json
```

`build/` is generated output and should not be edited by hand.

## Build pipeline

The build in `vite.config.ts` has four relevant properties:

1. Tailwind scans the client source and generates only the utilities it uses.
   Its Preflight reset is disabled because TREK's injected design kit owns the
   iframe baseline.
2. Rollup emits the React application as a single IIFE entry. This avoids ES
   module imports and code-split chunks that would require separate files.
3. The `inline-client-html` plugin reads the emitted JavaScript and CSS and
   inserts them into the marked `<script>` and `<style>` elements in
   `src/client/index.html`. It escapes closing tags so bundled content cannot
   terminate either inline element early, writes `build/client/index.html`, and
   removes the intermediate assets from the bundle.
4. The `copy-plugin-files` plugin copies the manifest, server entry, README,
   package metadata, and an optional license into `build/`.

The HTML shell retains `<!-- trek:ui -->`. The TREK SDK expands this marker when
it develops or packages the built plugin, adding the design-kit CSS and the
`window.trek` bridge. Keeping the marker in the generated HTML lets the current
SDK provide the current kit instead of freezing a copied version in source.
See [TREK design-kit reference](trek-design-kit.md) for a local map of the
injected CSS, JavaScript, and their source files.

## Client-to-host boundary

The client must not call TREK's internal APIs directly. It should use the
design-kit bridge:

- `trek.onContext(...)` receives the current `tripId`, theme, locale, format
  preferences, design tokens, and appearance settings.
- `trek.invoke(...)` calls a route belonging to this plugin.
- `trek.notify(...)` asks the host to show a toast.
- `trek.navigate(...)` requests relative in-app navigation.

For this trip-page plugin, the client waits for a non-null `tripId` and invokes
`/reservations`. TREK authenticates the route and the server reads trip data
through `ctx.trips`; it does not trust a user identity supplied by the browser.

Treat context as live state rather than one-time configuration. TREK can send
it again when the theme, accent, or appearance preferences change.

## Server and permissions boundary

`src/server/index.js` is plain CommonJS and exports `definePlugin(...)`. TREK
injects `trek-plugin-sdk` at runtime, so the SDK is a development dependency and
must not be bundled into the artifact.

The manifest grants `db:read:trips` and `db:read:files`. They enable the
authenticated route to use `ctx.trips.getById`, `getPlaces`, and
`getReservations`, plus `ctx.files.list` for filenames linked to reservations.
TREK membership-checks these calls against the user bound to the request. These
reads would not work in `onLoad` or a scheduled job because those contexts have
no acting user.

Keep manifest permissions minimal and document why each one is needed in the
README. If outbound HTTP is added later, both the appropriate
`http:outbound:<host>` permission and matching manifest egress declaration are
required; the server egress guard and iframe CSP are independent controls.

## Development workflow

```bash
npm install
npm run dev
```

`dev` builds first, then starts the TREK SDK development server using `build/`.
It also keeps Vite running in build-watch mode. Source changes regenerate the
self-contained artifact under `build/`; the SDK notices those artifact changes
and reloads its preview. This is full-page live reload rather than Vite HMR,
because the UI must continue running inside the real TREK sandbox and bridge.
Use `/preview` to exercise that sandbox, context, and theme/appearance changes.

## Validation and packaging

Before sharing or publishing a build, run:

```bash
npm run validate
npm run pack
```

`validate` checks the assembled plugin layout and manifest. `pack` rebuilds and
creates `plugin.zip`, the artifact TREK installs.

## Maintenance checklist

When upgrading React, Vite, or the TREK SDK:

- build and confirm `build/client/index.html` contains no external application
  script or stylesheet references;
- check that the `<!-- trek:ui -->` marker remains in the generated HTML;
- run `npm run validate` against the assembled `build/` directory;
- preview both light and dark themes, custom accents, compact density, reduced
  motion, and disabled transparency;
- test with the current host version declared by the manifest's `trek` range;
- revisit upstream TREK documentation before relying on undocumented host
  behavior, because the plugin ecosystem is still evolving.

## Where future documentation belongs

Keep implementation-specific decisions here beside the code. Propose reusable,
framework-neutral rules or broadly useful recipes upstream in TREK's wiki or
cookbook, linking back to a working plugin only as an example. This keeps the
contract authoritative in one place while allowing this repository's build
details to evolve independently.
