import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Reusable form submit button with loading state.
 *
 * Props:
 *   title     — button label (string)
 *   onPress   — handler
 *   loading   — bool, shows spinner
 *   disabled  — bool
 *   variant   — 'primary' (default) | 'outline'
 *   style     — extra ViewStyle override
 */
export default function FormButton({
  title = 'Submit',
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        variant === 'outline' ? styles.btnOutline : styles.btnPrimary,
        isDisabled && styles.btnDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#0C6875' : '#FFF'} />
      ) : (
        <Text style={[styles.btnText, variant === 'outline' && styles.btnTextOutline]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnPrimary: {
    backgroundColor: '#0C6875',
    shadowColor: '#0C6875',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0C6875',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnTextOutline: {
    color: '#0C6875',
  },
});
