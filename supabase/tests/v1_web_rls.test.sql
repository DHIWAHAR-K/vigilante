begin;

select plan(7);

select tests.rls_enabled('public', 'profiles');
select tests.rls_enabled('public', 'conversations');
select tests.rls_enabled('public', 'messages');
select tests.rls_enabled('public', 'sources');
select tests.rls_enabled('public', 'runs');
select tests.rls_enabled('public', 'web_consents');
select tests.rls_enabled('public', 'message_sources');

select * from finish();

rollback;
