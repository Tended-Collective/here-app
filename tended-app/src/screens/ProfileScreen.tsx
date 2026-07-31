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
 * So an item is not finished, it is *sticking*: kept in at least four of the last
 * six weeks. A bad week cannot erase it and there is nothing to break. Beside it
 * sits the only other honest number — how many times in total, and since when.
 *
 * The verdict is free; the record behind it is Tended+. Free shows this week, the
 * lifetime count and whether it is sticking. Tended+ adds the six-week strip and
 * the week-by-week reading, which is the same line the check-in record draws.
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

/** Weeks in the strip, and how many of them an item has to survive to stick. */
const STRIP_WEEKS = 6;
const STICKING_WEEKS = 4;

/**
 * One item's history, reduced to the three things worth saying about it.
 *
 * `weeks` counts days kept per week, oldest first, and includes the empty ones —
 * a week with nothing in it is the most informative bar on the strip, so the
 * series is built from the last six Mondays rather than from whichever dates
 * happen to have ticks.
 */
function history(done: ISODate[], today: ISODate) {
  const ticked = new Set(done);
  const weeks = weekStarts(STRIP_WEEKS, new Date(`${today}T12:00:00`)).map((start) => ({
    start,
    days: weekDates(new Date(`${start}T12:00:00`)).filter((d) => ticked.has(d)).length,
  }));
  const active = weeks.filter((w) => w.days > 0).length;
  return { weeks, active, total: done.length, sticking: active >= STICKING_WEEKS };
}

export function ProfileScreen({ onEditProfile }: { onEditProfile?: () => void }) {
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

      {/* One button, not the pair Threads shows. There is nowhere to share a
          profile to yet, and a button that does nothing is worse than a gap. */}
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

      {/* The week chart, the insight and the Tended+ lock. */}
      <View style={{ marginTop: 26 }}>
        <RecordScreen />
      </View>

      <View style={styles.listHead}>
        <MonoLabel>MY SELF-CARE LIST</MonoLabel>
        <MonoLabel em={0} tone={listFull ? color.accent : color.faint}>
          {plusActive ? `${practices.length} · TENDED+` : `${practices.length} OF ${FREE_LIST_LIMIT}`}
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

              {/* The two honest numbers, and the verdict. No target, no streak —
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
                {past.sticking && (
                  <View style={styles.sticking}>
                    <MonoLabel size={8.5} em={0.08} tone={color.accent}>
                      STICKING
                    </MonoLabel>
                  </View>
                )}
              </View>

              {/* Six weeks, oldest on the left. Dimmed rather than removed on the
                  free plan, the same way the check-in record shows its locked
                  chart: the shape of what is behind the wall is the honest thing
                  to show, and an empty space says nothing. */}
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
                    style={styles.stripTrack}
                  >
                    {w.days > 0 && (
                      <View
                        style={[
                          styles.stripFill,
                          { width: `${(w.days / 7) * 100}%`, backgroundColor: p.border },
                        ]}
                      />
                    )}
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
            accessibilityLabel="See the last six weeks of your list with Tended+"
            onPress={() => open('plus')}
            style={styles.stripCta}
          >
            <Text style={styles.stripCtaLabel}>See the last six weeks with Tended+ →</Text>
          </Pressable>
        )}

        {practices.length > 0 && plusActive && (
          <Body size={12} tone={color.faint} style={{ marginTop: 12 }}>
            Each strip is the last six weeks, oldest on the left. Four of six is what counts as
            sticking — a bad week does not undo the rest.
          </Body>
        )}

        {/* The free plan's cap. Stated as what it is, with the price of lifting
            it, rather than as a disabled input with no explanation. */}
        {listFull ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your list is full. See Tended+"
            onPress={() => open('plus')}
            style={styles.capRow}
          >
            <View style={styles.capCopy}>
              <Text style={styles.capTitle}>Your list is full</Text>
              <Text style={styles.capSub}>
                The free plan holds {FREE_LIST_LIMIT}. Tended+ holds as many as you want.
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


      {/* At the foot of the page whose contents it erases. Deleting is not
          setup — it is the end of the record above it — so it lives with that
          record rather than in a settings list. */}
      <MonoLabel style={{ marginTop: 34 }}>ACCOUNT</MonoLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete your account"
        onPress={() => open('delete')}
        style={styles.deleteRow}
      >
        <Text style={styles.deleteLabel}>Delete my account</Text>
        <Text style={styles.deleteArrow}>→</Text>
      </Pressable>
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
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(180,103,98,0.4)',
  },
  deleteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a4574f',
  },
  deleteArrow: {
    fontSize: 15,
    color: '#a4574f',
  },
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
  sticking: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.accentBorderSoft,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
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
    flex: 1,
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
  edit: {
    height: 42,
    marginTop: 18,
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
