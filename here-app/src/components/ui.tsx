/** Shared primitives: the type roles and the white card the whole app is built from. */

import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { color, font, monoLabel, radius } from '../theme';

/** IBM Plex Mono, uppercase and tracked out — every small label in the app. */
export function MonoLabel({
  children,
  size = 10,
  em = 0.14,
  tone = color.label,
  bold = false,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  em?: number;
  tone?: string;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[monoLabel(size, em, bold), { color: tone }, style]}>{children}</Text>;
}

/** Newsreader at light weight — anything that speaks to the teacher. */
export function Display({
  children,
  size = 38,
  lineHeight = 1.08,
  tone = color.ink,
  weight = 'light',
  style,
}: {
  children: React.ReactNode;
  size?: number;
  lineHeight?: number;
  tone?: string;
  weight?: 'light' | 'regular';
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        {
          fontFamily: weight === 'light' ? font.displayLight : font.displayRegular,
          fontSize: size,
          lineHeight: Math.round(size * lineHeight),
          color: tone,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** System sans running text. */
export function Body({
  children,
  size = 13.5,
  lineHeight = 1.55,
  tone = color.body,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  lineHeight?: number;
  tone?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[{ fontSize: size, lineHeight: size * lineHeight, color: tone }, style]}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

/** The mono kicker + display headline that opens every tab. */
export function ScreenHeading({
  kicker,
  title,
  titleGap = 10,
}: {
  kicker: string;
  title: string;
  titleGap?: number;
}) {
  return (
    <View>
      <MonoLabel>{kicker}</MonoLabel>
      <Display style={{ marginTop: titleGap }}>{title}</Display>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.card,
  },
  divider: {
    height: 1,
    backgroundColor: color.divider,
  },
});
