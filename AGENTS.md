# Agent Guidance for askr-monaco

This repo is the scaffold for an Askr wrapper around Monaco Editor.

- Keep the surface small until the first real Monaco integration lands.
- Mirror the askr-ui package layout when adding source, tests, and docs.
- Add new public exports only when they are backed by tests and docs.
- Prefer narrow, source-backed changes over speculative API growth.
