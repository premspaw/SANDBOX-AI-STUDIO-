create table if not exists marketing_templates (
  id          text primary key,
  name        text not null,
  image_url   text not null,
  prompt      text not null,
  aspect      text not null default '16/9',
  category    text not null default 'other',
  user_id     text not null default 'user_sandbox',
  created_at  timestamptz not null default now()
);

alter table marketing_templates enable row level security;

create policy "Allow all for sandbox" on marketing_templates
  for all using (true) with check (true);
