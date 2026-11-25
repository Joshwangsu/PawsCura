#include <jni.h>
#include <string>
#include <vector>
#include <algorithm>
#include <android/log.h>
#include <android/asset_manager.h>
#include <android/asset_manager_jni.h>
#include <android/bitmap.h>

#include "net.h"
#include "mat.h"
#include "cpu.h"

#define TAG "YoloV11Ncnn"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

static const char* CLASS_NAMES[] = {
    "alopecia",             // 0
    "crust_scale",          // 1
    "erythema",             // 2
    "excoriation",          // 3
    "hot_spot",             // 4
    "hyperpigmentation",    // 5
    "lichenification",      // 6
    "mass_growth",          // 7
    "oral_lesion",          // 8
    "papule_pustule",       // 9
    "swelling",             // 10
    "ulceration",           // 11
    "conjunctival_redness", // 12
    "corneal_opacity",      // 13
    "eyelid_mass",          // 14
    "eyelid_swelling",      // 15
    "lens_opacity",         // 16
    "ocular_discharge"      // 17
};
static const int NUM_CLASSES = 18;
static const int TARGET_SIZE = 640;

struct Object {
    int class_id;
    float conf;
    float xc;
    float yc;
    float w;
    float h;
};

static ncnn::Net g_yolo;
static bool g_model_loaded = false;

static inline float intersection_area(const Object& a, const Object& b) {
    float x1 = std::max(a.xc - a.w / 2.f, b.xc - b.w / 2.f);
    float y1 = std::max(a.yc - a.h / 2.f, b.yc - b.h / 2.f);
    float x2 = std::min(a.xc + a.w / 2.f, b.xc + b.w / 2.f);
    float y2 = std::min(a.yc + a.h / 2.f, b.yc + b.h / 2.f);
    if (x1 >= x2 || y1 >= y2) return 0.f;
    return (x2 - x1) * (y2 - y1);
}

