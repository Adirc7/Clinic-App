// Date picker that works everywhere:
//  - phone (Android/iOS): the native date dialog from @react-native-community/datetimepicker
//  - web: the browser's own <input type="date"> (the native picker library does nothing on web)
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { toDateKey } from '../utils/date';
import { colors, radius } from '../theme';

export default function DateField({ value, onChange, maximumDate, minimumDate, style, textStyle, error, iconLeft = false }) {
  const [open, setOpen] = useState(false);
  const date = value instanceof Date && !isNaN(value) ? value : new Date();

  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: 'date',
      value: toDateKey(date),
      max: maximumDate ? toDateKey(maximumDate) : undefined,
      min: minimumDate ? toDateKey(minimumDate) : undefined,
      onChange: (e) => {
        if (!e.target.value) return;
        const [y, m, d] = e.target.value.split('-').map(Number);
        onChange(new Date(y, m - 1, d));
      },
      style: {
        ...StyleSheet.flatten([styles.box, style]),
        ...(error ? { borderColor: colors.danger } : {}),
        fontSize: 14, color: colors.ink, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', width: '100%', outline: 'none',
      },
    });
  }

  const icon = <Ionicons name="calendar-outline" size={20} color={colors.primary} />;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.box, styles.row, style, error && { borderColor: colors.danger }]}>
        {iconLeft && icon}
        <Text style={[styles.text, textStyle]}>{toDateKey(date)}</Text>
        {!iconLeft && icon}
      </Pressable>
      {open && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(event, selected) => {
            setOpen(false);
            if (event?.type !== 'dismissed' && selected) onChange(selected);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    height: 50, paddingHorizontal: 14, marginBottom: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  text: { fontSize: 14, color: colors.ink },
});
