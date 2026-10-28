// React Native's Alert.alert does nothing in the browser (react-native-web).
// On web, replace it with the browser's own alert/confirm boxes so messages
// show and confirmation buttons still run. Phones are not affected.
import { Alert, Platform } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = Array.isArray(buttons) ? buttons : [];

    // 0 or 1 button → simple message, then run that button's action
    if (list.length <= 1) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }

    // 2+ buttons → OK runs the main (non-cancel) action, Cancel runs the cancel one
    const cancel = list.find((b) => b.style === 'cancel');
    const main = [...list].reverse().find((b) => b.style !== 'cancel') || list[list.length - 1];
    if (window.confirm(`${text}\n\nOK = ${main.text || 'OK'}`)) {
      main.onPress?.();
    } else {
      cancel?.onPress?.();
    }
  };
}
