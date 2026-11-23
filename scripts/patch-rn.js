const fs = require('fs');
const path = require('path');

const rnIndexPath = path.join(__dirname, '..', 'node_modules', 'react-native', 'index.js');

try {
  if (fs.existsSync(rnIndexPath)) {
    let content = fs.readFileSync(rnIndexPath, 'utf8');
    if (!content.includes('_interactionManagerPolyfill')) {
      const patch = `
const _interactionManagerPolyfill = {
  runAfterInteractions(task) {
    let handle;
    const promise = new Promise(resolve => {
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

Object.defineProperty(module.exports, 'InteractionManager', {
  configurable: true,
  enumerable: true,
  get() {
    return _interactionManagerPolyfill;
  },
});
`;
      fs.writeFileSync(rnIndexPath, content + '\n' + patch, 'utf8');
      console.log('[patch-rn] Patched react-native/index.js with InteractionManager polyfill.');
    } else {
      console.log('[patch-rn] react-native/index.js already contains InteractionManager polyfill.');
    }
  }
} catch (err) {
  console.warn('[patch-rn] Warning:', err.message);
}

