/**
 * Onboarding — the story first, then signing up.
 *
 * Six steps: three that make the case, one that states plainly what is public
 * and what is not, then the account and the starting list.
 *
 * The order is deliberate. The app asks for a school email address at step 5,
 * and a teacher has every reason to be wary of putting a wellness app on a
 * district-monitored account. Both the reason to bother and the split between
 * what gets published and what never leaves the phone are stated before
 * anything is asked for.
 *
 * Verification is no longer skippable. It was, while the feed was anonymous and
 * a skipper simply lost access to it. Now that posts carry a name, an account
 * that has not been checked against a school address would be a stranger in a
 * feed whose whole value is that everyone in it teaches.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useChrome } from '../components/PhoneFrame';
import { Body, Display, MonoLabel } from '../components/ui';
import { VerifyForm } from '../components/VerifyForm';
import { FREE_LIST_LIMIT, PRACTICE_SUGGESTIONS } from '../data/mock';
import { useStore } from '../store';
import { color, radius, SCREEN_PADDING } from '../theme';

/**
 * The free plan's cap, so nobody finishes onboarding holding a list the plan
 * they are on cannot hold.
 */
const MAX_PRACTICES = FREE_LIST_LIMIT;

/**
 * The case for the app, in three slides. Concrete rather than inspirational —
 * the argument is that memory is a poor record and a record is worth having,
 * not that teaching is hard.
 *
 * Both halves of the daily ask are named from the first screen. Tracking only
 * how a day went produces a log of being worn down, which is a diagnosis
 * without a lever; tracking only habits produces a chore list. The pair is what
 * makes either one useful, so the pitch is the pair.
 */
const STORY = [
  {
    kicker: 'TENDED',
    title: 'Two things a day: how you felt, and what you did for yourself.',
    body: 'A tap for the day, a tick for each habit you kept. That is the whole daily ask.',
  },
  {
    kicker: 'WHY BOTH',
    title: 'One is the symptom. The other is the part you control.',
    body: 'How a day goes is mostly not yours — the cover, the timetable, the meeting that moved. Whether you ate lunch sitting down is. Track only the first and you have a record of being worn down. Track both and you have a record of what you tried, and whether it held.',
  },
  {
    kicker: 'WHAT YOU GET',
    title: 'Proof of which of your own habits actually move a day.',
    body: 'Weeks you kept your list, next to weeks you did not. Plus dates and a trend line — enough to take to a doctor, a union rep, or an administrator when you need to. And a feed of what other teachers nearby are actually doing, which you can take from.',
  },
];

/**
 * The promise. Stated as the line between the two halves of the app rather than
 * as a blanket assurance, because the app now holds a name and a work address
 * and any claim that it does not would be false.
 */
const PROMISES = [
  {
    title: 'Your check-ins are private. Always.',
    body: 'How you rated a day never leaves this phone. Not to us, not to your district, not to the feed. Rating a day is not a publication.',
  },
  {
    title: 'Your posts carry your name',
    body: 'That is the point of them. You decide one post at a time whether to share something, and you can delete any of them.',
  },
  {
    title: 'Your school is never shown',
    body: 'Your profile says your grade or subject and your district. Never the building you teach in.',
  },
  {
    title: 'Your address is for verifying, not mailing',
    body: 'We check it once to confirm you teach. We do not sell it, rent it, or hand it to your district.',
  },
];

const VERIFY_STEP = STORY.length + 1;
const SETUP_STEP = VERIFY_STEP + 1;
const STEPS = SETUP_STEP + 1;

