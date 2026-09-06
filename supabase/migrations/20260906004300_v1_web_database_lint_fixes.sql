alter function public.set_updated_at() set search_path = pg_catalog;

create index if not exists messages_conversation_user_idx
on public.messages (conversation_id, user_id);

create index if not exists sources_conversation_user_idx
on public.sources (conversation_id, user_id);

create index if not exists runs_conversation_user_idx
on public.runs (conversation_id, user_id);

create index if not exists runs_assistant_message_user_idx
on public.runs (assistant_message_id, user_id)
where assistant_message_id is not null;

create index if not exists web_consents_conversation_user_idx
on public.web_consents (conversation_id, user_id);

create index if not exists web_consents_run_user_idx
on public.web_consents (run_id, user_id);

create index if not exists message_sources_message_user_idx
on public.message_sources (message_id, user_id);

create index if not exists message_sources_source_user_idx
on public.message_sources (source_id, user_id);
