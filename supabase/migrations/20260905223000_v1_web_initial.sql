create extension if not exists pgcrypto with schema extensions;

create type public.message_role as enum ('user', 'assistant', 'system');
create type public.message_status as enum ('running', 'complete', 'stopped', 'error');
create type public.run_mode as enum ('local', 'web');
create type public.run_status as enum ('queued', 'running', 'complete', 'stopped', 'error');

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  draft text not null default '',
  web_enabled boolean not null default false,
  selected_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint conversations_title_not_blank check (length(btrim(title)) > 0),
  constraint conversations_title_length check (char_length(title) <= 140)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.message_role not null,
  status public.message_status not null default 'complete',
  position integer not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (conversation_id, position),
  foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete cascade,
  constraint messages_position_nonnegative check (position >= 0)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  title text not null,
  source_type text not null,
  locator text,
  excerpt text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete cascade,
  constraint sources_title_not_blank check (length(btrim(title)) > 0),
  constraint sources_type_not_blank check (length(btrim(source_type)) > 0)
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  assistant_message_id uuid,
  mode public.run_mode not null,
  status public.run_status not null default 'queued',
  submitted_query text not null,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id),
  foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete cascade,
  foreign key (assistant_message_id, user_id)
    references public.messages (id, user_id)
    on delete cascade,
  constraint runs_query_not_blank check (length(btrim(submitted_query)) > 0)
);

create table public.web_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  run_id uuid not null,
  query text not null,
  destination text not null,
  included_data text not null,
  created_at timestamptz not null default now(),
  unique (run_id),
  foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete cascade,
  foreign key (run_id, user_id)
    references public.runs (id, user_id)
    on delete cascade,
  constraint web_consents_query_not_blank check (length(btrim(query)) > 0),
  constraint web_consents_destination_not_blank check (length(btrim(destination)) > 0),
  constraint web_consents_included_data_not_blank check (length(btrim(included_data)) > 0)
);

create table public.message_sources (
  message_id uuid not null,
  source_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  citation_label integer not null,
  quote text,
  created_at timestamptz not null default now(),
  primary key (message_id, source_id),
  foreign key (message_id, user_id)
    references public.messages (id, user_id)
    on delete cascade,
  foreign key (source_id, user_id)
    references public.sources (id, user_id)
    on delete cascade,
  constraint message_sources_citation_positive check (citation_label > 0)
);

create index profiles_updated_at_idx on public.profiles (updated_at desc);
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
create index messages_user_conversation_position_idx on public.messages (user_id, conversation_id, position);
create index sources_user_conversation_idx on public.sources (user_id, conversation_id);
create index runs_user_conversation_created_idx on public.runs (user_id, conversation_id, created_at desc);
create index web_consents_user_run_idx on public.web_consents (user_id, run_id);
create index message_sources_user_source_idx on public.message_sources (user_id, source_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger messages_set_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create trigger sources_set_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.sources enable row level security;
alter table public.runs enable row level security;
alter table public.web_consents enable row level security;
alter table public.message_sources enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke all on table public.sources from anon, authenticated;
revoke all on table public.runs from anon, authenticated;
revoke all on table public.web_consents from anon, authenticated;
revoke all on table public.message_sources from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.conversations to authenticated;
grant select, insert, update, delete on table public.messages to authenticated;
grant select, insert, update, delete on table public.sources to authenticated;
grant select, insert, update on table public.runs to authenticated;
grant select, insert on table public.web_consents to authenticated;
grant select, insert, delete on table public.message_sources to authenticated;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can delete their own profile"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

create policy "Users can view their own conversations"
on public.conversations for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own conversations"
on public.conversations for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own conversations"
on public.conversations for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own conversations"
on public.conversations for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own messages"
on public.messages for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own messages"
on public.messages for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own messages"
on public.messages for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own messages"
on public.messages for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own sources"
on public.sources for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own sources"
on public.sources for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own sources"
on public.sources for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own sources"
on public.sources for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own runs"
on public.runs for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own runs"
on public.runs for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own runs"
on public.runs for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can view their own web consents"
on public.web_consents for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own web consents"
on public.web_consents for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can view their own message sources"
on public.message_sources for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own message sources"
on public.message_sources for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own message sources"
on public.message_sources for delete
to authenticated
using ((select auth.uid()) = user_id);
