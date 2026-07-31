/**
 * Messages.
 *
 * The feed deliberately has no replies — a reaction is the whole vocabulary, so
 * a post cannot turn into an argument under itself. Direct messages are the
 * pressure valve that makes that rule survivable: the thing people actually want
 * after reading "I leave at 4:30" is to ask one person how they manage it, not to
 * hold that conversation in public where their principal can read it.
 *
 * Which means the guardrail moves rather than disappears, and it has to move
 * with teeth:
 *
 *   - A thread can be reported and the other person blocked from inside the
 *     thread, on the same flag and the same reason list as a post. Apple asks for
 *     this specifically once an app carries private messages, and a report
 *     control that only exists in the feed does not count.
 *   - Blocking removes the thread, not just the posts. A blocked account cannot
 *     be read here and cannot be written to.
 *   - Nothing derived from the check-in record is visible to the other side. No
 *     mood, no streak, no "they had a rough week" — the record stays on the
 *     phone, and a message thread is exactly where that would leak.
 *
 * Their side of each thread is sample content (data/mock.ts). Everything the
 * teacher sends is real and persisted, so the composer, the ordering and the
 * unread state all behave the way they will against a server.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { useSheets } from '../components/Sheet';
import { Body, Display, MonoLabel } from '../components/ui';
import { AUTHORS, CONVERSATIONS, FeedAuthor } from '../data/mock';
import { timeAgoLabel } from '../lib/dates';
import { Message, useStore } from '../store';
import { color, radius } from '../theme';

/** Longer than a post, shorter than an essay. */
const MESSAGE_MAX_LENGTH = 600;

/** A thread as the screen needs it: who, every message in order, unread state. */
type Thread = {
  author: FeedAuthor;
  messages: Message[];
  unread: boolean;
};

/**
 * Sample messages carry an age rather than a timestamp, so they stay plausible
 * however long after they were written the app is opened. Resolved against the
 * clock here, then merged with what the teacher actually sent.
 */
function buildThreads(
  sent: Record<string, Message[]>,
  readThreads: string[],
  blocked: string[],
  now: number,
): Thread[] {
  // Every account there is anything to show for: the sample threads, plus
  // anyone the teacher has written to first. A thread started from the feed has
  // no incoming side at all, and leaving those out would lose the message.
  const ids = Array.from(
    new Set([...CONVERSATIONS.map((c) => c.authorId), ...Object.keys(sent)]),
  ).filter((id) => !blocked.includes(id));

  return ids
    .map((id) => {
      const author = AUTHORS[id];
      const sample = CONVERSATIONS.find((c) => c.authorId === id);
      const theirs: Message[] = (sample?.messages ?? []).map((m, i) => ({
        id: `${id}-s${i}`,
        mine: m.from === 'me',
        text: m.text,
        at: now - m.minutesAgo * 60_000,
      }));
      const messages = [...theirs, ...(sent[id] ?? [])].sort((a, b) => a.at - b.at);
      // Unread is about the last message, not the thread's history: if the
      // teacher has answered since, there is nothing waiting on them, and a
      // thread they started themselves never carries a badge at all.
      const last = messages[messages.length - 1];
      const unread = !!last && !last.mine && !readThreads.includes(id);
      return { author, messages, unread };
    })
    .filter((t) => !!t.author && t.messages.length > 0)
    // Most recent thread first, which is the only order an inbox can have.
    .sort((a, b) => b.messages[b.messages.length - 1].at - a.messages[a.messages.length - 1].at);
}

/**
 * What the tab bar's badge counts. Built from the same threads the inbox draws,
 * so the number on the icon and the dots in the list cannot disagree.
 */
export function unreadThreadCount(
  sent: Record<string, Message[]>,
  readThreads: string[],
  blocked: string[],
): number {
  return buildThreads(sent, readThreads, blocked, Date.now()).filter((t) => t.unread).length;
}

