# TREK Reservations Plugin
Enhanced reservations module for TREK.

## Screenshots

![screenshot](./docs/screenshot.png)

## What it does

Reservations gives each TREK trip a single workspace for transportation, accommodation, and other bookings.

**Features**
- Create and edit transportation, transit, accommodation, and general bookings.
- View every reservation together instead of switching between the built-in **Transport** and **Book** tabs.
- Switch between card, table, and calendar views.
- Search reservations with free text, or filter them by the criteria you need.


**Current limitations**

- KItinerary-backed import from file. LLM-backed is more likely through the plugin SDK, but PDF parsing and OCR would have to be handled by our plugin. Maintaining a separate independent interface with an AI platform would be the other option.
- Linked-item navigation. For example with linked costs. Until a navigation API is implemented on the plugin SDK (with resource referencing like costId, fileId), it will not be possible.
- Managing file links on reservations. SDK has exposed only a way to create file links, but not how to edit/delete them from the `file_links` table.
- Managing plugin settings. In our case we need a Google Places API key to replicate the current functionality. Instance-scoped settings are still not modifiable from the UI. Another (probably very bad) solution would be to share that API key with our plugin through a permission. A better solution would be to have a mapService interface on the plugin SDK so TREK would fully own and centralize that functionality.
- Pulling user-specific settings like: blur booking codes, preferred time format, etc.
- Storing session state for things like persisting filters and views during trip tab changes.

## Permissions

The plugin only accesses trips the signed-in user is allowed to access. Editing
actions also follow that user's existing TREK permissions.

| Permission | Why it is needed |
| --- | --- |
| `db:read:trips` | Display the trip, its days, places, accommodations, and reservations. |
| `db:read:files` | Show files linked to reservations. |
| `db:read:costs` | Show costs associated with reservations. |
| `db:write:reservations` | Create, edit, and delete reservations. |
| `db:write:accommodations` | Create and update accommodation bookings. |
| `db:write:places` | Create and update places selected while editing a reservation. |
| `db:write:files` | Attach files to reservations and remove their links. |
| `db:write:costs` | Create, edit, and delete reservation costs. |
| `http:outbound:nominatim.openstreetmap.org` | Search for locations with OpenStreetMap's Nominatim service. |
| `http:outbound:places.googleapis.com` | Optionally search for locations with Google Places when an administrator configures an API key. |
| `http:outbound:api.transitous.org` | Look up public-transit journeys. |

## Setup

After an administrator installs the plugin in TREK, open a trip and select the
**Reservations** trip page. You can browse reservations in the card, table, or
calendar view; use the add and edit controls when you have permission to modify
that trip.

No user configuration is required. Location search uses OpenStreetMap by
default.

### Optional administrator configuration

An administrator can configure a Google Places API key to enable Google Places
search. The key is optional; OpenStreetMap remains available when it is unset.
Until instance-wide settings are available in the TREK UI, configure it through
the API:

```js
await fetch('/api/admin/plugins/reservations/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
        googlePlacesApiKey: 'GOOGLE_PLACES_API_KEY',
    }),
}).then(async (response) => {
    if (!response.ok) throw new Error(await response.text())
    return response.json()
})
```

## License

MIT
