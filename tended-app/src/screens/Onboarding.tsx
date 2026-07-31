/**
 * Onboarding, in six screens.
 *
 *   1–3  Why this exists, what it asks, what it gives back.
 *   4    Sign up with a school email.
 *   5–6  Choose how you appear: who you are, then the context around it.
 *
 * Two screens for the profile rather than one because the roles list runs to
 * fifteen entries; put the context fields under it and the whole thing stops
 * being scannable on a phone.
 *
 * There is no habit-picking screen. Choosing three practices from a list before
 * seeing the app is a planning exercise asked of someone who has not yet been
 * given a reason to care; habits now arrive from the feed, where they come
 * attached to a person who is actually keeping one.
 *
 * There is no privacy slide any more. The promise it made now sits as one line
 * on the sign-up screen, next to the address it is a promise about — which is
 * the moment it actually answers a question someone is asking.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useChrome } from '../components/PhoneFrame';
import { Body, Display, MonoLabel } from '../components/ui';
import { Toggle } from '../components/Toggle';
import { UsernameField, UsernameState } from '../components/UsernameField';
import { VerifyForm } from '../components/VerifyForm';
import { JOBS, LEVELS, TAKEN_USERNAMES, yearsLabel } from '../data/mock';
import { normalizeUsername } from '../lib/usernames';
import { isCompleteZip, normalizeZip, stateForZip, stateName } from '../lib/zip';
import { useStore } from '../store';
import { color, radius, SCREEN_PADDING } from '../theme';

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
    title: 'A moment for yourself.',
    body: "In the work that we do, it's easy to give to our students, staff members, and families. Tended is the intentional pause that we need—a moment to check in with ourselves.",
  },
  {
    kicker: 'THE DAILY ASK',
    title: 'Two simple questions.',
    /** Rendered as the two questions themselves, not as a paragraph about them. */
    questions: ['How are you?', 'How did you take care of yourself today?'],
  },
  {
    kicker: 'WHAT YOU GET',
    title: 'See what works and why.',
    body: 'Taking this daily pause gives you a clear look at what actually protects your peace over time. And you are not working it out alone — Tended is a community of educators sharing what they do to take care of themselves, so you can learn from people who know the job.',
  },
];

const VERIFY_STEP = STORY.length;
const IDENTITY_STEP = VERIFY_STEP + 1;
const CONTEXT_STEP = IDENTITY_STEP + 1;
const STEPS = CONTEXT_STEP + 1;

