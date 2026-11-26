import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const AlertContext = createContext({ showAlert: () => {} });

export const useAlert = () => useContext(AlertContext);

let globalShowAlert = null;

export function showAlert(titleOrConfig, messageArg, buttonsArg, optionsArg) {
  let config;
  if (titleOrConfig && typeof titleOrConfig === 'object' && !Array.isArray(titleOrConfig)) {
    config = titleOrConfig;
  } else {
    config = {
      title: titleOrConfig || '',
      message: messageArg || '',
      buttons: Array.isArray(buttonsArg) ? buttonsArg : undefined,
      type: optionsArg?.type,
    };
  }

  if (typeof globalShowAlert === 'function') {
    globalShowAlert(config);
  } else {
    console.warn('[CustomAlert] AlertProvider not mounted:', config.title, config.message);
  }
}

function inferType(config) {
  if (config.type) return config.type;
  const titleLower = String(config.title || '').toLowerCase();
  if (
    titleLower.includes('error') ||
    titleLower.includes('failed') ||
    titleLower.includes('invalid') ||
    titleLower.includes('suspended')
  ) {
    return 'error';
  }
  if (
    titleLower.includes('success') ||
    titleLower.includes('upgraded') ||
    titleLower.includes('saved') ||
    titleLower.includes('registration successful')
  ) {
    return 'success';
  }
  if (
    titleLower.includes('urgent') ||
    titleLower.includes('warning') ||
    titleLower.includes('permission') ||
    titleLower.includes('missing')
  ) {
    return 'warning';
  }
  if (
    titleLower.includes('?') ||
    titleLower.includes('cancel') ||
    titleLower.includes('delete') ||
    titleLower.includes('log out')
  ) {
    return 'confirm';
  }
  return 'info';
}

const TYPE_STYLES = {
  success: { icon: 'checkmark-circle', color: Colors.success, bg: Colors.successBg },
  error: { icon: 'alert-circle', color: Colors.danger, bg: Colors.dangerBg },
  warning: { icon: 'warning', color: Colors.warning, bg: Colors.warningBg },
  confirm: { icon: 'help-circle', color: Colors.primary, bg: Colors.primaryBg },
  info: { icon: 'information-circle', color: Colors.primary, bg: Colors.primaryBg },
};

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState(null);
  const insets = useSafeAreaInsets();
  const alertIdRef = React.useRef(0);

  const triggerAlert = useCallback((config) => {
    const normalizedButtons =
      Array.isArray(config.buttons) && config.buttons.length > 0
        ? config.buttons
        : [{ text: 'OK', style: 'default' }];

    alertIdRef.current += 1;
    setAlertState({
      id: alertIdRef.current,
      title: config.title || '',
      message: config.message || '',
      type: inferType(config),
      buttons: normalizedButtons,
      cancelable: config.cancelable !== false,
    });
  }, []);

  useEffect(() => {
    globalShowAlert = triggerAlert;
    return () => {
      if (globalShowAlert === triggerAlert) {
        globalShowAlert = null;
      }
    };
  }, [triggerAlert]);

  const handlePressButton = (btn) => {
    const cb = btn?.onPress;
    setAlertState(null);
    if (typeof cb === 'function') {
      setTimeout(() => {
        cb();
      }, 20);
    }
  };

  const handleRequestClose = () => {
    if (!alertState || !alertState.cancelable) return;
    const cancelBtn = alertState.buttons.find((b) => b.style === 'cancel');
    handlePressButton(cancelBtn || null);
  };

  const theme = alertState ? TYPE_STYLES[alertState.type] || TYPE_STYLES.info : TYPE_STYLES.info;
  const buttons = alertState?.buttons || [];
  const stackVertically = buttons.length >= 3;

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {!!alertState && (
        <Modal
          key={alertState.id}
          visible
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={handleRequestClose}
        >
          <View
            style={[
              styles.backdrop,
              {
                paddingTop: Math.max(insets.top, 20),
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: theme.bg }]}>
                <Ionicons name={theme.icon} size={34} color={theme.color} />
              </View>

              {!!alertState.title && <Text style={styles.title}>{alertState.title}</Text>}
              {!!alertState.message && <Text style={styles.message}>{alertState.message}</Text>}

              <View style={[styles.buttonGroup, stackVertically && styles.buttonGroupVertical]}>
                {buttons.map((btn, idx) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  return (
                    <TouchableOpacity
                      key={`${btn.text || 'btn'}_${idx}`}
                      activeOpacity={0.82}
                      onPress={() => handlePressButton(btn)}
                      style={[
                        styles.btnBase,
                        !stackVertically && { flex: 1 },
                        isCancel
                          ? styles.btnCancel
                          : isDestructive
                          ? styles.btnDestructive
                          : styles.btnPrimary,
                      ]}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          isCancel ? styles.btnCancelText : styles.btnSolidText,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {btn.text || 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(48, 43, 41, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '88%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.lg,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs + 2,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  buttonGroup: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  buttonGroupVertical: {
    flexDirection: 'column',
  },
  btnBase: {
    paddingVertical: Platform.OS === 'ios' ? 13 : 12,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  btnDestructive: {
    backgroundColor: Colors.danger,
    ...Shadows.sm,
  },
  btnCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnSolidText: {
    color: '#FFFFFF',
  },
  btnCancelText: {
    color: Colors.textSecondary,
  },
});
