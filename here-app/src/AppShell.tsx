import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useChrome } from './components/PhoneFrame';
import { DeleteAccountSheet } from './components/DeleteAccountSheet';
import { PlusSheet } from './components/PlusSheet';
import { CommentsSheet } from './components/CommentsSheet';
import { ReportSheet } from './components/ReportSheet';
import { RulesSheet } from './components/RulesSheet';
import { SheetsProvider, useSheets } from './components/Sheet';
import { VerifySheet } from './components/VerifySheet';
import { NavAction, TabBar, TabKey } from './components/TabBar';
import { FeedScreen } from './screens/FeedScreen';
import { Onboarding } from './screens/Onboarding';
import { PersonScreen } from './screens/PersonScreen';
import { SignIn } from './screens/SignIn';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useStore } from './store';
import { color, SCREEN_PADDING } from './theme';

export function AppShell() {
  const { hydrated, onboardedAt, signedOutAt } = useStore();
  /**
   * Which door to show when there is no session: sign-up, or sign-in.
   *
   * A returning teacher on a phone that still holds their account lands
   * straight on the feed and never sees either — that is the common case and it
   * costs nothing. This only decides what someone *without* a session sees
   * first, and either door can reach the other.
   */
  const [door, setDoor] = useState<'signup' | 'signin'>('signup');

  /**
   * Every sign-out is a fresh arrival at the front door, whichever side of it
   * they were last on.
   *
   * Without this the choice is sticky: sign in once through the Log in chip and
   * `door` stays on `signin` for the rest of the process, so the *next* sign-out
   * drops onto the lock screen again and the cover is never seen. Keyed on the
   * timestamp, so moving between the two doors inside one signed-out session
   * still works — it only resets when a new sign-out happens.
   */
  useEffect(() => {
    if (signedOutAt !== null) setDoor('signup');
  }, [signedOutAt]);

  // Nothing until storage has been read, or onboarding flashes over a returning
  // teacher's app for a frame.
  if (!hydrated) return <View style={styles.root} />;

  /**
   * No session — either never signed up, or signed out on purpose. Both land on
   * the front door, and the front door is the cover.
   *
   * Signing out used to drop straight onto the sign-in form. It was the shorter
   * route and it was the wrong one: the button says *sign out*, and what should
   * follow is the way out of the app, not a lock screen demanding you come
   * straight back. Someone signing out at the end of term should get the front
   * of the app the way anyone else sees it.
   *
   * Nothing is lost by the extra step. The cover carries a Log in chip, and
   * typing the address this phone already holds signs you back in from there
   * without going near sign-up (see Onboarding's `onStart`).
   */
  if (onboardedAt === null || signedOutAt !== null) {
    return door === 'signin' ? (
      <SignIn onCreateAccount={() => setDoor('signup')} />
    ) : (
      <Onboarding onSignIn={() => setDoor('signin')} />
    );
  }

  return (
    <SheetsProvider>
      <Shell />
    </SheetsProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabKey>('feed');
  // Bumped by the compose button. The feed watches it and focuses its box —
  // a counter rather than a boolean, so pressing + twice works twice.
  const [composeAt, setComposeAt] = useState(0);
  // Which post's comments are open, if any. Held here because the sheet is
  // mounted at the shell — see components/Sheet.tsx for why.
  const [commentsOn, setCommentsOn] = useState<string | null>(null);
  /**
   * Whose page is open over the tabs, if any: an author id, `null` for the
   * teacher's own, and `undefined` for nobody. A layer rather than a fourth tab
   * — you arrive from a post and Back returns you to it, and the tab bar keeps
   * working underneath, which is how every other feed behaves.
   */
  const [person, setPerson] = useState<string | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const { refresh } = useStore();
  const { topInset, tabBarHeight } = useChrome();
  const scroller = useRef<ScrollView>(null);

  const select = (next: NavAction) => {
    // Compose is not a place, it is an action: it takes you to the feed, where
    // the box is, and puts the cursor in it.
    if (next === 'compose') {
      setTab('feed');
      setComposeAt((n) => n + 1);
    } else {
      setTab(next);
    }
    setCommentsOn(null);
    // A tab press leaves the person layer. Otherwise tapping Feed from
    // somebody's page appears to do nothing.
    setPerson(undefined);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };

  const openPerson = (authorId: string | null) => {
    setPerson(authorId);
    setCommentsOn(null);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };

  /**
   * Pull down to refresh. One gesture at the shell, so it works on every tab
   * rather than only on the feed — the record and the list are just as capable
   * of being stale, and a gesture that works on one screen and silently does
   * nothing on the next is worse than not having it.
   *
   * The minimum spin is deliberate. Re-reading one AsyncStorage row takes a few
   * milliseconds and the spinner would vanish before it had finished appearing,
   * which reads as "the gesture did not register" and makes people pull again.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), new Promise((r) => setTimeout(r, 450))]);
    setRefreshing(false);
  }, [refresh]);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroller}
        style={[styles.scroll, { marginTop: topInset }]}
        // The tab bar floats, so content scrolls under it rather than stopping
        // above a band — but the last card still has to clear the pill.
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color.faint}
            colors={[color.accent]}
          />
        }
      >
        {person !== undefined ? (
          <PersonScreen
            authorId={person}
            onBack={() => setPerson(undefined)}
            onComments={(postId) => setCommentsOn(postId)}
          />
        ) : (
          <>
            {tab === 'feed' && (
              <FeedScreen
                composeAt={composeAt}
                onComments={(postId) => setCommentsOn(postId)}
                onOpenAuthor={openPerson}
              />
            )}
            {tab === 'profile' && (
              <ProfileScreen
                onEditProfile={() => select('settings')}
                onOpenPosts={() => openPerson(null)}
              />
            )}
            {tab === 'settings' && <SettingsScreen />}
          </>
        )}
      </ScrollView>

      <TabBar active={tab} onSelect={select} />

      {/* Sheets live above the tab bar and inside the device, so they are
          mounted here rather than in the screen that opens them. */}
      <Sheets commentsOn={commentsOn} closeComments={() => setCommentsOn(null)} />
    </View>
  );
}

function Sheets({
  commentsOn,
  closeComments,
}: {
  commentsOn: string | null;
  closeComments: () => void;
}) {
  const { current, subject, close, open } = useSheets();
  const {
    plusActive,
    trialDaysLeft,
    startTrial,
    endTrial,
    setVerified,
  } = useStore();

  return (
    <>
      <ReportSheet visible={current === 'report'} onClose={close} subject={subject} />
      <CommentsSheet
        visible={commentsOn !== null && current === null}
        postId={commentsOn}
        onClose={closeComments}
        // Reporting a comment reports its author. The comment's own id is not
        // stable across a reload — their side is sample content — so blocking
        // the account is the part that has to work, and it does.
        onReport={(authorId) =>
          open('report', { updateId: `comment:${authorId}`, authorId, kind: 'comment' })
        }
      />
      <RulesSheet visible={current === 'rules'} onClose={close} />
      <DeleteAccountSheet visible={current === 'delete'} onClose={close} />
      <VerifySheet
        visible={current === 'verify'}
        onClose={close}
onVerified={(email) => setVerified(email)}
      />
      <PlusSheet
        visible={current === 'plus'}
        onClose={close}
        active={plusActive}
        daysLeft={trialDaysLeft}
        onStart={startTrial}
        onEnd={() => {
          endTrial();
          close();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.ground,
  },
  scroll: {
    flex: 1,
  },
  content: {
    ...SCREEN_PADDING,
  },
});
