/**
 * Everything the app asks of the server, in one place.
 *
 * One module rather than Supabase calls scattered through the screens, for two
 * reasons. The screens should not know what the database looks like — the feed
 * asks for posts, not for a select with three joins — and every function here
 * has to answer the "what if there is no server" question in the same way, so
 * it is answered once at the top of each one rather than remembered fifteen
 * times.
 *
 * ─── The shape of every function ─────────────────────────────────────────────
 *
 * Each returns a `Result`: `{ ok: true, data }` or `{ ok: false, error }`. No
 * throwing. A feed that fails to load is an ordinary Tuesday on a school wifi
 * network, and a thrown error in a render path takes the whole app down over
 * it. `error` is already a sentence a teacher can read.
 *
 * When there is no backend, every call returns `{ ok: false, error: 'offline' }`
 * — a distinct sentinel, so a caller can fall back to local behaviour rather
 * than showing somebody an error about a server that does not exist.
 *
 * ─── What is not here ────────────────────────────────────────────────────────
 *
 * Check-ins and the self-care list. They stay on the phone; there is no table
 * for them and no function here that could send them.
 */

import { photoUrl, supabase } from './backend';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; offline?: true };

/** The one shared early return: this build has no server behind it. */
const OFFLINE = { ok: false as const, error: 'offline', offline: true as const };

/** Supabase's errors are for developers. These are for teachers. */
function readable(error: { message?: string; code?: string } | null): string {
  const message = error?.message ?? '';
  /**
   * Supabase allows one auth email per address per minute and reports the
   * remaining wait. Worth its own sentence: the generic "try again" is the
   * exact wrong instruction here, and someone who follows it just keeps
   * failing until they conclude the app is broken.
   */
  const cooling = message.match(/only request this after (\d+) second/i);
  if (cooling) {
    const seconds = Number(cooling[1]);
    return seconds > 1
      ? `A code was just sent. Wait ${seconds} seconds before asking for another.`
      : 'A code was just sent. Wait a moment before asking for another.';
  }
  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many tries just now. Wait a minute and ask for a new code.';
  }
  if (/duplicate key|already exists/i.test(message)) return 'That is already taken.';
  if (/reserved/i.test(message)) return 'That username is reserved.';
  if (/personal one|school gave you/i.test(message)) {
    return 'Use the address your school gave you, not a personal one.';
  }
  if (/row-level security|violates/i.test(message)) return 'You cannot do that.';
  if (/fetch|network|timeout/i.test(message)) return 'No connection. Try again.';
  return 'Something went wrong. Try again.';
}

// ─── Who you are ─────────────────────────────────────────────────────────────

/**
 * Send a six-digit code to a school address.
 *
 * `shouldCreateUser` is true because this is the same call for signing up and
 * signing back in — Supabase decides which it is by whether the address is
 * already known, which is exactly the distinction the app does not want to make
 * out loud. Telling somebody "no account with that address" at the door is also
 * telling anybody who asks which school addresses have accounts.
 *
 * The consumer-domain rule is enforced in the database by a trigger on
 * auth.users, not here. This checks it too, in lib/verification.ts, but only so
 * the refusal is instant.
 */
export async function sendCode(email: string): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}

/** Exchange the code for a session. After this, `auth.uid()` exists. */
export async function verifyCode(email: string, code: string): Promise<Result<{ userId: string }>> {
  if (!supabase) return OFFLINE;
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.replace(/\D/g, ''),
    type: 'email',
  });
  if (error || !data.user) {
    return { ok: false, error: error ? 'That code did not work. Check it, or send a new one.' : readable(null) };
  }
  return { ok: true, data: { userId: data.user.id } };
}

export async function signOutRemote(): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const { error } = await supabase.auth.signOut();
  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}

/** The signed-in user's id, or null. Cheap — reads the cached session. */
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ─── Your byline ─────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  job: string;
  level: string;
  zip: string;
  state: string;
  years: number | null;
  showJob: boolean;
  showLevel: boolean;
  showState: boolean;
  showYears: boolean;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  job: string;
  level: string;
  zip: string;
  state: string;
  years: number | null;
  show_job: boolean;
  show_level: boolean;
  show_state: boolean;
  show_years: boolean;
};

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name,
  job: r.job,
  level: r.level,
  zip: r.zip,
  state: r.state,
  years: r.years,
  showJob: r.show_job,
  showLevel: r.show_level,
  showState: r.show_state,
  showYears: r.show_years,
});

const PROFILE_COLUMNS =
  'id, username, display_name, job, level, zip, state, years, show_job, show_level, show_state, show_years';

