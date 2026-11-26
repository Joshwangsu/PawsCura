const { withGradleProperties, withAppBuildGradle, withAndroidManifest } = require('expo/config-plugins');

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

    // Exclude unused 32-bit x86 architecture (~20 MB saved) while keeping arm64-v8a, armeabi-v7a, x86_64
    setProp('reactNativeArchitectures', 'arm64-v8a,armeabi-v7a,x86_64');

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

  // Enable android:largeHeap="true" so mid-range Android devices allow sufficient RAM for YOLOv11m NCNN
  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest?.application?.[0];
    if (app && app.$) {
      app.$['android:largeHeap'] = 'true';
    }
    return config;
  });

  return config;
};