export function MessagesScreen({
  initialThread,
  resetAt = 0,
}: {
  initialThread?: string | null;
  /** Changes when the messages tab is pressed. Closes any open thread. */
  resetAt?: number;
}) {
  const { messages, readThreads, blocked, sendMessage, markThreadRead } = useStore();
  const [openId, setOpenId] = useState<string | null>(initialThread ?? null);

  const firstReset = useRef(resetAt);
  useEffect(() => {
    // Not on mount: arriving on this tab and arriving in a thread are the same
    // press, and resetting here would close the thread the press just opened.
    if (resetAt === firstReset.current) return;
    setOpenId(null);
  }, [resetAt]);

  // Arriving from a post opens that thread rather than the inbox — the intent
  // was "message this person", and an inbox in between is a step backwards.
  useEffect(() => {
    if (!initialThread) return;
    setOpenId(initialThread);
    markThreadRead(initialThread);
    // markThreadRead is stable for the life of the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThread]);

  // One clock reading per render pass, so every relative label in the list is
  // measured against the same moment.
  const threads = useMemo(
    () => buildThreads(messages, readThreads, blocked, Date.now()),
    [messages, readThreads, blocked],
  );

  // A thread opened from a post may not exist yet — nobody has written anything
  // in it. That is still a conversation you are in, so it opens empty rather than
  // bouncing to the inbox, and it only joins the list once there is a message.
  const author = openId ? AUTHORS[openId] : undefined;
  const open =
    threads.find((t) => t.author.id === openId) ??
    (author && !blocked.includes(author.id)
      ? { author, messages: [], unread: false }
      : undefined);

  if (open) {
    return (
      <Conversation
        thread={open}
        onBack={() => setOpenId(null)}
        onSend={(text) => sendMessage(open.author.id, text)}
      />
    );
  }

  return (
    <Inbox
      threads={threads}
      onOpen={(id) => {
        setOpenId(id);
        markThreadRead(id);
      }}
    />
  );
}

function Inbox({
  threads,
  onOpen,
}: {
  threads: Thread[];
  onOpen: (authorId: string) => void;
}) {
  return (
    <View>
      <Display size={32}>Messages</Display>
      <Body size={13} tone={color.muted} style={{ marginTop: 8 }}>
        Private, and only with people you can see in the feed. Nothing from your check-ins is
        visible here.
      </Body>

      {threads.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySub}>
            When someone messages you about a post, it lands here. To start one, follow someone in
            the feed and tap the arrow on their post.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {threads.map((t) => {
            const last = t.messages[t.messages.length - 1];
            return (
              <Pressable
                key={t.author.id}
                onPress={() => onOpen(t.author.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open your conversation with ${t.author.displayName}${
                  t.unread ? ', unread' : ''
                }`}
                style={styles.row}
              >
                <Avatar name={t.author.displayName} seed={t.author.username} size={44} />
                <View style={styles.rowBody}>
                  <View style={styles.rowHead}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {t.author.displayName}
                    </Text>
                    <Text style={styles.rowTime}>{timeAgoLabel(last.at)}</Text>
                  </View>
                  <Text
                    style={[styles.rowSnippet, t.unread && styles.rowSnippetUnread]}
                    numberOfLines={2}
                  >
                    {last.mine ? `You: ${last.text}` : last.text}
                  </Text>
                </View>
                {t.unread && <View style={styles.unreadDot} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Conversation({
  thread,
  onBack,
  onSend,
}: {
  thread: Thread;
  onBack: () => void;
  onSend: (text: string) => void;
}) {
  const { open } = useSheets();
  const [draft, setDraft] = useState('');

  const send = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <View>
      <View style={styles.threadHead}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to messages"
          hitSlop={12}
          style={styles.back}
        >
          <Icon name="back" size={22} tone={color.ink} />
        </Pressable>

        <Avatar name={thread.author.displayName} seed={thread.author.username} size={34} />
        <View style={styles.threadWho}>
          <Text style={styles.threadName} numberOfLines={1}>
            {thread.author.displayName}
          </Text>
          {/* Handle and job only. The full byline wrapped to two lines here and
              pushed the header taller than the first message. */}
          <MonoLabel size={9} em={0.08} tone={color.faint}>
            {[`@${thread.author.username}`, thread.author.job].filter(Boolean).join(' · ')}
          </MonoLabel>
        </View>

        {/* The same flag as a feed post, for the same reason and on the same
            reason list. A private thread is the likelier place for unwanted
            contact, so this cannot be the one screen without it. */}
        <Pressable
          onPress={() =>
            open('report', {
              updateId: `dm:${thread.author.id}`,
              authorId: thread.author.id,
              kind: 'message',
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Report or block @${thread.author.username}`}
          hitSlop={12}
        >
          <Icon name="flag" size={19} tone={color.faint} />
        </Pressable>
      </View>

      <View style={styles.bubbles}>
        {thread.messages.length === 0 && (
          <Text style={styles.threadEmpty}>
            Nothing here yet. They will see your name and your handle, and nothing from your
            check-ins.
          </Text>
        )}
        {thread.messages.map((m) => (
          <View key={m.id} style={[styles.bubbleRow, m.mine && styles.bubbleRowMine]}>
            <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.bubbleText, m.mine && styles.bubbleTextMine]}>{m.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={(t) => setDraft(t.slice(0, MESSAGE_MAX_LENGTH))}
          placeholder={`Message ${thread.author.displayName}`}
          placeholderTextColor={color.faint}
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          accessibilityLabel={`Write a message to ${thread.author.displayName}`}
          style={styles.input}
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={[styles.send, { opacity: draft.trim() ? 1 : 0.35 }]}
        >
          <Icon name="send" size={18} tone="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
  rowTime: {
    fontSize: 11.5,
    color: color.faint,
  },
  rowSnippet: {
    fontSize: 13.5,
    lineHeight: 19,
    color: color.muted,
  },
  rowSnippetUnread: {
    color: color.ink,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: color.accent,
  },
  empty: {
    marginTop: 24,
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.outline,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
  emptySub: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.muted,
    marginTop: 4,
  },
  threadHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  back: {
    marginLeft: -6,
  },
  threadWho: {
    flex: 1,
    gap: 2,
  },
  threadName: {
    fontSize: 15.5,
    fontWeight: '600',
    color: color.ink,
  },
  bubbles: {
    marginTop: 18,
    gap: 10,
  },
  threadEmpty: {
    fontSize: 13,
    lineHeight: 20,
    color: color.faint,
    paddingVertical: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
  },
  bubbleTheirs: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.hairline,
    borderBottomLeftRadius: 6,
  },
  bubbleMine: {
    backgroundColor: color.ink,
    borderBottomRightRadius: 6,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 21,
    color: color.ink,
  },
  bubbleTextMine: {
    color: '#fff',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 130,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
    fontSize: 14.5,
    lineHeight: 20,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 99,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
