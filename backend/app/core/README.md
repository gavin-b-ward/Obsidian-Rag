# Core Folder

This folder contains application-wide configuration and setup.

Put these kinds of items here:

- Settings and environment variable loading.
- Logging setup.
- Shared constants.
- App bootstrap helpers used across multiple modules.

Avoid turning this into a dumping ground:

- If code belongs clearly to API, services, repositories, or embeddings, keep it there.
