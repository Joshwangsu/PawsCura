import 'react-native-url-polyfill/auto';
import * as ReactNative from 'react-native';

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

export default polyfill;
