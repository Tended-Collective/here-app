/**
 * The teacher's own page: their trends and their list, and nothing else.
 *
 * Setup used to sit here — display name, username, role, ZIP, blocked accounts,
 * account deletion — between the teacher and the two things they open this tab
 * to look at. A page about their own week opened on a form about their identity.
 * All of it moved to Settings, which is configured once and then left alone.
 *
 * The list is the app's only to-do. Items arrive two ways — typed here, or
 * saved off someone else's post in the feed — and there is no distinction
 * between the two once they land, because a boundary someone else holds is
 * just a line on your list once you have taken it.
 *
 * Ticking is per day and writes on the tap. The grid is a week-shaped window
 * onto that: ticks are stored against dates, so nothing resets on Monday — the
 * view moves on. The card names the week it is showing for exactly that reason,
 * because a fresh row of empty boxes otherwise reads as data that was thrown
 * away.
 *
 * Nothing on this list is ever "completed", and that is deliberate.
 *
 * The obvious thing to build is a streak, or a 21-day target with a ring that
 * fills. Both are wrong here. The 21 days is a myth — it comes from a 1960s
 * surgeon's note about how long patients took to get used to their own face, not
 * from any study of habits; the actual research (Lally, 2010) found a median of
 * about 66 days and a spread from 18 to 254, so a single number would be wrong
 * for almost everybody. And a streak breaks. This app exists for the weeks that
 * go badly, and a teacher who holds a boundary for nine days, has a week from
 * hell, and comes back has not failed at anything. An app that shows them a
 * snapped chain is telling them they have.
 *
 * So an item is never finished and never broken. What it has instead is a count:
 * how many days in total, since when, and — on Here+ — how many days in each of
 * the last six weeks, printed on the strip rather than summarised as a verdict.
 *
 * There used to be a verdict. An item kept in four of six weeks earned a
 * STICKING badge. It has been taken out: the badge was the app telling a teacher
 * whether their own week counted, which is not its call to make, and the numbers
 * underneath it were already the honest version.
 *
 * Free shows this week and the lifetime count. Here+ adds the six-week strip.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { useSheets } from '../components/Sheet';
import { Body, Card, Display, MonoLabel } from '../components/ui';
import { FREE_LIST_LIMIT, yearsLabel } from '../data/mock';
import {
  ISODate,
  WEEKDAY_INITIALS,
  shortDateLabel,
  weekDates,
  weekRangeLabel,
  weekStarts,
  weekdayIndex,
} from '../lib/dates';
import { useToday } from '../lib/useToday';
import { useStore } from '../store';
import { color, radius } from '../theme';
import { RecordScreen } from './RecordScreen';

const DAY_COL = 22;

/** Weeks in the strip. */
const STRIP_WEEKS = 6;

/**
 * One item's history, reduced to the three things worth saying about it.
 *
 * `weeks` counts days kept per week, oldest first, and includes the empty ones —
 * a week with nothing in it is the most informative bar on the strip, so the
 * series is built from the last six Mondays rather than from whichever dates
 * happen to have ticks.
 *
 * There was a fourth thing here: a STICKING verdict, true once an item survived
 * four of the six weeks. It is gone. The word was doing the work of a judgement
 * the app has no business making — the counts below are what happened, and the
 * teacher can read them.
 */
function history(done: ISODate[], today: ISODate) {
  const ticked = new Set(done);
  const weeks = weekStarts(STRIP_WEEKS, new Date(`${today}T12:00:00`)).map((start) => ({
    start,
    days: weekDates(new Date(`${start}T12:00:00`)).filter((d) => ticked.has(d)).length,
  }));
  const active = weeks.filter((w) => w.days > 0).length;
  return { weeks, active, total: done.length };
}