/**
 * Is this username free?
 *
 * A function call rather than a select, because a select against `profiles`
 * would let anyone page through the whole directory of who is on the app. This
 * asks about one name and gets back one boolean.
 *
 * Advisory even so. Two people can be told yes in the same second; the UNIQUE
 * index is what actually decides, at the moment the profile is written.
 *
 * Takes an already-normalized name. Nothing in this module normalizes anything:
 * `normalizeUsername` lives in lib/usernames.ts, which calls into this module,
 * and importing it back would put a cycle between the two. Callers normalize —
 * `checkUsername` and the store both already do — and the citext column is the
 * backstop if one ever forgets.
 */
export async function usernameAvailable(candidate: string): Promise<Result<boolean>> {
  if (!supabase) return OFFLINE;
  const { data, error } = await supabase.rpc('username_available', {
    candidate,
  });
  return error ? { ok: false, error: readable(error) } : { ok: true, data: Boolean(data) };
}

/** Write the byline for the account that just verified. */
export async function createProfile(input: Omit<Profile, 'id'>): Promise<Result<Profile>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'You are not signed in.' };

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: input.username,
      display_name: input.displayName,
      job: input.job,
      level: input.level,
      zip: input.zip,
      state: input.state,
      years: input.years,
      show_job: input.showJob,
      show_level: input.showLevel,
      show_state: input.showState,
      show_years: input.showYears,
    })
    .select(PROFILE_COLUMNS)
    .single();

  return error || !data
    ? { ok: false, error: readable(error) }
    : { ok: true, data: toProfile(data as ProfileRow) };
}

export async function updateProfile(patch: Partial<Omit<Profile, 'id'>>): Promise<Result<Profile>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'You are not signed in.' };

  // Only the keys that were passed, so a patch of one field cannot blank the
  // rest by sending undefined over them.
  const row: Record<string, unknown> = {};
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.job !== undefined) row.job = patch.job;
  if (patch.level !== undefined) row.level = patch.level;
  if (patch.zip !== undefined) row.zip = patch.zip;
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.years !== undefined) row.years = patch.years;
  if (patch.showJob !== undefined) row.show_job = patch.showJob;
  if (patch.showLevel !== undefined) row.show_level = patch.showLevel;
  if (patch.showState !== undefined) row.show_state = patch.showState;
  if (patch.showYears !== undefined) row.show_years = patch.showYears;

  const { data, error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  return error || !data
    ? { ok: false, error: readable(error) }
    : { ok: true, data: toProfile(data as ProfileRow) };
}

export async function getProfile(userId: string): Promise<Result<Profile | null>> {
  if (!supabase) return OFFLINE;
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  return error
    ? { ok: false, error: readable(error) }
    : { ok: true, data: data ? toProfile(data as ProfileRow) : null };
}

// ─── The feed ────────────────────────────────────────────────────────────────

export type Post = {
  id: string;
  author: Profile;
  text: string;
  /** A ready-to-render URL, already built from the stored path. */
  photo: string | null;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  createdAt: number;
  editedAt: number | null;
  /** Whether *you* have liked or reposted it — resolved in the same trip. */
  liked: boolean;
  reposted: boolean;
  mine: boolean;
};

type PostRow = {
  id: string;
  author: string;
  body: string;
  photo_path: string | null;
  like_count: number;
  repost_count: number;
  comment_count: number;
  created_at: string;
  edited_at: string | null;
  profiles: ProfileRow;
};

export type FeedScope = 'everywhere' | 'nearby' | 'following';

/**
 * A page of the feed.
 *
 * Three queries rather than one, and deliberately: the posts, then your likes
 * and your reposts among them. They cannot be joined, because `likes` is
 * readable only by the person who made the row — which is the point of that
 * policy, and the cost of it is this.
 *
 * `nearby` matches on the first three digits of the school ZIP, the same rule
 * lib/zip.ts uses on device. `following` needs your follow list first, so it is
 * the one scope that costs an extra round trip before the posts.
 */
