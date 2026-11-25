package com.pawscura.yoloncnn

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.InputStream

class YoloNcnnModule : Module() {
    companion object {
        init {
            System.loadLibrary("yolo11_ncnn")
        }
    }

    private external fun initModel(assetManager: Any): Boolean
    private external fun detectBitmap(bitmap: Bitmap, confThreshold: Float, nmsThreshold: Float): Array<YoloDetection>?

    override fun definition() = ModuleDefinition {
        Name("YoloNcnn")

        OnCreate {
            val context = appContext.reactContext ?: return@OnCreate
            initModel(context.assets)
        }

        AsyncFunction("detect") { imageSource: String, confThreshold: Float?, nmsThreshold: Float? ->
            val context = appContext.reactContext ?: throw Exception("React context unavailable")
            initModel(context.assets)

            val conf = confThreshold ?: 0.20f
            val nms = nmsThreshold ?: 0.45f

            val bitmap = loadBitmapFromSource(context, imageSource)
                ?: throw Exception("Failed to decode image from source: $imageSource")

            val detections = detectBitmap(bitmap, conf, nms) ?: emptyArray()

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

    private fun loadBitmapFromSource(context: android.content.Context, source: String): Bitmap? {
        return try {
            if (source.startsWith("data:image") || source.length > 200 && !source.startsWith("file:") && !source.startsWith("content:")) {
                val clean = if (source.contains(",")) source.substringAfter(",") else source
                val bytes = Base64.decode(clean, Base64.DEFAULT)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            } else if (source.startsWith("content:") || source.startsWith("file:")) {
                val uri = Uri.parse(source)
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    BitmapFactory.decodeStream(stream)
                }
            } else {
                BitmapFactory.decodeFile(source)
            }
        } catch (e: Exception) {
            null
        }
    }
}
