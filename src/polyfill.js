import 'react-native-url-polyfill/auto';
import * as ReactNative from 'react-native';
import jsxRuntime from 'react/jsx-runtime';
import jsxDevRuntime from 'react/jsx-dev-runtime';

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
    writable: true,
    value: polyfill,
  });
} catch (e) {
  ReactNative.InteractionManager = polyfill;
}

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
}

// Wrap JSX runtimes so all <Text> and <TextInput> use Public Sans
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

export default polyfill;