export async function getFeed(options: {
  scope: FeedScope;
  /** Your school ZIP. Only read for the `nearby` scope. */
  zip?: string;
  limit?: number;
  /** ISO timestamp of the oldest post you already have, for the next page. */
  before?: string;
}): Promise<Result<Post[]>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  const limit = options.limit ?? 30;

  let query = supabase
    .from('posts')
    .select(
      `id, author, body, photo_path, like_count, repost_count, comment_count,
       created_at, edited_at, profiles!inner (${PROFILE_COLUMNS})`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.before) query = query.lt('created_at', options.before);

  if (options.scope === 'nearby') {
    const zip3 = (options.zip ?? '').slice(0, 3);
    // No ZIP means no neighbourhood to match, and matching on an empty prefix
    // would quietly return everybody.
    if (zip3.length < 3) return { ok: true, data: [] };
    query = query.like('profiles.zip', `${zip3}%`);
  }

  if (options.scope === 'following') {
    if (!userId) return { ok: true, data: [] };
    const { data: follows, error: followError } = await supabase
      .from('follows')
      .select('followee')
      .eq('follower', userId);
    if (followError) return { ok: false, error: readable(followError) };
    const ids = (follows ?? []).map((f) => f.followee as string);
    if (ids.length === 0) return { ok: true, data: [] };
    query = query.in('author', ids);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: readable(error) };

  const rows = (data ?? []) as unknown as PostRow[];
  const ids = rows.map((r) => r.id);
  const [liked, reposted] = await Promise.all([myMarks('likes', ids), myMarks('reposts', ids)]);

  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      author: toProfile(r.profiles),
      text: r.body,
      photo: photoUrl(r.photo_path),
      likeCount: r.like_count,
      repostCount: r.repost_count,
      commentCount: r.comment_count,
      createdAt: Date.parse(r.created_at),
      editedAt: r.edited_at ? Date.parse(r.edited_at) : null,
      liked: liked.has(r.id),
      reposted: reposted.has(r.id),
      mine: r.author === userId,
    })),
  };
}

/** Which of these posts you have liked (or reposted). Empty when signed out. */
async function myMarks(table: 'likes' | 'reposts', postIds: string[]): Promise<Set<string>> {
  if (!supabase || postIds.length === 0) return new Set();
  const userId = await currentUserId();
  if (!userId) return new Set();
  const { data } = await supabase
    .from(table)
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  return new Set((data ?? []).map((r) => r.post_id as string));
}

/** Everything one person has posted — what the person page draws. */
export async function getPostsBy(authorId: string, limit = 50): Promise<Result<Post[]>> {
  if (!supabase) return OFFLINE;
  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, author, body, photo_path, like_count, repost_count, comment_count,
       created_at, edited_at, profiles!inner (${PROFILE_COLUMNS})`,
    )
    .eq('author', authorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: readable(error) };

  const rows = (data ?? []) as unknown as PostRow[];
  const ids = rows.map((r) => r.id);
  const userId = await currentUserId();
  const [liked, reposted] = await Promise.all([myMarks('likes', ids), myMarks('reposts', ids)]);

  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      author: toProfile(r.profiles),
      text: r.body,
      photo: photoUrl(r.photo_path),
      likeCount: r.like_count,
      repostCount: r.repost_count,
      commentCount: r.comment_count,
      createdAt: Date.parse(r.created_at),
      editedAt: r.edited_at ? Date.parse(r.edited_at) : null,
      liked: liked.has(r.id),
      reposted: reposted.has(r.id),
      mine: r.author === userId,
    })),
  };
}

/**
 * Publish a post, with an optional photo.
 *
 * The photo arrives as the data URI lib/photo.ts produced — already downscaled
 * to 1080px and re-encoded, which is what strips the GPS coordinates a
 * classroom photo carries. It is uploaded into a folder named after the user
 * id, because that is the only place the storage policy lets them write.
 *
 * If the upload fails the post still goes up without it. Losing the sentence
 * because the picture would not send is the wrong trade.
 */
export async function createPost(text: string, photoDataUri?: string | null): Promise<Result<string>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'You are not signed in.' };

  let path: string | null = null;
  if (photoDataUri) path = await uploadPhoto(userId, photoDataUri);

  const { data, error } = await supabase
    .from('posts')
    .insert({ author: userId, body: text.trim().slice(0, 140), photo_path: path })
    .select('id')
    .single();

  return error || !data
    ? { ok: false, error: readable(error) }
    : { ok: true, data: data.id as string };
}

/** Rewrite your own post. The id survives, so its comments stay attached. */
export async function editPost(postId: string, text: string): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const { error } = await supabase
    .from('posts')
    .update({ body: text.trim().slice(0, 140) })
    .eq('id', postId);
  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}

export async function deletePost(postId: string): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}

/**
 * Data URI in, storage path out, or null if it could not be sent.
 *
 * Decoded to bytes rather than posted as a base64 string: Supabase storage
 * wants the file, and sending the base64 text would put a third more bytes on a
 * school wifi connection for no reason.
 */
async function uploadPhoto(userId: string, dataUri: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const comma = dataUri.indexOf(',');
    if (comma < 0) return null;
    const binary = globalThis.atob(dataUri.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const path = `${userId}/${globalThis.crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from('post-photos')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    return error ? null : path;
  } catch {
    return null;
  }
}

