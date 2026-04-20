# Mission Control Postgres Scaffold

This folder keeps the Mission Control PostgreSQL setup inside the project directory, per your preference.

## Purpose
Use PostgreSQL as an optional structured data layer for Mission Control features like:
- semantic memory
- git event history
- cron/job history
- project records
- audit logs

## Current status
This is scaffolded only. No database service is installed or started yet.

## Files
- `schema.sql` - starter schema for Mission Control tables
- `docker-compose.yml` - optional local Postgres container
- `cost-notes.md` - rough cost and complexity notes

## Quick options
### Option A: Local Docker Postgres
- Lowest direct software cost if Docker is already installed
- Good for local development and phone-visible Mission Control demos

### Option B: Native local Postgres install
- No container dependency
- More machine-specific setup

## Data location
If using Docker Compose, database files persist under:
- `./data/`

This keeps the DB contents under the project directory.
