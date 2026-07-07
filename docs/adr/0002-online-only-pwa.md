# The PWA is online-only — no offline write queue

The app installs as a PWA but does not queue writes while offline; mutations
require a live connection. Chosen to avoid the complexity and conflict
resolution of an offline sync layer for a single-user personal tool. Adding
offline support later is a deliberate, sizeable project, not a small follow-up.
