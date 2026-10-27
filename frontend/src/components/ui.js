// Shared UI building blocks for the MediCare design.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radius, shadow, statusColors, type } from '../theme';

/** Teal gradient header that extends under the status bar, with curved bottom. */
export function GradientHeader({ children, style, contentStyle, curve = true, colorsOverride }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={colorsOverride || gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, curve && styles.headerCurve, { paddingTop: insets.top + 12 }, style]}
    >
      {/* soft decorative circles */}
      <View pointerEvents="none" style={[styles.blob, { width: 220, height: 220, top: -80, right: -60 }]} />
      <View pointerEvents="none" style={[styles.blob, { width: 140, height: 140, bottom: -50, left: -40, opacity: 0.06 }]} />
      <View style={contentStyle}>{children}</View>
    </LinearGradient>
  );
}

/** Simple top bar for inner screens: back button + title + optional right element. */
export function TopBar({ title, onBack, right, light = false }) {
  const fg = light ? '#fff' : colors.ink;
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={[styles.iconBtn, light && styles.iconBtnLight]}>
          <Ionicons name="chevron-back" size={20} color={fg} />
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Text style={[styles.topBarTitle, { color: fg }]} numberOfLines={1}>{title}</Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/** Header round icon button (bell, logout…) on a gradient. */
export function HeaderIconButton({ icon, onPress, badge }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.headerIconBtn}>
      <Ionicons name={icon} size={20} color="#fff" />
      {badge ? <View style={styles.badgeDot} /> : null}
    </Pressable>
  );
}

export function Card({ children, style, onPress }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction, style }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={type.h2}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Primary (gradient) / secondary / ghost / danger button. */
export function Button({ title, onPress, icon, variant = 'primary', loading, disabled, style, small }) {
  const isDisabled = disabled || loading;
  const height = small ? 42 : 54;
  const content = (
    <View style={styles.btnInner}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={small ? 16 : 18}
              color={variant === 'primary' || variant === 'danger' ? '#fff' : variant === 'secondary' ? colors.primary : colors.body}
            />
          ) : null}
          <Text
            style={[
              styles.btnText,
              small && { fontSize: 14 },
              variant === 'secondary' && { color: colors.primary },
              variant === 'ghost' && { color: colors.body },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === 'primary' || variant === 'danger') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [{ opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1 }, style]}>
        <LinearGradient
          colors={variant === 'danger' ? ['#EF4444', '#DC2626'] : gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, { height }, !isDisabled && shadow.button]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { height },
        variant === 'secondary' && styles.btnSecondary,
        variant === 'ghost' && styles.btnGhost,
        { opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function StatusBadge({ status, style }) {
  const c = statusColors[status] || { fg: colors.body, bg: colors.surfaceAlt, icon: 'ellipse-outline' };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Ionicons name={c.icon} size={12} color={c.fg} />
      <Text style={[styles.badgeText, { color: c.fg }]}>{status}</Text>
    </View>
  );
}

/** Square tile with a coloured icon — for quick actions and stats. */
export function IconTile({ icon, color = colors.primary, bg = colors.primarySoft, size = 48, iconSize = 22, style }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={icon} size={iconSize} color={color} />
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, message, action, onAction }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={[type.h3, { textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[type.body, { textAlign: 'center', marginTop: 6 }]}>{message}</Text> : null}
      {action ? <Button title={action} onPress={onAction} variant="secondary" small style={{ marginTop: 16, paddingHorizontal: 20 }} /> : null}
    </View>
  );
}

/** Label/value row used in details sections. */
export function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} style={{ marginRight: 12 }} /> : null}
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  headerCurve: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: '#FFFFFF', opacity: 0.08 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  topBarTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', marginHorizontal: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  iconBtnLight: { backgroundColor: 'rgba(255,255,255,0.16)', shadowOpacity: 0, elevation: 0 },
  headerIconBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FBBF24', borderWidth: 1.5, borderColor: colors.primary },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, ...shadow.card },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionAction: { color: colors.accent, fontWeight: '700', fontSize: 13 },

  btn: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: { backgroundColor: colors.accentSoft },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { flex: 1, fontSize: 14, color: colors.body },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.ink, maxWidth: '60%', textAlign: 'right' },
});
