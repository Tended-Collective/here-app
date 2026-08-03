/**
 * Setup, moved off the profile.
 *
 * Everything here is configured once and then left alone: how you appear, the
 * verified half of the account, and who you have blocked. On the profile it sat
 * between the teacher and the two things they open the app to see — their trends
 * and their list — so a page about a week of their own life opened on a form.
 *
 * Deleting the account is not here. It sits at the foot of the profile, with the
 * record it destroys.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSheets } from '../components/Sheet';
import { Toggle } from '../components/Toggle';
import { UsernameField, UsernameState } from '../components/UsernameField';
import { Body, Card, Display, MonoLabel } from '../components/ui';
import { SITE, AUTHORS, JOBS, LEVELS, TAKEN_USERNAMES } from '../data/mock';
import { shortDateLabel, toISO } from '../lib/dates';
import { stateForZip, stateName } from '../lib/zip';
import { openLink } from '../lib/links';
import { SUPPORT_EMAIL } from '../data/rules';
import { useStore } from '../store';
import { color, radius } from '../theme';

export function SettingsScreen() {
  const { educator, account, updateShown, blocked, unblockAuthor, agreedToRulesAt } = useStore();
  const { open } = useSheets();

  const shown = account?.shown;
  // Held in a draft rather than written per keystroke: a username is the one
  // field here where a half-typed value is a different, possibly real account.
  const [usernameDraft, setUsernameDraft] = useState(shown?.username ?? '');
  const [usernameState, setUsernameState] = useState<UsernameState>('empty');
  // Their own username must not read as taken when they open the field.
  const othersUsernames = useMemo(
    () => TAKEN_USERNAMES.filter((u) => u !== shown?.username),
    [shown?.username],
  );

  return (
    <View>
      <MonoLabel>SETTINGS</MonoLabel>
      <Display size={32} style={{ marginTop: 10 }}>
        Your account
      </Display>

      <View style={styles.badges}>
        <Pressable
          accessibilityRole={educator.verified ? undefined : 'button'}
          onPress={educator.verified ? undefined : () => open('verify')}
          style={[styles.badge, educator.verified && styles.badgeOn]}
        >
          <MonoLabel size={9} em={0.1} tone={educator.verified ? color.accent : color.muted}>
            {educator.verified ? 'VERIFIED · SCHOOL EMAIL' : 'NOT VERIFIED · TAP TO VERIFY'}
          </MonoLabel>
        </Pressable>
        <View style={styles.badge}>
          <MonoLabel size={9} em={0.1} tone={color.muted}>
            {shown?.zip ? `SCHOOL ZIP ${shown.zip}` : 'NO SCHOOL ZIP'}
          </MonoLabel>
        </View>
      </View>

      {/* How you appear, editable at any time. The verified half — the real
          name and the work address — is shown below it as read-only, so the
          split between "what proves you teach" and "what the feed sees" is
          visible rather than merely implemented. */}
      <MonoLabel style={{ marginTop: 28 }}>HOW YOU APPEAR</MonoLabel>
      <Card style={styles.appearCard}>
        <MonoLabel size={9} em={0.1} tone={color.faint}>
          DISPLAY NAME
        </MonoLabel>
        <TextInput
          value={shown?.displayName ?? ''}
          onChangeText={(t) => updateShown({ displayName: t })}
          placeholder="Your name, initials, or anything"
          placeholderTextColor={color.faint}
          style={styles.appearInput}
          accessibilityLabel="The name shown on your posts"
        />

        {/* Changing a username has a cost a display name does not: anyone who
            wrote yours down loses you. It is still allowed — people leave
            districts and change what they want to be called — but the field
            says so rather than letting them find out later. */}
        <MonoLabel size={9} em={0.1} tone={color.faint}>
          USERNAME · ONE PER PERSON
        </MonoLabel>
        <UsernameField
          value={usernameDraft}
          onChange={setUsernameDraft}
          taken={othersUsernames}
          onStateChange={setUsernameState}
        />
        {usernameDraft !== (shown?.username ?? '') && (
          <View style={styles.usernameActions}>
            <Pressable
              onPress={() => setUsernameDraft(shown?.username ?? '')}
              accessibilityRole="button"
              style={styles.usernameCancel}
            >
              <Text style={styles.usernameCancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => updateShown({ username: usernameDraft })}
              disabled={usernameState !== 'available'}
              accessibilityRole="button"
              accessibilityLabel="Save your new username"
              style={[styles.usernameSave, usernameState !== 'available' && { opacity: 0.4 }]}
            >
              <Text style={styles.usernameSaveLabel}>Save username</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.appearJobHead}>
          <MonoLabel size={9} em={0.1} tone={color.faint}>
            ROLE
          </MonoLabel>
          <Toggle
            value={!!shown?.showJob}
            onChange={(v) => updateShown({ showJob: v })}
            label="Show what I do"
          />
        </View>
        <View style={[styles.jobChips, !shown?.showJob && styles.appearMuted]}>
          {JOBS.map((label) => {
            const on = shown?.job === label;
            return (
              <Pressable
                key={label}
                onPress={() => shown?.showJob && updateShown({ job: on ? '' : label })}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.jobChip, on && styles.jobChipOn]}
              >
                <Text style={[styles.jobChipLabel, on && styles.jobChipLabelOn]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.appearRow}>
          <TextInput
            value={shown?.years === null || shown?.years === undefined ? '' : String(shown.years)}
            onChangeText={(t) => {
              const digits = t.replace(/[^0-9]/g, '').slice(0, 2);
              updateShown({ years: digits === '' ? null : Number(digits) });
            }}
            placeholder="Years in schools"
            placeholderTextColor={color.faint}
            keyboardType="number-pad"
            style={[styles.appearInput, styles.appearGrow, !shown?.showYears && styles.appearMuted]}
            editable={!!shown?.showYears}
            accessibilityLabel="Years you have worked in schools"
          />
          <Toggle
            value={!!shown?.showYears}
            onChange={(v) => updateShown({ showYears: v })}
            label="Show my years of experience"
          />
        </View>

        <View style={styles.appearJobHead}>
          <MonoLabel size={9} em={0.1} tone={color.faint}>
            LEVEL
          </MonoLabel>
          <Toggle
            value={!!shown?.showLevel}
            onChange={(v) => updateShown({ showLevel: v })}
            label="Show my level"
          />
        </View>
        <View style={[styles.jobChips, !shown?.showLevel && styles.appearMuted]}>
          {LEVELS.map((label) => {
            const on = shown?.level === label;
            return (
              <Pressable
                key={label}
                onPress={() => shown?.showLevel && updateShown({ level: on ? '' : label })}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.jobChip, on && styles.jobChipOn]}
              >
                <Text style={[styles.jobChipLabel, on && styles.jobChipLabelOn]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* One ZIP, two jobs: it resolves to the state on the byline, and it is
            what the feed's "Near my school" is matched on. Typed as a number so
            it cannot arrive as four spellings of one place. */}
        <View style={styles.appearRow}>
          <TextInput
            value={shown?.zip ?? ''}
            onChangeText={(t) => updateShown({ zip: t })}
            placeholder="School ZIP code"
            placeholderTextColor={color.faint}
            style={[styles.appearInput, styles.appearGrow, !shown?.showState && styles.appearMuted]}
            editable={!!shown?.showState}
            keyboardType="number-pad"
            maxLength={5}
            accessibilityLabel="Your school's ZIP code"
          />
          <Toggle
            value={!!shown?.showState}
            onChange={(v) => updateShown({ showState: v })}
            label="Show my state"
          />
        </View>
        <Text style={styles.zipNote}>
          {shown?.zip
            ? (stateName(stateForZip(shown.zip)) ?? 'We do not recognize that ZIP.')
            : 'Your school’s ZIP. Shows as your state, and finds people near you.'}
        </Text>

        <View style={styles.verifiedBlock}>
          <MonoLabel size={9} em={0.1} tone={color.faint}>
            NEVER SHOWN · HELD ONLY TO CONFIRM YOU WORK IN EDUCATION
          </MonoLabel>
          <Text style={styles.verifiedLine}>{account?.name || '—'}</Text>
          <Text style={styles.verifiedLine}>
            {account?.email || 'No school email on file'}
          </Text>
        </View>
      </Card>

      {/* Guideline 1.2 wants the rules reachable and contact details published,
          not only shown once at sign-up and then buried. Someone deciding
          whether to report a post is exactly the person who needs to reread
          what the rules say. */}
      <MonoLabel style={{ marginTop: 30 }}>RULES AND CONTACT</MonoLabel>
      <Card style={styles.linksCard}>
        <LinkRow
          label="Community rules"
          hint={
            agreedToRulesAt
              ? `Agreed ${shortDateLabel(toISO(new Date(agreedToRulesAt)))}`
              : 'The six rules of the feed'
          }
          onPress={() => open('rules')}
        />
        <LinkRow label="Terms of service" onPress={() => openLink(SITE.terms)} external />
        <LinkRow label="Privacy policy" onPress={() => openLink(SITE.privacy)} external />
        <LinkRow
          label="Contact us"
          hint={SUPPORT_EMAIL}
          onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
          external
        />
      </Card>

      {blocked.length > 0 && (
        <>
          <MonoLabel style={{ marginTop: 30 }}>BLOCKED ACCOUNTS</MonoLabel>
          <Card style={styles.blockedCard}>
            {blocked.map((id) => {
              const who = AUTHORS[id];
              return (
                <View key={id} style={styles.blockedRow}>
                  <Text style={styles.blockedName}>{who ? `@${who.username}` : 'An account'}</Text>
                  <Pressable
                    onPress={() => unblockAuthor(id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Unblock ${who ? `@${who.username}` : 'this account'}`}
                    hitSlop={10}
                  >
                    <Text style={styles.unblock}>Unblock</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </View>
  );
}

function LinkRow({
  label,
  hint,
  onPress,
  external = false,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  external?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={styles.linkRow}
    >
      <View style={styles.linkCopy}>
        <Text style={styles.linkLabel}>{label}</Text>
        {!!hint && <Text style={styles.linkHint}>{hint}</Text>}
      </View>
      {/* An arrow leaves the app, a chevron stays inside it. */}
      <Text style={styles.linkMark}>{external ? '↗' : '›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linksCard: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  linkCopy: {
    flex: 1,
    gap: 2,
  },
  linkLabel: {
    fontSize: 15,
    color: color.ink,
  },
  linkHint: {
    fontSize: 12.5,
    color: color.faint,
  },
  linkMark: {
    fontSize: 16,
    lineHeight: 20,
    color: color.faint,
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
  zipNote: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.label,
    marginTop: -2,
  },
  appearJobHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  jobChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  jobChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
  },
  jobChipOn: {
    borderColor: color.accentBorderSoft,
    backgroundColor: 'rgba(23,96,107,0.06)',
  },
  jobChipLabel: {
    fontSize: 13,
    color: color.body,
  },
  jobChipLabelOn: {
    color: color.accent,
    fontWeight: '600',
  },
  usernameActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  usernameCancel: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    justifyContent: 'center',
  },
  usernameCancelLabel: {
    fontSize: 13.5,
    color: color.body,
  },
  usernameSave: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    justifyContent: 'center',
  },
  usernameSaveLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#fff',
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
  blockedCard: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: color.rule,
    marginTop: 8,
  },
  blockedName: {
    fontSize: 14.5,
    color: color.ink,
  },
  unblock: {
    fontSize: 13,
    fontWeight: '600',
    color: color.accent,
  },
});
