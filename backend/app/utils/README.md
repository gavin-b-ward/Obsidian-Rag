# Utils Folder

This folder contains small reusable helper functions.

Put these kinds of items here:

- Path normalization helpers.
- Time parsing and formatting helpers.
- Small generic helpers reused in multiple places.

Avoid putting these here:

- Main business logic.
- Database access code.
- Route handlers.

If a helper grows large or becomes domain-specific, move it into a more focused folder.
