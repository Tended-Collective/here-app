import { BlurView } from 'expo-blur';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color } from '../theme';
import { useChrome } from './PhoneFrame';

export type TabKey = 'today' | 'record' | 'area' | 'support';

/**
 * "My Plan" is the Support tab, which is where the self-care plan lives, so it
 * moves ahead of the area view — the order follows the labels.
 */
const TABS: { key: TabKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'record', label: 'Stats' },
  { key: 'support', label: 'My Plan' },
  { key: 'area', label: 'More' },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const { tabBarHeight } = useChrome();

  return (
    <BlurView intensity={24} tint="light" style={[styles.bar, { height: tabBarHeight }]}>
      <View style={styles.row}>
        {TABS.map((tab) => {
          const on = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={tab.label}
              style={styles.item}
            >
              <View
                style={[styles.mark, { backgroundColor: on ? color.accent : 'transparent' }]}
              />
              <Text style={[styles.label, { color: on ? color.ink : color.tabIdle }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: color.hairline,
    backgroundColor: 'rgba(246,245,242,0.94)',
    zIndex: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  mark: {
    width: 20,
    height: 2,
    borderRadius: 2,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
