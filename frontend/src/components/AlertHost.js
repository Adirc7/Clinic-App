// In-app pop-up cards for every Alert.alert(...) in the app.
// Mount <AlertHost /> once (App.js). From then on Alert.alert shows a styled
// MediCare card on phone AND web, instead of the plain system dialog
// (which also does nothing at all in the browser).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

const KINDS = {
  success: { icon: 'checkmark-circle', fg: colors.success, bg: colors.successSoft },
  error: { icon: 'close-circle', fg: colors.danger, bg: colors.dangerSoft },
  warning: { icon: 'alert-circle', fg: colors.warning, bg: colors.warningSoft },
  question: { icon: 'help-circle', fg: colors.primary, bg: colors.primarySoft },
  info: { icon: 'information-circle', fg: colors.info, bg: colors.infoSoft },
};

// Remove leading emoji like "✅ " from titles — the card shows its own icon
const cleanTitle = (t = '') => t.replace(/^[^\p{L}\p{N}]+/u, '').trim();

// Pick the card style from the wording, so existing Alert.alert calls need no changes
const kindOf = (title = '', message = '', buttons = []) => {
  const t = `${title} ${message}`.toLowerCase();
  if (/✅|success|created|confirmed|saved|updated|added|uploaded|paid|done|approved|sent|removed|cancelled\b/.test(title.toLowerCase()) && !/fail|error/.test(t)) return 'success';
  if (/fail|error|invalid|denied|incorrect|not found|unable|cannot|can't|couldn't|wrong|expired|deactivated|unavailable/.test(t)) return 'error';
  if (buttons.length > 1) return 'question';
  if (/required|restricted|missing|incomplete|warning|not possible|select|please/.test(t)) return 'warning';
  return 'info';
};

let enqueue = null;
const nativeAlert = Alert.alert.bind(Alert);

Alert.alert = (title, message, buttons, options) => {
  if (!enqueue) return nativeAlert(title, message, buttons, options); // host not mounted yet
  enqueue({ title: title || '', message: message || '', buttons: Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }] });
};

export default function AlertHost() {
  const [queue, setQueue] = useState([]);
  const busy = useRef(false);

  useEffect(() => {
    enqueue = (item) => setQueue((q) => [...q, item]);
    return () => { enqueue = null; };
  }, []);

  const current = queue[0];

  const press = useCallback((button) => {
    if (busy.current) return;
    busy.current = true;
    setQueue((q) => q.slice(1));
    // Run the action after the card closes (it may open another card or navigate)
    setTimeout(() => {
      busy.current = false;
      button?.onPress?.();
    }, 180);
  }, []);

  if (!current) return null;

  const kind = KINDS[kindOf(current.title, current.message, current.buttons)];
  // Show the main action last (right / bottom), cancel first
  const buttons = [...current.buttons].sort((a, b) => (a.style === 'cancel' ? -1 : 0) - (b.style === 'cancel' ? -1 : 0));
  const stacked = buttons.length > 2 || buttons.some((b) => (b.text || '').length > 14);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => press(buttons.find((b) => b.style === 'cancel') || buttons[0])}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: kind.bg }]}>
            <Ionicons name={kind.icon} size={34} color={kind.fg} />
          </View>
          {current.title ? <Text style={styles.title}>{cleanTitle(current.title)}</Text> : null}
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}

          <View style={[styles.buttons, stacked && styles.buttonsStacked]}>
            {buttons.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDanger = b.style === 'destructive';
              const isMain = !isCancel && i === buttons.length - 1;
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => press(b)}
                  style={({ pressed }) => [
                    styles.btn,
                    !stacked && { flex: 1 },
                    isCancel && styles.btnGhost,
                    !isCancel && !isMain && !isDanger && styles.btnSoft,
                    isMain && !isDanger && { backgroundColor: kind === KINDS.error ? colors.primary : kind.fg === colors.info ? colors.primary : kind.fg },
                    isDanger && { backgroundColor: colors.danger },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.btnText, (isCancel || (!isMain && !isDanger)) && { color: colors.ink }]}>
                    {b.text || 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(6,30,34,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: radius.xl, padding: 22, alignItems: 'center' },
  iconWrap: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  message: { fontSize: 14, color: colors.body, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
  buttonsStacked: { flexDirection: 'column-reverse' },
  btn: { height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colors.primary },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
  btnSoft: { backgroundColor: colors.primarySoft },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
