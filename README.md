# TREK Reservations Plugin

**Every reservation, every view.**

Reservations provides a unified workspace for managing transportation,
accommodation, transit, and other trip bookings in TREK.

View the same reservations as cards, a structured table, a calendar, or a
timeline. Search, filter, sort, and group them without switching between
separate trip sections.

## Screenshots

![screenshot](./docs/screenshot.png)

## What it does

Reservations brings transportation, accommodation, transit, restaurants, events, tours, and other bookings into a single workspace.

You can view the same reservation data in four different ways:

- **Cards** for quick visual browsing
- **Table** for dense, structured information
- **Calendar** for date-based planning
- **Timeline** for understanding duration and overlap

Every view supports the same search, filtering, sorting, and grouping tools, so you can organize reservations without switching between separate trip sections.

You can also:

- Create, edit, and delete reservations
- Customize which fields appear in each view
- Plan and add public-transit journeys through connected services

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

## Current limitations and SDK constraints

Some functionality is currently limited by the APIs exposed through the TREK
plugin SDK.

- **Reservation import from files**  
  Automated import through KItinerary is not currently available to plugins.
  An LLM-assisted importer may be possible, but PDF parsing and OCR would need
  to be handled by the plugin or an external service.

- **Navigation to linked resources**  
  The plugin cannot currently navigate directly to related resources such as
  costs or files. This requires a plugin navigation API that can reference
  resources such as `costId` or `fileId`.

- **Managing linked files**  
  The SDK allows plugins to create file links, but does not currently expose
  everything needed to edit or remove links from the `file_links` table.

- **Plugin settings in the TREK interface**  
  Reservations can optionally use Google Places, but instance-scoped plugin
  settings cannot currently be managed through the TREK UI. Administrators
  must configure the API key through the plugin configuration endpoint.

- **Access to user preferences**  
  Plugins cannot currently read preferences such as confirmation-code
  blurring or the user's preferred time format.

- **Persisting workspace state**  
  Filters, grouping, sorting, and the selected view cannot currently be
  preserved when navigating between trip tabs because plugins do not have
  access to persistent session state.

## License

MIT
