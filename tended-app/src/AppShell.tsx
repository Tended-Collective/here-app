import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useChrome } from './components/PhoneFrame';
import { DeleteAccountSheet } from './components/DeleteAccountSheet';
import { PlusSheet } from './components/PlusSheet';
import { ReportSheet } from './components/ReportSheet';
import { SheetsProvider, useSheets } from './components/Sheet';
import { VerifySheet } from './components/VerifySheet';
import { TabBar, TabKey } from './components/TabBar';
import { FeedScreen } from './screens/FeedScreen';
import { Onboarding } from './screens/Onboarding';
import { ProfileScreen } from './screens/ProfileScreen';
import { useStore } from './store';
import { color, SCREEN_PADDING } from './theme';

export function AppShell() {
  const { hydrated, onboardedAt } = useStore();

  // Nothing until storage has been read, or onboarding flashes over a returning
  // teacher's app for a frame.
  if (!hydrated) return <View style={styles.root} />;
  if (onboardedAt === null) return <Onboarding />;

  return (
    <SheetsProvider>
      <Shell />
    </SheetsProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabKey>('feed');
  const { topInset, tabBarHeight } = useChrome();
  const scroller = useRef<ScrollView>(null);

  const select = (next: TabKey) => {
    setTab(next);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroller}
        style={[styles.scroll, { marginTop: topInset, marginBottom: tabBarHeight }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'feed' && <FeedScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </ScrollView>

      <TabBar active={tab} onChange={select} />

      {/* Sheets live above the tab bar and inside the device, so they are
          mounted here rather than in the screen that opens them. */}
      <Sheets />
    </View>
  );
}

function Sheets() {
  const { current, subject, close } = useSheets();
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
      <DeleteAccountSheet visible={current === 'delete'} onClose={close} />
      <VerifySheet
        visible={current === 'verify'}
        onClose={close}
        onVerified={(outcome) =>
          setVerified(
            outcome.method === 'email'
              ? { email: outcome.email }
              : { vouchedBy: outcome.vouchedBy },
          )
        }
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
