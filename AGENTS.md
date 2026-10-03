# Guardian Wrapper

Read graft/INDEX.md and the relevant cards before changing code; rebuild with graft build when missing or stale.
CLI implementation lives in src/. Integration tests live in test/. Vendored skills and templates live in assets/.
Keep project installation local; preserve user files and never change global agent settings.
Use strict TypeScript, unknown at external boundaries, and explicit function return types. No explicit or implicit any.
Run npm test, npm run typecheck and npm run check:assets before delivery.
Record vendored sources and adaptations in sources.lock.json and THIRD-PARTY-NOTICES.md.
