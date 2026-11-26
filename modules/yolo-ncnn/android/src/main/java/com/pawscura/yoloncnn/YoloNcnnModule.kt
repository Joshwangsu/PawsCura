package com.pawscura.yoloncnn

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class YoloNcnnModule : Module() {
    companion object {
        private const val MAX_DECODE_DIM = 1280

        init {
            System.loadLibrary("yolo11_ncnn")
        }
    }

    private external fun initModel(assetManager: Any): Boolean
    private external fun detectBitmap(bitmap: Bitmap, confThreshold: Float, nmsThreshold: Float): Array<YoloDetection>?

    override fun definition() = ModuleDefinition {
        Name("YoloNcnn")

        AsyncFunction("detect") { imageSource: String, confThreshold: Float?, nmsThreshold: Float? ->
            val context = appContext.reactContext ?: throw Exception("React context unavailable")
            if (!initModel(context.assets)) {
                throw Exception("Failed to load YOLOv11 NCNN model from assets")
            }

            val conf = confThreshold ?: 0.20f
            val nms = nmsThreshold ?: 0.45f

            val rawBitmap = loadDownsampledBitmap(context, imageSource)
                ?: throw Exception("Failed to decode image from source")

            val argbBitmap = if (rawBitmap.config == Bitmap.Config.ARGB_8888) {
                rawBitmap
            } else {
                val copy = rawBitmap.copy(Bitmap.Config.ARGB_8888, false)
                rawBitmap.recycle()
                copy ?: throw Exception("Failed to convert bitmap to ARGB_8888")
            }

            val detections = try {
                detectBitmap(argbBitmap, conf, nms) ?: emptyArray()
            } finally {
                if (!argbBitmap.isRecycled) {
                    argbBitmap.recycle()
                }
            }

            return@AsyncFunction detections.map { d ->
                mapOf(
                    "class_id" to d.classId,
                    "class_name" to d.className,
                    "conf" to d.conf,
                    "xc" to d.xc,
                    "yc" to d.yc,
                    "w" to d.w,
                    "h" to d.h
                )
            }
        }
    }

    private fun computeInSampleSize(width: Int, height: Int, maxDim: Int): Int {
        var inSampleSize = 1
        var halfW = width / 2
        var halfH = height / 2
        while (halfW / inSampleSize >= maxDim || halfH / inSampleSize >= maxDim) {
            inSampleSize *= 2
        }
        return inSampleSize
    }

    private fun loadDownsampledBitmap(context: android.content.Context, source: String): Bitmap? {
        return try {
            val isBase64 = source.startsWith("data:image") ||
                (source.length > 200 && !source.startsWith("file:") && !source.startsWith("content:"))

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
            } else if (source.startsWith("content:") || source.startsWith("file:")) {
                val uri = Uri.parse(source)
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    BitmapFactory.decodeStream(stream, null, bounds)
                }
                val opts = BitmapFactory.Options().apply {
                    inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, MAX_DECODE_DIM)
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                }
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    BitmapFactory.decodeStream(stream, null, opts)
                }
            } else {
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeFile(source, bounds)
                val opts = BitmapFactory.Options().apply {
                    inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, MAX_DECODE_DIM)
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                }
                BitmapFactory.decodeFile(source, opts)
            }
        } catch (e: Exception) {
            null
        }
    }
}
