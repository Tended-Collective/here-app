-- Two teachers and a moderator's-eye view of some content.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@k12.dc.gov'),
  ('22222222-2222-2222-2222-222222222222', 'bob@lausd.net'),
  ('33333333-3333-3333-3333-333333333333', 'carol@houstonisd.org');

insert into public.profiles (id, username, display_name, zip, state) values
  ('11111111-1111-1111-1111-111111111111', 'alice', 'Alice A', '20002', 'DC'),
  ('22222222-2222-2222-2222-222222222222', 'bob', 'Bob B', '94110', 'CA'),
  ('33333333-3333-3333-3333-333333333333', 'carol', 'Carol C', '77002', 'TX');

insert into public.posts (id, author, body) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alice left at 4:30.'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Bob ate lunch outside.'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Carol said no to cover.');

-- Bob quietly likes Alice's post. Carol follows Alice. Alice blocked Carol.
insert into public.likes (post_id, user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');
insert into public.follows (follower, followee) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');
insert into public.blocks (blocker, blocked) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');
insert into public.reports (reporter, post_id, reason) values
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000003', 'names a student');
