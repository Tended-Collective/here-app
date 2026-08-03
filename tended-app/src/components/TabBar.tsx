/**
 * The navigation bar, rebuilt as the floating icon pill Threads uses.
 *
 * Two things change from the text-label version. It floats — the content scrolls
 * underneath it rather than stopping above a full-width band, which gives a
 * short screen back about 80px of reading height. And the items are icons, which
 * is what makes five of them fit; "Feed / Messages / Profile / Settings" as
 * words does not.
 *
 * Icons alone are a real cost for anyone who has not learned them, so every item
 * carries an accessibility label and the centre item is the one glyph everybody
 * already knows. The compose button is not a tab: it takes you to the feed and
 * puts the cursor in the box, because that is where posting happens.
 *
 * There were five items. Messages has been removed for a later rollout, which
 * leaves four — still more than fits as words, and the pill is better balanced
 * with compose in the middle of an even number than off-centre in an odd one.
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { color } from '../theme';
import { Icon, IconName } from './Icon';
import { useChrome } from './PhoneFrame';

export type TabKey = 'feed' | 'profile' | 'settings';

/** What the pill can ask for: a tab, or the compose action in the middle. */
export type NavAction = TabKey | 'compose';

const ITEMS: { key: NavAction; icon: IconName; label: string }[] = [
  { key: 'feed', icon: 'home', label: 'Feed' },
  { key: 'compose', icon: 'plus', label: 'Write a post' },
  { key: 'profile', icon: 'person', label: 'Profile' },
  { key: 'settings', icon: 'gear', label: 'Settings' },
];

export function TabBar({
  active,
  onSelect,
}: {
  active: TabKey;
  onSelect: (action: NavAction) => void;
}) {
  const { tabBarHeight } = useChrome();

  return (
    // box-none so the transparent margins either side of the pill do not eat
    // taps meant for the post underneath.
    <View style={[styles.bar, { height: tabBarHeight }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {ITEMS.map((item) => {
          const on = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              accessibilityRole={item.key === 'compose' ? 'button' : 'tab'}
              accessibilityState={item.key === 'compose' ? undefined : { selected: on }}
              accessibilityLabel={item.label}
              style={styles.item}
            >
              <Icon
                name={item.icon}
                size={item.key === 'compose' ? 26 : 24}
                tone={on ? color.ink : color.tabIdle}
                filled={on && item.key === 'feed'}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    // Above the content, below the sheets.
    zIndex: 7,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    // Wide enough to be reachable, narrow enough to read as floating.
    width: '86%',
    maxWidth: 360,
    height: 58,
    marginBottom: 6,
    paddingHorizontal: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: color.hairline,
    // Near-opaque rather than a blur: a blur over a photo in the feed turns the
    // icons to mush, and this palette has no contrast to spare.
    backgroundColor: 'rgba(252,251,249,0.96)',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.10)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      },
    }),
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
