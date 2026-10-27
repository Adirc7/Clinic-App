import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Reusable form input with icon, error message and red-border highlight.
 *
 * Props:
 *   label         — field label (string)
 *   icon          — Ionicons icon name (string, optional)
 *   error         — Yup/Formik error message (string)
 *   touched       — Formik touched flag (bool)
 *   rightElement  — any React node to render on the right (e.g. eye toggle)
 *   ...rest       — all standard TextInput props
 */
export default function FormInput({
  label,
  icon,
  error,
  touched,
  rightElement,
  style,
  ...rest
}) {
  const hasError = !!(touched && error);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, hasError && styles.inputWrapError, style]}>
        {icon ? <Ionicons name={icon} size={18} color={hasError ? '#E74C3C' : '#87A2A0'} /> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor="#A3B5B3"
          {...rest}
        />
        {rightElement || null}
      </View>
      {hasError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A4B44',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#DCEBE8',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: '#FBFEFD',
  },
  inputWrapError: {
    borderColor: '#E74C3C',
    backgroundColor: '#FFF8F8',
  },
  input: {
    flex: 1,
    color: '#123F39',
    fontSize: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: 4,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 12,
    flex: 1,
  },
});
