const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withDisableMinify(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const setProp = (key, value) => {
      const existing = props.find((item) => item.type === 'property' && item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    // Disable R8 minification/shrinking in release builds so Room/WorkManager
    // (androidx.work.impl.WorkDatabase_Impl) and native modules are not stripped.
    setProp('android.enableMinifyInReleaseBuilds', 'false');
    setProp('android.enableShrinkResourcesInReleaseBuilds', 'false');

    return config;
  });
};

