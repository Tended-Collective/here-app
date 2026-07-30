import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CrisisSheet } from './components/CrisisSheet';
import { useChrome } from './components/PhoneFrame';
import { PlusSheet } from './components/PlusSheet';
import { PracticeEditor } from './components/PracticeEditor';
import { SheetsProvider, useSheets } from './components/Sheet';
import { TabBar, TabKey } from './components/TabBar';
import { AreaScreen } from './screens/AreaScreen';
import { RecordScreen } from './screens/RecordScreen';
import { SupportScreen } from './screens/SupportScreen';
import { TodayScreen } from './screens/TodayScreen';
import { CrisisLine } from './data/mock';
import { useStore } from './store';
import { color, SCREEN_PADDING } from './theme';

export function AppShell() {
  return (
    <SheetsProvider>
      <Shell />
    </SheetsProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabKey>('today');
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
        {tab === 'today' && <TodayScreen />}
        {tab === 'record' && <RecordScreen />}
        {tab === 'area' && <AreaScreen />}
        {tab === 'support' && <SupportScreen />}
      </ScrollView>

      <TabBar active={tab} onChange={select} />

      {/* Sheets live above the tab bar and inside the device, so they are
          mounted here rather than in the screen that opens them. */}
      <Sheets />
    </View>
  );
}

function Sheets() {
  const { current, payload, close } = useSheets();
  const {
    practices,
    addPractice,
    removePractice,
    plusActive,
    trialDaysLeft,
    startTrial,
    endTrial,
  } = useStore();

  return (
    <>
      <PracticeEditor
        visible={current === 'practices'}
        onClose={close}
        practices={practices}
        onAdd={addPractice}
        onRemove={removePractice}
      />
      <CrisisSheet
        visible={current === 'crisis'}
        line={(payload as CrisisLine | undefined) ?? null}
        onClose={close}
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
