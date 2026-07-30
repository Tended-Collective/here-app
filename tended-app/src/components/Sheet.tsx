/**
 * Bottom sheets, and the one place they are mounted.
 *
 * React Native's `Modal` portals to the document root on web, which puts a
 * sheet outside the device mock the framed preview draws — it slides up across
 * the whole browser window instead of across the phone. `SheetShell` is an
 * absolutely-positioned overlay instead, so a sheet is clipped by whatever
 * contains it. That means it has to be mounted at the app root rather than
 * inside a screen's ScrollView, where it would scroll with the content.
 *
 * `SheetsProvider` is that mount point: screens ask for a sheet by name and
 * AppShell renders it, over the tab bar and inside the phone.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius } from '../theme';

export function SheetShell({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <View style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>{children}</View>
    </View>
  );
}

export type SheetName = 'plus' | 'practices' | 'crisis';

type SheetsValue = {
  current: SheetName | null;
  /** Whatever the opener passed — the crisis sheet uses it to carry its line. */
  payload: unknown;
  open: (name: SheetName, payload?: unknown) => void;
  close: () => void;
};

const SheetsContext = createContext<SheetsValue | null>(null);

export function SheetsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ current: SheetName | null; payload: unknown }>({
    current: null,
    payload: undefined,
  });
  const value = useMemo<SheetsValue>(
    () => ({
      current: state.current,
      payload: state.payload,
      open: (name, payload) => setState({ current: name, payload }),
      close: () => setState({ current: null, payload: undefined }),
    }),
    [state],
  );
  return <SheetsContext.Provider value={value}>{children}</SheetsContext.Provider>;
}

export function useSheets(): SheetsValue {
  const value = useContext(SheetsContext);
  if (!value) throw new Error('useSheets must be used inside <SheetsProvider>');
  return value;
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  sheet: {
    backgroundColor: color.ground,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
});
