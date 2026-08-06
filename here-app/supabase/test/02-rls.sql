\set ALICE '11111111-1111-1111-1111-111111111111'
\set CAROL '33333333-3333-3333-3333-333333333333'
\pset tuples_only on
\pset format unaligned

-- Everything below runs as Alice, exactly as the app's key would.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  select 'moderation queue hidden from the app  : ' ||
    case when has_table_privilege('authenticated','public.moderation_queue','SELECT')
         then 'FAIL - readable' else 'pass' end;

  select 'hide_post not callable by a teacher   : ' ||
    case when has_function_privilege('authenticated','public.hide_post(uuid,text)','EXECUTE')
         then 'FAIL - callable' else 'pass' end;

  select 'hide_post not callable anonymously    : ' ||
    case when has_function_privilege('anon','public.hide_post(uuid,text)','EXECUTE')
         then 'FAIL - callable' else 'pass' end;

  select 'reports unreadable, even her own      : ' ||
    case when (select count(*) from public.reports) = 0 then 'pass' else 'FAIL' end;

  select 'cannot see who liked a post           : ' ||
    case when (select count(*) from public.likes) = 0 then 'pass'
         else 'FAIL - sees ' || (select count(*) from public.likes) end;

  select 'but the like COUNT is visible         : ' ||
    case when (select like_count from public.posts
               where id='aaaaaaaa-0000-0000-0000-000000000001') = 1 then 'pass' else 'FAIL' end;

  select 'cannot see who follows her            : ' ||
    case when (select count(*) from public.follows) = 0 then 'pass' else 'FAIL' end;

  select 'the feed is readable                  : ' ||
    case when (select count(*) from public.posts) >= 2 then 'pass'
         else 'FAIL - sees ' || (select count(*) from public.posts) end;

  select 'a blocked person''s post is hidden     : ' ||
    case when not exists (select 1 from public.posts
                          where author='33333333-3333-3333-3333-333333333333')
         then 'pass' else 'FAIL - Carol visible' end;

  select 'bylines are readable                  : ' ||
    case when (select count(*) from public.profiles) = 3 then 'pass' else 'FAIL' end;
rollback;

-- Can Alice tamper with Bob's post?
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  update public.posts set body='hacked' where id='aaaaaaaa-0000-0000-0000-000000000002';
  select 'cannot edit someone else''s post       : ' ||
    case when (select body from public.posts where id='aaaaaaaa-0000-0000-0000-000000000002')
              = 'Bob ate lunch outside.' then 'pass' else 'FAIL - changed' end;
  delete from public.posts where id='aaaaaaaa-0000-0000-0000-000000000002';
  select 'cannot delete someone else''s post     : ' ||
    case when exists (select 1 from public.posts where id='aaaaaaaa-0000-0000-0000-000000000002')
         then 'pass' else 'FAIL - deleted' end;
rollback;

-- Can Alice post as Bob?
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  savepoint s;
  insert into public.posts (author, body)
    values ('22222222-2222-2222-2222-222222222222', 'forged');
  select 'IMPERSONATION NOT BLOCKED - FAIL';
  rollback to s;
  select 'cannot post as another teacher        : pass';
rollback;

-- Carol blocked Alice's side too: does the block cut both ways?
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  select 'block works in both directions        : ' ||
    case when not exists (select 1 from public.posts
                          where author='11111111-1111-1111-1111-111111111111')
         then 'pass' else 'FAIL - Carol still sees Alice' end;
rollback;