static void nms_sorted_bboxes(const std::vector<Object>& objects, std::vector<int>& picked, float nms_threshold) {
    picked.clear();
    const size_t n = objects.size();
    std::vector<float> areas(n);
    for (size_t i = 0; i < n; i++) {
        areas[i] = objects[i].w * objects[i].h;
    }

    for (size_t i = 0; i < n; i++) {
        const Object& a = objects[i];
        bool keep = true;
        for (size_t j = 0; j < picked.size(); j++) {
            const Object& b = objects[picked[j]];
            float inter = intersection_area(a, b);
            float union_area = areas[i] + areas[picked[j]] - inter;
            if (union_area > 0.f && (inter / union_area) > nms_threshold) {
                keep = false;
                break;
            }
        }
        if (keep) {
            picked.push_back((int)i);
        }
    }
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_pawscura_yoloncnn_YoloNcnnModule_initModel(JNIEnv* env, jobject thiz, jobject assetManager) {
    if (g_model_loaded) return JNI_TRUE;

    AAssetManager* mgr = AAssetManager_fromJava(env, assetManager);
    if (!mgr) {
        LOGE("Failed to get AAssetManager");
        return JNI_FALSE;
    }

    g_yolo.clear();
    g_yolo.opt.use_vulkan_compute = true;
    g_yolo.opt.use_fp16_packed = true;
    g_yolo.opt.use_fp16_storage = true;
    g_yolo.opt.use_fp16_arithmetic = true;
    g_yolo.opt.num_threads = ncnn::get_big_cpu_count();

    int ret_param = g_yolo.load_param(mgr, "models/best.ncnn.param");
    int ret_bin = g_yolo.load_model(mgr, "models/best.ncnn.bin");

    if (ret_param != 0 || ret_bin != 0) {
        LOGE("Failed to load NCNN model: param=%d, bin=%d", ret_param, ret_bin);
        return JNI_FALSE;
    }

    g_model_loaded = true;
    LOGD("YOLOv11 NCNN model successfully loaded from assets!");
    return JNI_TRUE;
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_pawscura_yoloncnn_YoloNcnnModule_detectBitmap(JNIEnv* env, jobject thiz, jobject bitmap, jfloat confThreshold, jfloat nmsThreshold) {
    if (!g_model_loaded) {
        LOGE("Model not initialized before detectBitmap call");
        return nullptr;
    }

    AndroidBitmapInfo info;
    if (AndroidBitmap_getInfo(env, bitmap, &info) < 0 || info.format != ANDROID_BITMAP_FORMAT_RGBA_8888) {
        LOGE("Invalid bitmap format; expected RGBA_8888");
        return nullptr;
    }

    int img_w = info.width;
    int img_h = info.height;

    // 1. Calculate Letterbox Scaling
    float scale = std::min((float)TARGET_SIZE / img_w, (float)TARGET_SIZE / img_h);
    int scaled_w = (int)(img_w * scale);
    int scaled_h = (int)(img_h * scale);
    int pad_x = (TARGET_SIZE - scaled_w) / 2;
    int pad_y = (TARGET_SIZE - scaled_h) / 2;

    // 2. Convert Bitmap to NCNN Mat
    ncnn::Mat in = ncnn::Mat::from_android_bitmap_resize(env, bitmap, ncnn::Mat::PIXEL_RGBA2RGB, scaled_w, scaled_h);

    // 3. Add Letterbox Padding to 640x640
    ncnn::Mat in_pad;
    int top = pad_y;
    int bottom = TARGET_SIZE - scaled_h - pad_y;
    int left = pad_x;
    int right = TARGET_SIZE - scaled_w - pad_x;
    ncnn::copy_make_border(in, in_pad, top, bottom, left, right, ncnn::BORDER_CONSTANT, 114.f);

    // 4. Normalize [0..1]
    const float norm_vals[3] = { 1 / 255.f, 1 / 255.f, 1 / 255.f };
    in_pad.substract_mean_normalize(0, norm_vals);

    // 5. Run Inference
    ncnn::Extractor ex = g_yolo.create_extractor();
    ex.input("in0", in_pad);

    ncnn::Mat out;
    ex.extract("out0", out);

    // Shape is [22, 8400]: w = 8400, h = 22
    std::vector<Object> proposals;
    if (out.w == 8400 && out.h == (4 + NUM_CLASSES)) {
        for (int i = 0; i < out.w; i++) {
            // Find max class probability among 18 classes
            int best_class = -1;
            float best_score = -1.f;
            for (int c = 0; c < NUM_CLASSES; c++) {
                float score = out.row(4 + c)[i];
                if (score > best_score) {
                    best_score = score;
                    best_class = c;
                }
            }

            if (best_score >= confThreshold && best_class >= 0) {
                float box_xc = out.row(0)[i];
                float box_yc = out.row(1)[i];
                float box_w  = out.row(2)[i];
                float box_h  = out.row(3)[i];

                // Unpad coordinates back to original image [0..img_w, 0..img_h]
                float orig_xc = (box_xc - pad_x) / scale;
                float orig_yc = (box_yc - pad_y) / scale;
                float orig_w  = box_w / scale;
                float orig_h  = box_h / scale;

                // Normalize [0..1] relative to original image dimensions
                Object obj;
                obj.class_id = best_class;
                obj.conf = best_score;
                obj.xc = std::max(0.f, std::min(1.f, orig_xc / (float)img_w));
                obj.yc = std::max(0.f, std::min(1.f, orig_yc / (float)img_h));
                obj.w  = std::max(0.01f, std::min(1.f, orig_w / (float)img_w));
                obj.h  = std::max(0.01f, std::min(1.f, orig_h / (float)img_h));

                proposals.push_back(obj);
            }
        }
    }

    // Sort proposals by confidence descending
    std::sort(proposals.begin(), proposals.end(), [](const Object& a, const Object& b) {
        return a.conf > b.conf;
    });

    // Run Non-Maximum Suppression (NMS)
    std::vector<int> picked;
    nms_sorted_bboxes(proposals, picked, nmsThreshold);

    // Build Java Detection[] array
    jclass detClass = env->FindClass("com/pawscura/yoloncnn/YoloDetection");
    jmethodID detConstructor = env->GetMethodID(detClass, "<init>", "(ILjava/lang/String;FFFFFF)V");
    jobjectArray resultArray = env->NewObjectArray((jsize)picked.size(), detClass, nullptr);

    for (size_t i = 0; i < picked.size(); i++) {
        const Object& obj = proposals[picked[i]];
        jstring classNameStr = env->NewStringUTF(CLASS_NAMES[obj.class_id]);
        jobject detObj = env->NewObject(detClass, detConstructor,
            obj.class_id, classNameStr, obj.conf, obj.xc, obj.yc, obj.w, obj.h);
        env->SetObjectArrayElement(resultArray, (jsize)i, detObj);
        env->DeleteLocalRef(classNameStr);
        env->DeleteLocalRef(detObj);
    }

    return resultArray;
}
