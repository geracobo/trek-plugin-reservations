# Plugin SDK limitations

This records capabilities available in TREK's native UI that this plugin cannot
reproduce through the currently exposed plugin boundary.

## Removing a secondary file link

The reservation editor can detach a file whose primary `reservation_id` is the
reservation being edited. It cannot detach an additional (secondary) file link.

Native TREK reads a file's links and removes the matching link record. The
plugin SDK provides `ctx.files.createLink()` but no equivalent to list or remove
file links.

Needed SDK surface:

- `ctx.files.listLinks(tripId, fileId)`
- `ctx.files.removeLink(tripId, fileId, linkId)`

## Opening a linked cost in Costs

The plugin can create and list any number of costs linked to a reservation.
TREK's plugin navigation bridge only accepts a relative path; it has no public
contract to select the Costs tab or focus a particular cost editor.

Needed SDK surface, or an equivalent documented URL contract:

- `trek.navigate({ tab: 'costs', costId })`

## Instance-wide plugin settings administration

Plugin manifests can declare instance-scoped settings, but there is currently no
admin UI to manage their values. They must be set through an API instead.

Needed host surface:

- An admin settings form generated from the plugin manifest's instance-scoped
  settings.

## Ephemeral plugin UI state

TREK recreates a trip-page plugin iframe when its tab is selected. Browser
session state is therefore not a reliable place to retain UI choices such as the
last selected reservation view.

Needed SDK surface:

- Per-plugin, per-user, per-trip ephemeral state that survives iframe
  recreation, with a small bounded payload.

## User-scoped plugin settings in the UI

Per-user settings would support preferences such as blurring booking codes.
The plugin needs a supported way to read resolved user-scoped settings in its
client UI, without exposing secret settings to the iframe. For example blur codes
or prefered hour format.

Needed SDK surface:

- A client-safe subset of resolved user settings in the plugin context, or a
  server-mediated settings endpoint for non-secret values.