// ─── Reacting ────────────────────────────────────────────────────────────────

/**
 * Like and unlike, repost and un-repost.
 *
 * The count on the post is moved by a database trigger rather than by the app,
 * so two people tapping at once cannot both read 17 and both write 18.
 */
export async function setLiked(postId: string, on: boolean): Promise<Result<null>> {
  return setMark('likes', postId, on);
}

export async function setReposted(postId: string, on: boolean): Promise<Result<null>> {
  return setMark('reposts', postId, on);
}

async function setMark(
  table: 'likes' | 'reposts',
  postId: string,
  on: boolean,
): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'You are not signed in.' };

  const { error } = on
    ? // Tapping twice quickly must not be an error, so an existing row is left
      // alone rather than treated as a conflict.
      await supabase.from(table).upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' })
    : await supabase.from(table).delete().eq('post_id', postId).eq('user_id', userId);

  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}

// ─── Comments ────────────────────────────────────────────────────────────────

export type PostComment = {
  id: string;
  author: Profile;
  text: string;
  createdAt: number;
  mine: boolean;
};

export async function getComments(postId: string): Promise<Result<PostComment[]>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('comments')
    .select(`id, author, body, created_at, profiles!inner (${PROFILE_COLUMNS})`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error: readable(error) };

  return {
    ok: true,
    data: ((data ?? []) as unknown as {
      id: string;
      author: string;
      body: string;
      created_at: string;
      profiles: ProfileRow;
    }[]).map((r) => ({
      id: r.id,
      author: toProfile(r.profiles),
      text: r.body,
      createdAt: Date.parse(r.created_at),
      mine: r.author === userId,
    })),
  };
}

export async function addComment(postId: string, text: string): Promise<Result<string>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'You are not signed in.' };
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author: userId, body: text.trim().slice(0, 280) })
    .select('id')
    .single();
  return error || !data
    ? { ok: false, error: readable(error) }
    : { ok: true, data: data.id as string };
}

export async function deleteComment(commentId: string): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}

// ─── Following, blocking, reporting ──────────────────────────────────────────

export async function setFollowing(authorId: string, on: boolean): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'You are not signed in.' };
  const { error } = on
    ? await supabase.from('follows').upsert({ follower: userId, followee: authorId }, { onConflict: 'follower,followee' })
    : await supabase.from('follows').delete().eq('follower', userId).eq('followee', authorId);
  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}

export async function getFollowing(): Promise<Result<string[]>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: true, data: [] };
  const { data, error } = await supabase.from('follows').select('followee').eq('follower', userId);
  return error
    ? { ok: false, error: readable(error) }
    : { ok: true, data: (data ?? []).map((r) => r.followee as string) };
}

/**
 * Block an account.
 *
 * Enforced in the posts and comments policies in both directions: their writing
 * disappears from your feed, and yours from theirs. Neither of you is told.
 */
export async function setBlocked(authorId: string, on: boolean): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'You are not signed in.' };
  const { error } = on
    ? await supabase.from('blocks').upsert({ blocker: userId, blocked: authorId }, { onConflict: 'blocker,blocked' })
    : await supabase.from('blocks').delete().eq('blocker', userId).eq('blocked', authorId);
  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}

export async function getBlocked(): Promise<Result<string[]>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: true, data: [] };
  const { data, error } = await supabase.from('blocks').select('blocked').eq('blocker', userId);
  return error
    ? { ok: false, error: readable(error) }
    : { ok: true, data: (data ?? []).map((r) => r.blocked as string) };
}

/**
 * Report a post or a comment.
 *
 * Filing one hides the thing from the reporter immediately — that is the
 * reports clause in the read policy, not a separate action — and puts it in the
 * queue at `moderation_queue` for a human. Apple's guideline 1.2 wants that
 * human to have acted within 24 hours.
 */
export async function report(
  target: { postId: string } | { commentId: string },
  reason: string,
): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'You are not signed in.' };
  const { error } = await supabase.from('reports').insert({
    reporter: userId,
    post_id: 'postId' in target ? target.postId : null,
    comment_id: 'commentId' in target ? target.commentId : null,
    reason: reason.slice(0, 500),
  });
  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}

/**
 * Delete the account on the server — guideline 5.1.1(v).
 *
 * The posts, comments, follows and photos go with it. The check-in record was
 * never here; the app erases its own copy separately.
 */
export async function deleteAccountRemote(): Promise<Result<null>> {
  if (!supabase) return OFFLINE;
  const { error } = await supabase.rpc('delete_my_account');
  return error ? { ok: false, error: readable(error) } : { ok: true, data: null };
}
