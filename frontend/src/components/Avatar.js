import React, { useState } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { buildServerUrl } from '../api/axiosInstance';
import { colors } from '../theme';

const PALETTE = [
  ['#E8F5F1', '#0A6B5B'],
  ['#EAF1FF', '#2952A3'],
  ['#FFF4E5', '#9A5B00'],
  ['#F4F0FF', '#5B3BA8'],
  ['#FDECEE', '#A32035'],
];

const initialsOf = (name = '') =>
  name
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

/**
 * Shows the uploaded photo, or coloured initials if there is no photo / it fails to load.
 * Props: name, photo (server path or URL), size, radius, style
 */
export default function Avatar({ name, photo, size = 56, radius, style }) {
  const [failed, setFailed] = useState(false);
  const uri = photo ? buildServerUrl(photo) : null;
  const r = radius ?? size / 2;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={[{ width: size, height: size, borderRadius: r, backgroundColor: colors.primarySoft }, style]}
      />
    );
  }

  const [bg, fg] = PALETTE[(name || '').length % PALETTE.length];
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: r, backgroundColor: bg }, style]}>
      <Text style={{ color: fg, fontWeight: '800', fontSize: size * 0.36 }}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
