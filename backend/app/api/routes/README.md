# Routes Folder

This folder contains route modules grouped by resource or feature.

Put these kinds of items here:

- `APIRouter` instances.
- Endpoint functions like `/chat`, `/embed`, and `/vaults`.
- Lightweight request validation and response shaping.
- Small route-local helpers used only by one route module.

Good rule of thumb:

- Routes should stay thin.
- A route should usually validate input, call a service, and return a response.
