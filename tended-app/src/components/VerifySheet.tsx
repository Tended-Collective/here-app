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
  onVerified: () => void;
}) {
  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <MonoLabel tone={color.accent}>ONE CHECK</MonoLabel>
        <Display size={26} lineHeight={1.2} style={{ marginTop: 10 }}>
          Are you an educator?
        </Display>
        <Body style={{ marginTop: 10 }}>
          The nearby feed is teachers only. A code to your school address is how we keep it that way
          — then the address is discarded. We keep that you verified, and nothing else.
        </Body>
        <VerifyForm
          onVerified={() => {
            onVerified();
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
