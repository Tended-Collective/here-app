/**
 * Onboarding — the screens the v3 design assumed had already happened. Its
 * practice tracker opens with three practices "chosen once", and its area view
 * needs a ZIP; both arrive here, along with the educator check.
 *
 * Four steps, in the order that earns the next one:
 *
 *   1. what this is
 *   2. what it does with what you tell it — before asking for anything
 *   3. the educator check, skippable
 *   4. the practices
 *
 * Step 2 comes before step 3 deliberately. The first thing the app asks for is
 * a school email address, and a teacher has every reason to be wary of putting
 * a wellness app on a district-monitored account. The promise has to be made
 * before the ask, not after.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useChrome } from '../components/PhoneFrame';
import { Body, Display, MonoLabel } from '../components/ui';
import { VerifyForm } from '../components/VerifyForm';
import { PRACTICE_SUGGESTIONS } from '../data/mock';
import { useStore } from '../store';
import { color, radius, SCREEN_PADDING } from '../theme';

const STEPS = 4;
/** Enough to be a practice, few enough to stay a habit. */
const MAX_PRACTICES = 5;

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

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progress}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.pip, i <= step && styles.pipOn]} />
          ))}
        </View>

        {step === 0 && (
          <>
            <MonoLabel>TENDED</MonoLabel>
            <Display size={34} style={{ marginTop: 12 }}>
              A record of how teaching is actually going.
            </Display>
            <Body size={15} style={{ marginTop: 16 }}>
              One tap a day. Over a term it becomes something you can point at — in a meeting, at an
              appointment, or just to yourself on a week when you can’t tell any more.
            </Body>
          </>
        )}

        {step === 1 && (
          <>
            <MonoLabel>BEFORE YOU START</MonoLabel>
            <Display size={30} style={{ marginTop: 12 }}>
              Your days stay yours.
            </Display>
            <View style={styles.promises}>
              <Promise
                title="Your check-ins stay on this device"
                body="They are not sent anywhere, and nobody can ask us for them."
              />
              <Promise
                title="No name, ever"
                body="Nothing you write carries one, including in the nearby feed."
              />
              <Promise
                title="Your area, not your school"
                body="The map works on ZIP codes, and a ZIP needs 40+ teachers before it appears at all."
              />
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <MonoLabel>ONE CHECK</MonoLabel>
            <Display size={30} style={{ marginTop: 12 }}>
              Are you an educator?
            </Display>
            <Body style={{ marginTop: 14 }}>
              The nearby feed is teachers only. A code to your school address is how we keep it that
              way — then the address is discarded. We keep that you verified, and nothing else.
            </Body>

            <VerifyForm
              onVerified={() => {
                setVerified(true);
                next();
              }}
            />
          </>
        )}

        {step === 3 && (
          <>
            <MonoLabel>LAST THING</MonoLabel>
            <Display size={30} style={{ marginTop: 12 }}>
              Pick a few practices.
            </Display>
            <Body style={{ marginTop: 14 }}>
              Small things you want to hold onto. Choose up to {MAX_PRACTICES} — you can change them
              whenever.
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

            <MonoLabel style={{ marginTop: 26 }}>YOUR ZIP · OPTIONAL</MonoLabel>
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
              Only used to place you on the area map. Leave it blank and everything else still works.
            </Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === STEPS - 1 ? (
          <Primary
            label={chosen.length ? 'Start' : 'Pick at least one'}
            disabled={!chosen.length}
            onPress={finish}
          />
        ) : step === 2 ? (
          // The verify step has its own primary action; a Continue here would
          // be a second button doing exactly what "Skip for now" does.
          null
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
          {step === 2 && (
            <Pressable onPress={next} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.quiet}>Skip for now</Text>
            </Pressable>
          )}
        </View>
      </View>
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
    paddingHorizontal: 24,
    paddingBottom: 22,
    paddingTop: 6,
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
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
