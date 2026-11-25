import { requireNativeModule } from 'expo-modules-core';

let YoloNcnnNative = null;
try {
  YoloNcnnNative = requireNativeModule('YoloNcnn');
} catch (e) {
  // Not loaded in pure web/simulator environments
}

/**
 * Runs standalone on-device YOLOv11 inference via NCNN.
 * @param {string} imageSource - local file URI, content URI, or Base64 string
 * @param {number} confThreshold - detection threshold (default 0.20)
 * @param {number} nmsThreshold - NMS IoU threshold (default 0.45)
 * @returns {Promise<Array<{class_id: number, class_name: string, conf: number, xc: number, yc: number, w: number, h: number}>>}
 */
export async function detectWithNcnn(imageSource, confThreshold = 0.20, nmsThreshold = 0.45) {
  if (YoloNcnnNative && typeof YoloNcnnNative.detect === 'function') {
    return await YoloNcnnNative.detect(imageSource, confThreshold, nmsThreshold);
  }
  return null;
}

export default {
  detectWithNcnn,
};
