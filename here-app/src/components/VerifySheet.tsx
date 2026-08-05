/**
 * The educator check, for someone who skipped it during onboarding. Same form,
 * same promise — the feed is the only thing behind it.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { color } from '../theme';
import { SheetShell } from './Sheet';
import { Body, Display, MonoLabel } from './ui';
import { VerifyForm } from './VerifyForm';

export function VerifySheet({
  visible,
  onClose,
  onVerified,
}: {
  visible: boolean;
  onClose: () => void;
  onVerified: (email: string) => void;
}) {
  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <MonoLabel tone={color.accent}>VERIFY</MonoLabel>
        <Display size={26} lineHeight={1.2} style={{ marginTop: 10 }}>
          Verify your school email
        </Display>
        <Body style={{ marginTop: 10 }}>
          We check your work address once to confirm you are an educator, then delete it. We store
          only that you verified and the date.
        </Body>
        <VerifyForm
          onVerified={(email) => {
            onVerified(email);
            onClose();
          }}
        />
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 20,
    paddingBottom: 30,
  },
});
