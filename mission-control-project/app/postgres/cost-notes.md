# Mission Control Postgres Cost Notes

## Direct cost
### Local Docker / local install
- Software cost: $0
- Compute/storage cost: uses your own machine resources
- Best for local-first Mission Control

### Cloud database later
- Small managed Postgres usually starts around $10 to $30/month
- More if you want backups, high availability, more storage, or vector search at scale

## Hidden costs
- setup time
- maintenance time
- backup strategy
- schema evolution
- debugging sync between local JSON and SQL if both exist

## Recommendation right now
For Mission Control today:
- keep JSON as the live source of truth
- add Postgres as an optional secondary structured layer
- only promote SQL to primary once the UI and workflow settle down

This keeps cost and complexity low while still preparing for a stronger backend later.
