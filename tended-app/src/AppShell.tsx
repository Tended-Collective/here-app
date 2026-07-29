import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useChrome } from './components/PhoneFrame';
import { TabBar, TabKey } from './components/TabBar';
import { AreaScreen } from './screens/AreaScreen';
import { RecordScreen } from './screens/RecordScreen';
import { SupportScreen } from './screens/SupportScreen';
import { TodayScreen } from './screens/TodayScreen';
import { color, SCREEN_PADDING } from './theme';

export function AppShell() {
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
    </View>
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