export function ProfileScreen({
  onEditProfile,
  onOpenPosts,
}: {
  onEditProfile?: () => void;
  /** Opens this teacher's own page — everything they have posted, in one list. */
  onOpenPosts?: () => void;
}) {
  const {
    practices,
    practiceDays,
    togglePracticeDay,
    addPractice,
    removePractice,
    renamePractice,
    entries,
    account,
    following,
    listFull,
    plusActive,
  } = useStore();
  const { open } = useSheets();

  // Derived from a date that updates when the day flips, not captured once on
  // mount — the grid used to freeze on whichever week the screen was opened in.
  const today = useToday();
  const week = useMemo(() => weekDates(new Date(`${today}T12:00:00`)), [today]);
  const todayIdx = useMemo(() => weekdayIndex(new Date(`${today}T12:00:00`)), [today]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const shown = account?.shown;
  const bylinePreview = [
    shown?.showJob && shown.job,
    shown?.showLevel && shown.level,
    shown?.showState && shown.state.trim(),
    shown?.showYears ? yearsLabel(shown.years) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const checkIns = Object.keys(entries).length;
  const keptThisWeek = practices.reduce(
    (sum, p) => sum + week.filter((d, i) => i <= todayIdx && (practiceDays[p.id] ?? []).includes(d)).length,
    0,
  );

  const add = () => {
    if (!draft.trim()) return;
    addPractice(draft);
    setDraft('');
  };

  const commitEdit = (id: string) => {
    if (editText.trim()) renamePractice(id, editText);
    setEditing(null);
  };

  return (
    <View>
      {/* Name left, avatar right, handle underneath — the Threads header, which
          puts the name at display size instead of spending the top of the page
          on a label saying which tab you are on. */}
      <View style={styles.head}>
        <View style={styles.headText}>
          <Display size={30} lineHeight={1.1}>
            {shown?.displayName || account?.name || 'Your account'}
          </Display>
          <Body size={13} tone={color.muted} style={{ marginTop: 6 }}>
            {shown?.username ? `@${shown.username}` : 'No username yet'}
            {bylinePreview ? ` · ${bylinePreview}` : ''}
          </Body>
        </View>
        <Avatar
          name={shown?.displayName || account?.name || '?'}
          seed={shown?.username || account?.name || 'you'}
          size={56}
        />
      </View>

      <View style={styles.tally}>
        <Stat value={String(checkIns)} label={checkIns === 1 ? 'CHECK-IN' : 'CHECK-INS'} />
        <Stat value={String(following.length)} label="FOLLOWING" />
        <Stat value={String(keptThisWeek)} label="DONE THIS WEEK" />
      </View>

      {/* Two buttons: change how you appear, or read back what you have
          actually said. Sharing a profile is still not one of them — there is
          nowhere to share it to, and a button that does nothing is worse than
          a gap. */}
      <View style={styles.editRow}>
        {onEditProfile && (
          <Pressable
            onPress={onEditProfile}
            accessibilityRole="button"
            accessibilityLabel="Edit your profile in Settings"
            style={styles.edit}
          >
            <Text style={styles.editLabel}>Edit profile</Text>
          </Pressable>
        )}
        {onOpenPosts && (
          <Pressable
            onPress={onOpenPosts}
            accessibilityRole="button"
            accessibilityLabel="See everything you have posted"
            style={styles.edit}
          >
            <Text style={styles.editLabel}>My posts</Text>
          </Pressable>
        )}
      </View>

      {/* The week chart, the insight and the Here+ lock. */}
      <View style={{ marginTop: 26 }}>
        <RecordScreen />
      </View>

      <View style={styles.listHead}>
        <MonoLabel>MY SELF-CARE LIST</MonoLabel>
        <MonoLabel em={0} tone={listFull ? color.accent : color.faint}>
          {plusActive ? `${practices.length} · HERE+` : `${practices.length} OF ${FREE_LIST_LIMIT}`}
        </MonoLabel>
      </View>
      <Card style={styles.listCard}>
        {/* Naming the week answers the question the grid otherwise raises: it
            looks like it resets, and it does not. Ticks are stored against
            dates; this is a window onto one week of them. */}
        <View style={styles.weekHead}>
          <MonoLabel size={9} em={0.1} tone={color.faint}>
            THIS WEEK
          </MonoLabel>
          <MonoLabel size={9} em={0.06} tone={color.fainter}>
            {weekRangeLabel(week)}
          </MonoLabel>
        </View>

        {practices.length > 0 && (
          <View style={styles.dayHeader}>
            {WEEKDAY_INITIALS.map((d, i) => (
              <MonoLabel
                key={i}
                size={9}
                em={0}
                tone={i === todayIdx ? color.ink : color.faint}
                style={styles.dayHeaderCell}
              >
                {d}
              </MonoLabel>
            ))}
          </View>
        )}

        {practices.length === 0 && (
          <Body size={13.5} tone={color.muted} style={{ paddingVertical: 14 }}>
            Nothing on your list yet. Add one below, or save what another teacher did straight from
            the feed.
          </Body>
        )}

        {practices.map((p) => {
          const done = practiceDays[p.id] ?? [];
          const isEditing = editing === p.id;
          const past = history(done, today);
          return (
            <View key={p.id} style={styles.row}>
              <View style={styles.rowTop}>
                {isEditing ? (
                  <TextInput
                    value={editText}
                    onChangeText={setEditText}
                    onBlur={() => commitEdit(p.id)}
                    onSubmitEditing={() => commitEdit(p.id)}
                    autoFocus
                    style={styles.editInput}
                    accessibilityLabel={`Edit ${p.label}`}
                  />
                ) : (
                  <Pressable
                    style={styles.labelHit}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${p.label}`}
                    onPress={() => {
                      setEditText(p.label);
                      setEditing(p.id);
                    }}
                  >
                    <Text style={styles.label}>{p.label}</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => removePractice(p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${p.label}`}
                  hitSlop={10}
                >
                  <Text style={styles.removeLabel}>Remove</Text>
                </Pressable>
              </View>

              {/* Seven boxes on the same axis as the header above, rather than
                  seven circles floating under a long label. Boxes read as a
                  grid; circles read as decoration. */}
              <View style={styles.ticks}>
                {week.map((date, di) => {
                  const on = done.includes(date);
                  const isToday = date === today;
                  return (
                    <Pressable
                      key={date}
                      onPress={() => togglePracticeDay(p.id, date)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${p.label}, ${WEEKDAY_INITIALS[di]}`}
                      style={[
                        styles.cellHit,
                        // A tinted column marks today down the whole grid, so
                        // "which box is now" does not need counting.
                        isToday && styles.cellToday,
                      ]}
                    >
                      <View
                        style={[
                          styles.tick,
                          {
                            backgroundColor: on ? p.fill : 'transparent',
                            borderColor: on
                              ? p.border
                              : isToday
                                ? 'rgba(0,0,0,0.3)'
                                : color.outline,
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>

              {/* The two honest numbers. No verdict, no target, no streak —
                  see the note at the top of the file. */}
              <View style={styles.metaRow}>
                <MonoLabel size={9} em={0.08} tone={color.faint}>
                  {[
                    `${past.total}× TOTAL`,
                    p.startedAt ? `SINCE ${shortDateLabel(p.startedAt)}` : '',
                    plusActive ? `${past.active} OF ${STRIP_WEEKS} WEEKS` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </MonoLabel>
              </View>

              {/* Six weeks, oldest on the left. Dimmed rather than removed on the
                  free plan, the same way the check-in record shows its locked
                  chart: the shape of what is behind the wall is the honest thing
                  to show, and an empty space says nothing.

                  Each track carries its own day count. A part-filled track two
                  sevenths along and one three sevenths along are four pixels
                  apart on a phone, and the sentence that used to explain the
                  strip underneath it has been replaced by the numbers on it. */}
              <View
                style={[styles.strip, !plusActive && styles.stripLocked]}
                accessibilityLabel={
                  plusActive
                    ? `${p.label}: kept in ${past.active} of the last ${STRIP_WEEKS} weeks`
                    : undefined
                }
                accessibilityElementsHidden={!plusActive}
                importantForAccessibility={plusActive ? 'auto' : 'no-hide-descendants'}
              >
                {past.weeks.map((w) => (
                  <View
                    key={w.start}
                    accessibilityLabel={`Week of ${shortDateLabel(w.start)}, ${w.days} ${
                      w.days === 1 ? 'day' : 'days'
                    }`}
                    style={styles.stripCol}
                  >
                    <View style={styles.stripTrack}>
                      {w.days > 0 && (
                        <View
                          style={[
                            styles.stripFill,
                            { width: `${(w.days / 7) * 100}%`, backgroundColor: p.border },
                          ]}
                        />
                      )}
                    </View>
                    <MonoLabel
                      size={8.5}
                      em={0.04}
                      tone={w.days > 0 ? color.faint : color.fainter}
                      style={styles.stripCount}
                    >
                      {w.days}
                    </MonoLabel>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* One lock for the whole card rather than one under every item. */}
        {practices.length > 0 && !plusActive && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See the last six weeks of your list with Here+"
            onPress={() => open('plus')}
            style={styles.stripCta}
          >
            <Text style={styles.stripCtaLabel}>See the last six weeks with Here+ →</Text>
          </Pressable>
        )}

        {/* The free plan's cap. Stated as what it is, with the price of lifting
            it, rather than as a disabled input with no explanation. */}
        {listFull ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your list is full. See Here+"
            onPress={() => open('plus')}
            style={styles.capRow}
          >
            <View style={styles.capCopy}>
              <Text style={styles.capTitle}>Your list is full</Text>
              <Text style={styles.capSub}>
                The free plan holds {FREE_LIST_LIMIT}. Here+ holds as many as you want.
              </Text>
            </View>
            <Text style={styles.capArrow}>→</Text>
          </Pressable>
        ) : (
          <View style={styles.addRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={add}
              placeholder="Add something to your list"
              placeholderTextColor={color.faint}
              style={styles.addInput}
              returnKeyType="done"
              accessibilityLabel="Add an item to your self-care list"
            />
            <Pressable
              onPress={add}
              disabled={!draft.trim()}
              accessibilityRole="button"
              style={[styles.addButton, { opacity: draft.trim() ? 1 : 0.4 }]}
            >
              <Text style={styles.addButtonLabel}>Add</Text>
            </Pressable>
          </View>
        )}
      </Card>

    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.statCard}>
      <Display size={26} weight="regular">
        {value}
      </Display>
      <MonoLabel size={8.5} em={0.1} tone={color.faint} style={{ marginTop: 4 }}>
        {label}
      </MonoLabel>
    </Card>
  );
}

const styles = StyleSheet.create({
  upgradeCard: {
    marginTop: 12,
    padding: 16,
    borderColor: color.accentBorder,
    borderWidth: 1.5,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 30,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 9,
  },
  stripCol: {
    flex: 1,
    gap: 3,
  },
  stripCount: {
    textAlign: 'center',
  },
  stripLocked: {
    opacity: 0.28,
  },
  /**
   * Each week is a short track filled left to right, not a vertical bar. Six
   * columns across a phone card are about fifty pixels wide and twenty tall, and
   * a bar in that box is wider than it is high — it reads as a dash whose length
   * means nothing. A part-filled track shows the days kept *and* the days not,
   * which is the comparison the strip is for.
   */
  stripTrack: {
    width: '100%',
    height: 7,
    borderRadius: 99,
    backgroundColor: color.track,
    overflow: 'hidden',
  },
  stripFill: {
    height: '100%',
    borderRadius: 99,
  },
  stripCta: {
    paddingTop: 14,
  },
  stripCtaLabel: {
    fontSize: 13,
    color: color.accent,
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  capCopy: {
    flex: 1,
  },
  capTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
  },
  capSub: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.muted,
    marginTop: 2,
  },
  capArrow: {
    fontSize: 16,
    color: color.accent,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headText: {
    flex: 1,
  },
  editRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  edit: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: color.ink,
  },
  tally: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  listCard: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  weekHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    marginTop: 12,
  },
  dayHeaderCell: {
    flex: 1,
    textAlign: 'center',
  },
  row: {
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  labelHit: {
    flex: 1,
  },
  label: {
    fontSize: 14.5,
    lineHeight: 21,
    color: color.ink,
  },
  editInput: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.accentBorderSoft,
    backgroundColor: color.ground,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
  },
  removeLabel: {
    fontSize: 12,
    color: color.label,
  },
  ticks: {
    flexDirection: 'row',
    marginTop: 9,
  },
  cellHit: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 8,
  },
  cellToday: {
    backgroundColor: 'rgba(0,0,0,0.035)',
  },
  tick: {
    width: DAY_COL,
    height: DAY_COL,
    borderRadius: 7,
    borderWidth: 1,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  addInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.ground,
    fontSize: 14,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  addButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