export function Onboarding() {
  const { completeOnboarding } = useStore();
  const { topInset } = useChrome();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState('');
  const [chosen, setChosen] = useState<string[]>(PRACTICE_SUGGESTIONS.slice(0, 3));

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const toggle = (label: string) =>
    setChosen((prev) =>
      prev.includes(label)
        ? prev.filter((p) => p !== label)
        : prev.length >= MAX_PRACTICES
          ? prev
          : [...prev, label],
    );

  const finish = () => completeOnboarding({ name, email, practices: chosen, zip });
  const story = step < STORY.length ? STORY[step] : null;

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progress}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.pip, i <= step && styles.pipOn]} />
          ))}
        </View>

        {story && (
          <>
            <MonoLabel>{story.kicker}</MonoLabel>
            <Display size={step === 0 ? 32 : 29} style={{ marginTop: 12 }}>
              {story.title}
            </Display>
            <Body size={15} style={{ marginTop: 16 }}>
              {story.body}
            </Body>
          </>
        )}

        {step === STORY.length && (
          <>
            <MonoLabel>WHAT IS SHARED</MonoLabel>
            <Display size={29} style={{ marginTop: 12 }}>
              Your posts are public. Your record is not.
            </Display>
            <Body size={13.5} tone={color.muted} style={{ marginTop: 10 }}>
              Tended is two things at once, and they are kept apart on purpose. Here is exactly
              which is which.
            </Body>
            <View style={styles.promises}>
              {PROMISES.map((p) => (
                <Promise key={p.title} title={p.title} body={p.body} />
              ))}
            </View>
          </>
        )}

        {step === VERIFY_STEP && (
          <>
            <MonoLabel>CREATE YOUR ACCOUNT</MonoLabel>
            <Display size={29} style={{ marginTop: 12 }}>
              Sign up with your school email.
            </Display>
            <Body style={{ marginTop: 14 }}>
              Your work address is how we know you teach. Everyone in the feed has done the same,
              which is the whole reason it is worth reading.
            </Body>

            <MonoLabel style={{ marginTop: 22 }}>YOUR NAME</MonoLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="How you want to appear on posts"
              placeholderTextColor={color.faint}
              style={styles.input}
              autoCapitalize="words"
              accessibilityLabel="Your name, shown on your posts"
            />

            <VerifyForm
              onVerified={(address) => {
                setEmail(address);
                next();
              }}
            />
          </>
        )}

        {step === SETUP_STEP && (
          <>
            <MonoLabel>YOUR SELF-CARE</MonoLabel>
            <Display size={29} style={{ marginTop: 12 }}>
              Pick what you are trying to keep.
            </Display>
            <Body style={{ marginTop: 14 }}>
              How you felt is one tap. This is the other half — your self-care list. Pick up to{' '}
              {MAX_PRACTICES} things you could still manage on a bad day. You can edit the list any
              time, and Tended+ lifts the limit.
            </Body>

            <View style={styles.chips}>
              {PRACTICE_SUGGESTIONS.map((label) => {
                const on = chosen.includes(label);
                return (
                  <Pressable
                    key={label}
                    onPress={() => toggle(label)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <MonoLabel style={{ marginTop: 26 }}>ZIP CODE · OPTIONAL</MonoLabel>
            <TextInput
              value={zip}
              onChangeText={setZip}
              placeholder="e.g. 20002"
              placeholderTextColor={color.faint}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={5}
              accessibilityLabel="Your ZIP code, optional"
            />
            <Text style={styles.hint}>
              Used only to group you on the area map. Leave blank and everything else still works.
            </Text>
          </>
        )}

        <View style={styles.footer}>
          {step === SETUP_STEP ? (
            <Primary
              label={chosen.length ? 'Start tracking' : 'Pick at least one'}
              disabled={!chosen.length}
              onPress={finish}
            />
          ) : step === VERIFY_STEP ? (
            // The primary action on this step lives inside VerifyForm. There is
            // no skip: an unverified account in a named feed is a stranger.
            <Text style={styles.skipNote}>
              Enter your name above before requesting a code.
            </Text>
          ) : (
            <Primary label="Continue" onPress={next} />
          )}

          <View style={styles.footerRow}>
            {step > 0 ? (
              <Pressable onPress={back} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.quiet}>Back</Text>
              </Pressable>
            ) : (
              <View />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Promise({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.promiseRow}>
      <View style={styles.tick} />
      <View style={styles.promiseCopy}>
        <Text style={styles.promiseTitle}>{title}</Text>
        <Body size={13} tone={color.muted} style={{ marginTop: 3 }}>
          {body}
        </Body>
      </View>
    </View>
  );
}

function Primary({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.primary, disabled && { opacity: 0.4 }]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.ground,
  },
  content: {
    ...SCREEN_PADDING,
    paddingBottom: 24,
    // Centred rather than top-aligned: on a phone the step content is short and
    // a bottom-pinned button ended up far below the fold, off screen.
    flexGrow: 1,
    justifyContent: 'center',
  },
  progress: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 28,
  },
  pip: {
    flex: 1,
    height: 3,
    borderRadius: 99,
    backgroundColor: color.track,
  },
  pipOn: {
    backgroundColor: color.accent,
  },
  promises: {
    marginTop: 22,
    gap: 18,
  },
  promiseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tick: {
    width: 7,
    height: 7,
    borderRadius: 99,
    marginTop: 7,
    backgroundColor: color.accent,
    opacity: 0.55,
  },
  promiseCopy: {
    flex: 1,
  },
  promiseTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: color.ink,
  },
  input: {
    height: 50,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
    fontSize: 15,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.label,
    marginTop: 10,
  },
  problem: {
    fontSize: 13,
    lineHeight: 20,
    color: color.ink,
    marginTop: 12,
  },
  quiet: {
    fontSize: 14,
    color: color.muted,
    paddingVertical: 10,
  },
  notice: {
    marginTop: 20,
    padding: 13,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
  },
  chipOn: {
    borderColor: color.accentBorderSoft,
    backgroundColor: 'rgba(23,96,107,0.06)',
  },
  chipLabel: {
    fontSize: 14,
    color: color.body,
  },
  chipLabelOn: {
    color: color.accent,
    fontWeight: '600',
  },
  footer: {
    // Travels with the content instead of being pinned to the bottom of a box
    // that is taller than the screen.
    marginTop: 28,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  primary: {
    height: 52,
    borderRadius: 14,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: color.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: color.ink,
  },
  skipNote: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.label,
    marginBottom: 12,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
