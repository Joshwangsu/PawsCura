package com.pawscura.yoloncnn

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class YoloNcnnModule : Module() {
    companion object {
        private const val TAG = "YoloNcnnModule"
        private const val MAX_DECODE_DIM = 1280

        private val CLASS_NAMES = arrayOf(
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
        )

        @Volatile
        private var nativeLoaded: Boolean = false
        private var nativeLoadError: String? = null

        init {
            try {
                System.loadLibrary("ncnn")
                System.loadLibrary("yolo11_ncnn")
                nativeLoaded = true
                Log.d(TAG, "Loaded native libraries libncnn.so and libyolo11_ncnn.so")
            } catch (t: Throwable) {
                nativeLoaded = false
                nativeLoadError = t.message ?: t.javaClass.simpleName
                Log.e(TAG, "Failed to load native NCNN libraries", t)
            }
        }
    }

    private external fun initModel(assetManager: Any): Boolean
    private external fun detectBitmapFlat(bitmap: Bitmap, confThreshold: Float, nmsThreshold: Float): FloatArray?

    override fun definition() = ModuleDefinition {
        Name("YoloNcnn")

        AsyncFunction("detect") { imageSource: String, confThreshold: Double?, nmsThreshold: Double? ->
            if (!nativeLoaded) {
                throw Exception("Native NCNN library unavailable: ${nativeLoadError ?: "unknown error"}")
            }

            val context = appContext.reactContext ?: throw Exception("React context unavailable")
            val t0 = System.currentTimeMillis()
            if (!initModel(context.assets)) {
                throw Exception("Failed to load YOLOv11 NCNN model from assets")
            }

            val conf = (confThreshold ?: 0.20).toFloat()
            val nms = (nmsThreshold ?: 0.45).toFloat()

            val rawBitmap = loadDownsampledBitmap(context, imageSource)
                ?: throw Exception("Failed to decode image from source")

            val argbBitmap = if (rawBitmap.config == Bitmap.Config.ARGB_8888) {
                rawBitmap
            } else {
                val copy = rawBitmap.copy(Bitmap.Config.ARGB_8888, false)
                rawBitmap.recycle()
                copy ?: throw Exception("Failed to convert bitmap to ARGB_8888")
            }

            val flat = try {
                detectBitmapFlat(argbBitmap, conf, nms) ?: FloatArray(0)
            } finally {
                if (!argbBitmap.isRecycled) {
                    argbBitmap.recycle()
                }
            }

            val results = mutableListOf<Map<String, Any>>()
            var i = 0
            while (i + 5 < flat.size) {
                val classId = flat[i].toInt()
                if (classId in CLASS_NAMES.indices) {
                    results.add(
                        mapOf(
                            "class_id" to classId,
                            "class_name" to CLASS_NAMES[classId],
                            "conf" to flat[i + 1].toDouble(),
                            "xc" to flat[i + 2].toDouble(),
                            "yc" to flat[i + 3].toDouble(),
                            "w" to flat[i + 4].toDouble(),
                            "h" to flat[i + 5].toDouble()
                        )
                    )
                }
                i += 6
            }

            Log.d(TAG, "detect() finished in ${System.currentTimeMillis() - t0}ms with ${results.size} detections")
            return@AsyncFunction results
        }
    }

    private fun computeInSampleSize(width: Int, height: Int, maxDim: Int): Int {
        if (width <= 0 || height <= 0) return 1
        var inSampleSize = 1
        var halfW = width / 2
        var halfH = height / 2
        while (halfW / inSampleSize >= maxDim || halfH / inSampleSize >= maxDim) {
            inSampleSize *= 2
        }
        return inSampleSize
    }

    private fun loadDownsampledBitmap(context: Context, source: String): Bitmap? {
        return try {
            val isBase64 = source.startsWith("data:image") ||
                (source.length > 256 && !source.startsWith("file:") && !source.startsWith("content:") && !source.startsWith("/"))

            if (isBase64) {
                val clean = if (source.contains(",")) source.substringAfter(",") else source
                val bytes = Base64.decode(clean, Base64.DEFAULT)
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
                val opts = BitmapFactory.Options().apply {
                    inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, MAX_DECODE_DIM)
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                }
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
            } else if (source.startsWith("file:")) {
                val uri = Uri.parse(source)
                val filePath = uri.path
                if (filePath != null && File(filePath).exists()) {
                    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(filePath, bounds)
                    val opts = BitmapFactory.Options().apply {
                        inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, MAX_DECODE_DIM)
                        inPreferredConfig = Bitmap.Config.ARGB_8888
                    }
                    BitmapFactory.decodeFile(filePath, opts)
                } else {
                    decodeFromContentUri(context, uri)
                }
            } else if (source.startsWith("content:")) {
                decodeFromContentUri(context, Uri.parse(source))
            } else {
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeFile(source, bounds)
                val opts = BitmapFactory.Options().apply {
                    inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, MAX_DECODE_DIM)
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                }
                BitmapFactory.decodeFile(source, opts)
            }
        } catch (t: Throwable) {
            Log.e(TAG, "Failed to decode bitmap", t)
            null
        }
    }

    private fun decodeFromContentUri(context: Context, uri: Uri): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, bounds)
        }
        val opts = BitmapFactory.Options().apply {
            inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, MAX_DECODE_DIM)
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        return context.contentResolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, opts)
        }
    }
}
