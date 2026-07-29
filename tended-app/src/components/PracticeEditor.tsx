/**
 * "Edit my practices" / "Add one" have no screen in the v3 design — the
 * prototype assumes practices were chosen once, at onboarding, which this
 * simplified app never built. This sheet is the minimum needed to make both
 * buttons real: remove a practice, add one, done. It borrows the app's own
 * card, divider and pill-button vocabulary rather than introducing a new one.
 */

import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Practice } from '../store';
import { color, radius } from '../theme';
import { Display } from './ui';

export function PracticeEditor({
  visible,
  onClose,
  practices,
  onAdd,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  practices: Practice[];
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Display size={22} lineHeight={1.15}>
              Your practices
            </Display>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <Text style={styles.closeMark}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {practices.length === 0 && (
              <Text style={styles.empty}>No practices yet — add the first one below.</Text>
            )}
            {practices.map((p) => (
              <View key={p.id} style={styles.row}>
                <View style={[styles.swatch, { backgroundColor: p.fill, borderColor: p.border }]} />
                <Text style={styles.rowLabel}>{p.label}</Text>
                <Pressable
                  onPress={() => onRemove(p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${p.label}`}
                  style={styles.removeMark}
                  hitSlop={8}
                >
                  <Text style={styles.removeGlyph}>–</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.addRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Name a practice"
              placeholderTextColor={color.faint}
              style={styles.input}
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            <Pressable
              onPress={submit}
              disabled={!draft.trim()}
              accessibilityRole="button"
              style={[styles.addButton, { opacity: draft.trim() ? 1 : 0.4 }]}
            >
              <Text style={styles.addLabel}>Add</Text>
            </Pressable>
          </View>

          <Pressable onPress={onClose} accessibilityRole="button" style={styles.done}>
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.ground,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: 20,
    paddingBottom: 32,
    gap: 4,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeMark: {
    fontSize: 16,
    color: color.label,
    padding: 4,
  },
  list: {
    marginTop: 14,
    gap: 2,
  },
  empty: {
    fontSize: 14,
    color: color.muted,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 99,
    borderWidth: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: color.ink,
  },
  removeMark: {
    width: 26,
    height: 26,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeGlyph: {
    fontSize: 16,
    lineHeight: 16,
    color: color.muted,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    fontSize: 14,
    color: color.ink,
    backgroundColor: color.card,
  },
  addButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  done: {
    height: 50,
    marginTop: 20,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: color.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
});
