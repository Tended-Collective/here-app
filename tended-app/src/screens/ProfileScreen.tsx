/**
 * The teacher's own page: what their check-ins add up to, and the self-care
 * list they are working from.
 *
 * The list is the app's only to-do. Items arrive two ways — typed here, or
 * saved off someone else's post in the feed — and there is no distinction
 * between the two once they land, because a boundary someone else holds is
 * just a line on your list once you have taken it.
 *
 * Ticking is per day and writes on the tap. The week grid on the same rows is
 * the history, so ticking here and reading the week are the same object.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { InviteCard } from '../components/InviteCard';
import { PodcastSection } from '../components/PodcastSection';
import { Toggle } from '../components/Toggle';
import { useSheets } from '../components/Sheet';
import { StripedPlaceholder } from '../components/StripedPlaceholder';
import { Body, Card, Display, MonoLabel } from '../components/ui';
import { FREE_LIST_LIMIT, POSTS, postUrl, SITE } from '../data/mock';
import { openLink } from '../lib/links';
import { WEEKDAY_INITIALS, todayISO, weekDates, weekdayIndex } from '../lib/dates';
import { useStore } from '../store';
import { color, radius } from '../theme';
import { RecordScreen } from './RecordScreen';

const DAY_COL = 22;

export function ProfileScreen() {
  const {
    practices,
    practiceDays,
    togglePracticeDay,
    addPractice,
    removePractice,
    renamePractice,
    educator,
    zip,
    entries,
    account,
    following,
    listFull,
    plusActive,
    updateShown,
  } = useStore();
  const { open } = useSheets();

  const week = useMemo(() => weekDates(), []);
  const today = todayISO();
  const todayIdx = weekdayIndex();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const shown = account?.shown;
  const bylinePreview = [
    shown?.showRole && shown.role.trim(),
    shown?.showDistrict && shown.district.trim(),
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
      <MonoLabel>YOUR PROFILE</MonoLabel>
      <Display size={32} style={{ marginTop: 10 }}>
        {shown?.handle || account?.name || 'Your account'}
      </Display>
      <Body size={13} tone={color.muted} style={{ marginTop: 6 }}>
        {bylinePreview || 'Nothing else shown on your posts'}
      </Body>

      <View style={styles.badges}>
        <Pressable
          accessibilityRole={educator.verified ? undefined : 'button'}
          onPress={educator.verified ? undefined : () => open('verify')}
          style={[styles.badge, educator.verified && styles.badgeOn]}
        >
          <MonoLabel size={9} em={0.1} tone={educator.verified ? color.accent : color.muted}>
            {educator.verified ? 'VERIFIED EDUCATOR' : 'NOT VERIFIED · TAP TO VERIFY'}
          </MonoLabel>
        </Pressable>
        {/* Only states a ZIP the teacher actually gave us. It used to fall back
            to the sample ZIP and label it "yours", which read as the app having
            quietly found their location. */}
        <View style={styles.badge}>
          <MonoLabel size={9} em={0.1} tone={color.muted}>
            {zip ? `ZIP ${zip}` : 'NO ZIP SET'}
          </MonoLabel>
        </View>
      </View>

      <View style={styles.tally}>
        <Stat value={String(checkIns)} label={checkIns === 1 ? 'CHECK-IN' : 'CHECK-INS'} />
        <Stat value={String(following.length)} label="FOLLOWING" />
        <Stat value={String(keptThisWeek)} label="DONE THIS WEEK" />
      </View>

      {/* How you appear, editable at any time. The verified half — the real
          name and the work address — is shown below it as read-only, so the
          split between "what proves you teach" and "what the feed sees" is
          visible rather than merely implemented. */}
      <MonoLabel style={{ marginTop: 30 }}>HOW YOU APPEAR</MonoLabel>
      <Card style={styles.appearCard}>
        <MonoLabel size={9} em={0.1} tone={color.faint}>
          SHOWN ON YOUR POSTS
        </MonoLabel>
        <TextInput
          value={shown?.handle ?? ''}
          onChangeText={(t) => updateShown({ handle: t })}
          placeholder="Your name, initials, or a handle"
          placeholderTextColor={color.faint}
          style={styles.appearInput}
          accessibilityLabel="The name shown on your posts"
        />

        <View style={styles.appearRow}>
          <TextInput
            value={shown?.role ?? ''}
            onChangeText={(t) => updateShown({ role: t })}
            placeholder="Grade or subject"
            placeholderTextColor={color.faint}
            style={[styles.appearInput, styles.appearGrow, !shown?.showRole && styles.appearMuted]}
            editable={!!shown?.showRole}
            accessibilityLabel="Your grade or subject"
          />
          <Toggle
            value={!!shown?.showRole}
            onChange={(v) => updateShown({ showRole: v })}
            label="Show my grade or subject"
          />
        </View>

        <View style={styles.appearRow}>
          <TextInput
            value={shown?.district ?? ''}
            onChangeText={(t) => updateShown({ district: t })}
            placeholder="District"
            placeholderTextColor={color.faint}
            style={[
              styles.appearInput,
              styles.appearGrow,
              !shown?.showDistrict && styles.appearMuted,
            ]}
            editable={!!shown?.showDistrict}
            accessibilityLabel="Your district"
          />
          <Toggle
            value={!!shown?.showDistrict}
            onChange={(v) => updateShown({ showDistrict: v })}
            label="Show my district"
          />
        </View>

        <View style={styles.verifiedBlock}>
          <MonoLabel size={9} em={0.1} tone={color.faint}>
            NEVER SHOWN · HELD AS PROOF YOU TEACH
          </MonoLabel>
          <Text style={styles.verifiedLine}>{account?.name || '—'}</Text>
          <Text style={styles.verifiedLine}>{account?.email || 'Verified by invite code'}</Text>
        </View>
      </Card>

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
        <View style={styles.dayHeader}>
          <View style={styles.spacer} />
          {WEEKDAY_INITIALS.map((d, i) => (
            <MonoLabel key={i} size={9} em={0} tone={color.faint} style={styles.dayHeaderCell}>
              {d}
            </MonoLabel>
          ))}
        </View>

        {practices.length === 0 && (
          <Body size={13.5} tone={color.muted} style={{ paddingVertical: 14 }}>
            Nothing on your list yet. Add one below, or save what another teacher did straight from
            the feed.
          </Body>
        )}

        {practices.map((p) => {
          const done = practiceDays[p.id] ?? [];
          const isEditing = editing === p.id;
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

              <View style={styles.ticks}>
                <View style={styles.spacer} />
                {week.map((date, di) => {
                  const on = done.includes(date);
                  return (
                    <Pressable
                      key={date}
                      onPress={() => togglePracticeDay(p.id, date)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${p.label}, ${WEEKDAY_INITIALS[di]}`}
                      style={[
                        styles.tick,
                        {
                          backgroundColor: on ? p.fill : 'transparent',
                          borderColor: on
                            ? p.border
                            : date === today
                              ? 'rgba(0,0,0,0.28)'
                              : color.outline,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}

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

      <InviteCard />

      {/* Tended Collective's own writing and podcast. These had a tab of their
          own; the ad inventory that shared it moved into the feed, and what is
          left is reading rather than part of the daily loop, so it sits at the
          foot of the teacher's own page instead of costing a fifth of the tab
          bar. The free-therapy shelf is not here — it holds the first placement
          in the feed, where it gets seen. */}
      <View style={styles.sectionHead}>
        <MonoLabel>FROM TENDED COLLECTIVE</MonoLabel>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="All posts on tendedcollective.com"
          onPress={() => openLink(SITE.blog)}
          hitSlop={8}
        >
          <Text style={styles.link}>All posts</Text>
        </Pressable>
      </View>

      {POSTS.map((post) => (
        <Pressable
          key={post.id}
          accessibilityRole="link"
          accessibilityLabel={`${post.title}, opens tendedcollective.com`}
          onPress={() => openLink(postUrl(post.slug))}
        >
          <Card style={styles.postCard}>
            <StripedPlaceholder />
            <View style={styles.postCopy}>
              <MonoLabel size={9.5} em={0.1} tone={color.faint}>
                {post.kicker}
              </MonoLabel>
              <Display size={19} lineHeight={1.2} weight="regular" style={{ marginTop: 6 }}>
                {post.title}
              </Display>
            </View>
          </Card>
        </Pressable>
      ))}

      <PodcastSection />
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
  appearCard: {
    marginTop: 12,
    padding: 16,
    gap: 10,
  },
  appearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appearGrow: {
    flex: 1,
  },
  appearInput: {
    height: 44,
    paddingHorizontal: 13,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.ground,
    fontSize: 14.5,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  appearMuted: {
    opacity: 0.45,
  },
  verifiedBlock: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: color.rule,
    gap: 3,
  },
  verifiedLine: {
    fontSize: 13.5,
    color: color.muted,
  },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 30,
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
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 30,
    marginBottom: 12,
  },
  link: {
    fontSize: 13,
    color: color.accent,
  },
  postCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  postCopy: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },
  badge: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    justifyContent: 'center',
  },
  badgeOn: {
    borderColor: color.accentBorderSoft,
    backgroundColor: 'rgba(23,96,107,0.06)',
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
  dayHeader: {
    flexDirection: 'row',
    gap: 5,
    paddingTop: 12,
  },
  spacer: {
    flex: 1,
  },
  dayHeaderCell: {
    width: DAY_COL,
    textAlign: 'center',
  },
  row: {
    paddingVertical: 12,
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
    gap: 5,
    marginTop: 9,
  },
  tick: {
    width: DAY_COL,
    height: DAY_COL,
    borderRadius: 99,
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