export function Onboarding() {
  const { completeOnboarding } = useStore();
  const { topInset } = useChrome();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState<UsernameState>('empty');
  const [job, setJob] = useState('');
  const [level, setLevel] = useState('');
  const [zip, setZip] = useState('');
  const [years, setYears] = useState('');
  const [showJob, setShowJob] = useState(true);
  const [showLevel, setShowLevel] = useState(true);
  const [showState, setShowState] = useState(true);
  const [showYears, setShowYears] = useState(true);

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () =>
    completeOnboarding({
      name,
      email,
      shown: {
        displayName,
        username,
        job: showJob ? job : '',
        level: showLevel ? level : '',
        zip,
        state: '',
        years: showYears && years.trim() ? Number(years) : null,
        showJob,
        showLevel,
        showState,
        showYears,
      },
      // Nobody starts with a list. Habits arrive from the feed, or from the
      // add row on the profile, once there is a reason to want one.
      practices: [],
    });

  // What the byline will look like, built the same way the feed builds it.
  const preview = [
    showJob && job,
    showLevel && level,
    showState && stateForZip(zip),
    showYears && years.trim() ? yearsLabel(Number(years)) : '',
  ]
    .filter(Boolean)
    .join(' · ');
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
            {story.body && (
              <Body size={15} style={{ marginTop: 16 }}>
                {story.body}
              </Body>
            )}
            {/* The two questions are the screen, so they are set as questions
                rather than described in a sentence about them. */}
            {story.questions && (
              <View style={styles.questions}>
                {story.questions.map((q) => (
                  <View key={q} style={styles.questionRow}>
                    <View style={styles.questionDot} />
                    <Text style={styles.questionText}>{q}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {step === VERIFY_STEP && (
          <>
            <Display size={29} style={{ marginTop: 12 }}>
              Join with your school email.
            </Display>
            <Body size={15} tone={color.muted} style={{ marginTop: 10 }}>
              Used only to confirm you work in education.
            </Body>

            <MonoLabel style={{ marginTop: 22 }}>YOUR NAME</MonoLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="First and last"
              placeholderTextColor={color.faint}
              style={styles.input}
              autoCapitalize="words"
              accessibilityLabel="Your name"
            />

            <VerifyForm
              onVerified={(address) => {
                setEmail(address);
                // Sensible defaults they can overwrite next. The username is
                // only a suggestion — it still has to pass the availability
                // check before they can move on.
                setDisplayName((d) => d || name.trim());
                setUsername((u) => u || normalizeUsername(name));
                next();
              }}
            />

            <Text style={styles.privacy}>
              Your check-ins are 100% private. We never share your email, school name, or data.
            </Text>
          </>
        )}

        {step === IDENTITY_STEP && (
          <>
            <Display size={29} style={{ marginTop: 12 }}>
              Choose how you appear.
            </Display>
            <Body size={15} tone={color.muted} style={{ marginTop: 10 }}>
              What you share on feed posts is completely up to you.
            </Body>

            <MonoLabel style={{ marginTop: 24 }}>DISPLAY NAME</MonoLabel>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name, initials, or anything"
              placeholderTextColor={color.faint}
              style={styles.input}
              accessibilityLabel="The name shown on your posts"
            />

            <MonoLabel style={{ marginTop: 22 }}>USERNAME</MonoLabel>
            <UsernameField
              value={username}
              onChange={setUsername}
              taken={TAKEN_USERNAMES}
              onStateChange={setUsernameState}
            />

            <MonoLabel style={{ marginTop: 22 }}>ROLE</MonoLabel>
            <View style={styles.chips}>
              {JOBS.map((label) => {
                const on = job === label;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setJob(on ? '' : label)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === CONTEXT_STEP && (
          <>
            <Display size={29} style={{ marginTop: 12 }}>
              Choose how you appear.
            </Display>
            <Body size={15} tone={color.muted} style={{ marginTop: 10 }}>
              What you share on feed posts is completely up to you.
            </Body>

            <View style={styles.fieldHead}>
              <MonoLabel>YEARS IN EDUCATION</MonoLabel>
              <Toggle value={showYears} onChange={setShowYears} label="Show my years in education" />
            </View>
            <TextInput
              value={years}
              onChangeText={(t) => setYears(t.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="0"
              placeholderTextColor={color.faint}
              style={[styles.input, !showYears && styles.inputMuted]}
              keyboardType="number-pad"
              editable={showYears}
              accessibilityLabel="Years you have worked in education"
            />

            <View style={styles.fieldHead}>
              <MonoLabel>LEVEL</MonoLabel>
              <Toggle value={showLevel} onChange={setShowLevel} label="Show my level" />
            </View>
            <View style={[styles.chips, { marginTop: 10 }, !showLevel && styles.inputMuted]}>
              {LEVELS.map((label) => {
                const on = level === label;
                return (
                  <Pressable
                    key={label}
                    onPress={() => showLevel && setLevel(on ? '' : label)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.fieldHead}>
              <MonoLabel>SCHOOL ZIP CODE</MonoLabel>
              <Toggle value={showState} onChange={setShowState} label="Show my state" />
            </View>
            <TextInput
              value={zip}
              onChangeText={(t) => setZip(normalizeZip(t))}
              placeholder="20002"
              placeholderTextColor={color.faint}
              style={[styles.input, !showState && styles.inputMuted]}
              keyboardType="number-pad"
              maxLength={5}
              accessibilityLabel="Your school's ZIP code"
            />
            {/* The ZIP is never shown on a post. It resolves to the state, and
                it is what "near my school" is matched on. */}
            <Text style={styles.hint}>
              {!zip
                ? 'Your school’s, not your home. Shows as your state, and finds teachers near you.'
                : (stateName(stateForZip(zip)) ??
                  (isCompleteZip(zip) ? 'We do not recognize that ZIP.' : 'Five digits.'))}
            </Text>

            <MonoLabel style={{ marginTop: 26 }}>PREVIEW</MonoLabel>
            <View style={styles.preview}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewLetter}>
                  {(displayName.trim() || name.trim() || '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.previewNameRow}>
                  <Text style={styles.previewName}>
                    {displayName.trim() || name.trim() || 'Your name'}
                  </Text>
                  {!!username && <Text style={styles.previewUser}>@{username}</Text>}
                </View>
                <MonoLabel size={9} em={0.08} tone={color.faint}>
                  {preview || 'NOTHING ELSE SHOWN'}
                </MonoLabel>
              </View>
            </View>
          </>
        )}

        <View style={styles.footer}>
          {step === CONTEXT_STEP ? (
            <Primary label="Start tracking" onPress={finish} />
          ) : step === IDENTITY_STEP ? (
            // A username is the one field here that can fail for a reason
            // outside the teacher's control, so the button says which of the
            // two things is missing rather than sitting greyed out in silence.
            <Primary
              label={
                !displayName.trim()
                  ? 'Add a display name'
                  : usernameState === 'available'
                    ? 'Looks good'
                    : usernameState === 'taken'
                      ? 'That username is taken'
                      : usernameState === 'checking'
                        ? 'Checking username…'
                        : 'Choose a username'
              }
              disabled={!displayName.trim() || usernameState !== 'available'}
              onPress={next}
            />

          ) : step === VERIFY_STEP ? (
            // The primary action on this step lives inside VerifyForm.
            <View />
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
  questions: {
    marginTop: 22,
    gap: 16,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questionDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: color.accent,
    opacity: 0.55,
  },
  questionText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 25,
    color: color.ink,
  },
  fieldHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  privacy: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.label,
    marginTop: 18,
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },
  optionCopy: {
    flex: 1,
  },
  inputMuted: {
    opacity: 0.45,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 10,
    padding: 14,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
  },
  previewAvatar: {
    width: 30,
    height: 30,
    borderRadius: 99,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  previewNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 2,
  },
  previewName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
    flexShrink: 1,
  },
  previewUser: {
    fontSize: 12.5,
    color: color.faint,
    flexShrink: 1,
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
