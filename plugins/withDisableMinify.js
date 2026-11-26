const { withGradleProperties, withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withDisableMinify(config) {
  config = withGradleProperties(config, (config) => {
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

  // Store NCNN .bin and .param model assets uncompressed in the APK so AAssetManager
  // memory-maps them directly instead of decompressing 40MB into heap RAM (prevents OOM).
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let contents = config.modResults.contents;
      if (!contents.includes('noCompress') || !contents.includes('"bin"')) {
        contents = contents.replace(
          /android\s*\{/,
          `android {\n    androidResources {\n        noCompress += ["bin", "param"]\n    }`
        );
        config.modResults.contents = contents;
      }
    }
    return config;
  });

  return config;
};
