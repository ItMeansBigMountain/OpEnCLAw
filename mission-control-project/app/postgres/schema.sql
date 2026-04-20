-- Mission Control starter schema

create table if not exists mc_events (
  id text primary key,
  category text not null,
  title text not null,
  detail text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists mc_git_log (
  id text primary key,
  commit_hash text not null,
  short_hash text not null,
  subject text not null,
  author_name text,
  committed_at timestamptz not null,
  pushed boolean not null default false,
  remote_name text,
  branch_name text
);

create table if not exists mc_cron_jobs (
  id text primary key,
  name text not null,
  schedule text not null,
  status text not null,
  last_run_at timestamptz,
  next_run_at timestamptz,
  notes text
);

create table if not exists mc_memory_chunks (
  id text primary key,
  label text,
  source_file text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists mc_events_created_at_idx on mc_events (created_at desc);
create index if not exists mc_git_log_committed_at_idx on mc_git_log (committed_at desc);
create index if not exists mc_cron_jobs_next_run_at_idx on mc_cron_jobs (next_run_at asc);
