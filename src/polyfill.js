import 'react-native-url-polyfill/auto';

// Use CommonJS require('react-native') directly so Babel does NOT wrap it in
// _interopNamespace() (which creates a shallow copy object and prevents
// InteractionManager from being defined on the real react-native module).
const ReactNative = require('react-native');

// Polyfill InteractionManager for React Native 0.88 / Expo SDK 58 compatibility
const polyfill = {
  runAfterInteractions: (task) => {
    let handle;
    const promise = new Promise((resolve) => {
      handle = setTimeout(() => {
        resolve(typeof task === 'function' ? task() : undefined);
      }, 0);
    });
    return {
      then: (...args) => promise.then(...args),
      done: (...args) => (promise.done ? promise.done(...args) : promise.then(...args)),
      cancel: () => clearTimeout(handle),
    };
  },
  createInteractionHandle: () => 0,
  clearInteractionHandle: () => {},
  setDeadline: () => {},
  addListener: () => ({ remove: () => {} }),
};

try {
  Object.defineProperty(ReactNative, 'InteractionManager', {
    configurable: true,
    enumerable: true,
    get() {
      return polyfill;
    },
  });
} catch (e) {
  try {
    ReactNative.InteractionManager = polyfill;
  } catch (_) {
    // Already defined or getter-only on web
  }
}

if (!ReactNative.codegenNativeComponent) {
  try {
    Object.defineProperty(ReactNative, 'codegenNativeComponent', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: (name) => {
        const MockComp = (props) => null;
        MockComp.displayName = name || 'MockNativeComponent';
        return MockComp;
      },
    });
  } catch (e) {
    try {
      ReactNative.codegenNativeComponent = (name) => (props) => null;
    } catch (_) {}
  }
}

if (!ReactNative.codegenNativeCommands) {
  try {
    Object.defineProperty(ReactNative, 'codegenNativeCommands', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: () => ({}),
    });
  } catch (e) {
    try {
      ReactNative.codegenNativeCommands = () => ({});
    } catch (_) {}
  }
}

try {
  const uiMgr = ReactNative.UIManager || {};
  if (!uiMgr.hasViewManagerConfig) {
    uiMgr.hasViewManagerConfig = () => false;
  }
  if (!uiMgr.getViewManagerConfig) {
    uiMgr.getViewManagerConfig = () => null;
  }
  if (!ReactNative.UIManager) {
    ReactNative.UIManager = uiMgr;
  }
} catch (_) {}

// ── Global Public Sans Font Injection for <Text> & <TextInput> ──────────────
export function resolveAppFont(weight) {
  const w = weight != null ? String(weight).toLowerCase() : '400';
  if (w === '800' || w === '900' || w === 'extrabold') {
    return 'PublicSans_800ExtraBold';
  }
  if (w === 'bold' || w === '700') {
    return 'PublicSans_700Bold';
  }
  if (w === 'semibold' || w === '600') {
    return 'PublicSans_600SemiBold';
  }
  if (w === 'medium' || w === '500') {
    return 'PublicSans_500Medium';
  }
  if (w === 'light' || w === '300' || w === '200' || w === '100') {
    return 'PublicSans_300Light';
  }
  return 'PublicSans_400Regular';
}

function applyAppFontToTextProps(type, props) {
  try {
    if (!props) return props;
    if (type !== ReactNative.Text && type !== ReactNative.TextInput) {
      return props;
    }
    const flat = ReactNative.StyleSheet.flatten(props.style) || {};
    // Preserve icon fonts (e.g., Ionicons, MaterialIcons)
    if (flat.fontFamily && !String(flat.fontFamily).startsWith('PublicSans')) {
      return props;
    }
    const targetFamily = flat.fontFamily || resolveAppFont(flat.fontWeight);
    return {
      ...props,
      style: [props.style, { fontFamily: targetFamily, fontWeight: undefined }],
    };
  } catch (e) {
    return props;
  }
}

// Wrap JSX runtimes safely so all <Text> and <TextInput> use Public Sans
try {
  const jsxRuntime = require('react/jsx-runtime');
  if (jsxRuntime) {
    const origJsx = jsxRuntime.__origJsx || jsxRuntime.jsx;
    const origJsxs = jsxRuntime.__origJsxs || jsxRuntime.jsxs;
    jsxRuntime.__origJsx = origJsx;
    jsxRuntime.__origJsxs = origJsxs;
    if (typeof origJsx === 'function') {
      jsxRuntime.jsx = function (type, props, key) {
        return origJsx.call(this, type, applyAppFontToTextProps(type, props), key);
      };
    }
    if (typeof origJsxs === 'function') {
      jsxRuntime.jsxs = function (type, props, key) {
        return origJsxs.call(this, type, applyAppFontToTextProps(type, props), key);
      };
    }
  }
} catch (_) {}

try {
  const jsxDevRuntime = require('react/jsx-dev-runtime');
  if (jsxDevRuntime) {
    const origJsxDEV = jsxDevRuntime.__origJsxDEV || jsxDevRuntime.jsxDEV;
    jsxDevRuntime.__origJsxDEV = origJsxDEV;
    if (typeof origJsxDEV === 'function') {
      jsxDevRuntime.jsxDEV = function (type, props, key, isStaticChildren, source, self) {
        return origJsxDEV.call(
          this,
          type,
          applyAppFontToTextProps(type, props),
          key,
          isStaticChildren,
          source,
          self
        );
      };
    }
  }
} catch (_) {}

export default polyfill;
