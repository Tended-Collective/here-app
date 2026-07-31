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

export type SheetName = 'plus' | 'verify' | 'report' | 'delete';

type SheetsValue = {
  current: SheetName | null;
  /**
   * What the sheet is about, when it needs to know. Report is opened from a
   * particular post by a particular author, and the sheet is mounted at the app
   * root rather than in the card — so the subject travels with the request
   * instead of being duplicated as state in every screen that can open one.
   */
  subject: { updateId: string; authorId: string } | null;
  open: (name: SheetName, subject?: { updateId: string; authorId: string }) => void;
  close: () => void;
};

const SheetsContext = createContext<SheetsValue | null>(null);

export function SheetsProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<SheetName | null>(null);
  const [subject, setSubject] = useState<SheetsValue['subject']>(null);
  const value = useMemo<SheetsValue>(
    () => ({
      current,
      subject,
      open: (name, next) => {
        setSubject(next ?? null);
        setCurrent(name);
      },
      close: () => setCurrent(null),
    }),
    [current, subject],
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
