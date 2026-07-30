/**
 * Onboarding — the story first, then what the app needs to work.
 *
 * Six steps: three that make the case for keeping a record, one that states
 * what happens to it, then the educator check and the setup the design assumed
 * had already happened (its tracker opens with habits "chosen once", its area
 * view needs a ZIP).
 *
 * The order is deliberate. The app asks for a school email address at step 5,
 * and a teacher has every reason to be wary of putting a wellness app on a
 * district-monitored account. Both the reason to bother and the promise about
 * what is kept are made before anything is asked for.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useChrome } from '../components/PhoneFrame';
import { Body, Display, MonoLabel } from '../components/ui';
import { VerifyForm } from '../components/VerifyForm';
import { PRACTICE_SUGGESTIONS } from '../data/mock';
import { useStore } from '../store';
import { color, radius, SCREEN_PADDING } from '../theme';

/** Enough to be a habit, few enough to keep. */
const MAX_PRACTICES = 5;

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
    body: 'Weeks you kept your boundaries, next to weeks you did not. Plus dates, a trend line, and the reasons you named yourself — enough to take to a doctor, a union rep, or an administrator when you need to.',
  },
];

/** The promise, as mechanisms rather than assurances. */
const PROMISES = [
  {
    title: 'Stored on your device',
    body: 'How you felt and what you kept are saved locally and never sent to a server. There is no copy of them for anyone to ask us for.',
  },
  {
    title: 'No account, no email',
    body: 'Nothing to sign up for. We do not know your name, and we have no way to find out.',
  },
  {
    title: 'Nothing carries a name',
    body: 'If you post to the nearby feed it goes out with no name, handle, or account ID attached.',
  },
  {
    title: 'ZIP-level only, never your school',
    body: 'Area figures group by ZIP code, and a ZIP needs 40+ teachers before it appears at all — so no number can ever be traced to one classroom.',
  },
];

const VERIFY_STEP = STORY.length + 1;
const SETUP_STEP = VERIFY_STEP + 1;
const STEPS = SETUP_STEP + 1;

export function Onboarding() {
  const { completeOnboarding } = useStore();
  const { topInset } = useChrome();
  const [step, setStep] = useState(0);

  const [verified, setVerified] = useState(false);
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

  const finish = () => completeOnboarding({ practices: chosen, zip, verified });
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
            <MonoLabel>OUR PROMISE</MonoLabel>
            <Display size={29} style={{ marginTop: 12 }}>
              None of it leaves your phone.
            </Display>
            <Body size={13.5} tone={color.muted} style={{ marginTop: 10 }}>
              A record of how work is going is only worth keeping if it cannot be used against you.
              Here is how that is enforced, not just promised.
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
            <MonoLabel>VERIFY</MonoLabel>
            <Display size={29} style={{ marginTop: 12 }}>
              Verify your school email to join.
            </Display>
            <Body style={{ marginTop: 14 }}>
              We check your work address once to confirm you are an educator, then delete it. We store
              only that you verified and the date.
            </Body>

            <VerifyForm
              onVerified={() => {
                setVerified(true);
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
              How you felt is one tap. These are the other half — up to {MAX_PRACTICES} habits you
              tick off beside it. Pick ones you could still manage on a bad day. Change them any
              time.
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
              placeholder="47404"
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
            // Skipping is a real choice, so it gets a real button and states what
            // it costs. The primary action on this step lives inside VerifyForm.
            <>
              <Text style={styles.skipNote}>
                Without verifying you cannot see or post to the nearby feed. Check-ins, tracking, the
                record and resources all work.
              </Text>
              <Pressable
                onPress={next}
                accessibilityRole="button"
                accessibilityLabel="Skip verification. The nearby feed stays locked."
                style={styles.secondary}
              >
                <Text style={styles.secondaryLabel}>Skip verification</Text>
              </Pressable>
            </>
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
