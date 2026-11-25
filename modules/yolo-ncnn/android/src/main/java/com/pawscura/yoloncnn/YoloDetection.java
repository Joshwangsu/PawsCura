package com.pawscura.yoloncnn;

public class YoloDetection {
    public final int classId;
    public final String className;
    public final float conf;
    public final float xc;
    public final float yc;
    public final float w;
    public final float h;

    public YoloDetection(int classId, String className, float conf, float xc, float yc, float w, float h) {
        this.classId = classId;
        this.className = className;
        this.conf = conf;
        this.xc = xc;
        this.yc = yc;
        this.w = w;
        this.h = h;
    }
}
