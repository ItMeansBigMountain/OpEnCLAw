# Token Cost Analysis

## Scope
This is a practical cost analysis for API-token-consuming features around Mission Control, memory, agents, and future cloud portability.

## Main token cost drivers
1. Direct chat with the main agent
2. Sub-agent spawning for research, writing, planning, and audits
3. Re-loading large context files repeatedly
4. Future semantic memory embedding calls
5. External model usage for specialist agents like Herald

## Current Mission Control app itself
The HTML dashboard and local Node server do not inherently consume model tokens.
They consume tokens only when they are paired with AI actions, such as:
- agent conversations
- audit runs
- summarization
- memory curation
- external API-backed analysis

## Approximate cost pattern
### Low token cost
- local UI rendering
- local JSON storage
- local git log display
- local cron visibility
- local Postgres used only as a database

### Medium token cost
- concise daily summaries
- short specialist agent runs
- incremental memory updates

### High token cost
- loading many markdown files repeatedly
- large-context conversations without caching
- repeated full-site SEO audits
- semantic memory embeddings across many files
- multi-agent chains on expensive providers

## Biggest avoidable waste
- re-reading large context on every run
- using expensive models for routine grunt work
- repeatedly analyzing unchanged material
- storing memory through LLM summaries when raw structured notes would do

## Cost-control recommendations
- keep structured local state in JSON/Postgres first
- only use model calls when reasoning or synthesis is actually needed
- cache or reuse stable context where possible
- use specialist agents selectively, not continuously
- keep developer diaries and project logs local so persistence does not require tokens

## Herald-specific note
Herald can become expensive if used for repeated full audits on large sites.
Cheaper pattern:
- one full audit baseline
- targeted follow-up audits on changed pages/issues only
- store prior findings locally in Mission Control

## Portability note
For a future cloud machine, token cost and infrastructure cost are separate:
- infrastructure cost = VPS, storage, DB, uptime
- token cost = model/API usage

The dashboard can be made portable without increasing token cost much, as long as persistence stays primarily local/structured instead of repeatedly model-generated.
