cmake_minimum_required(VERSION 3.10.2)
project(yolo_ncnn)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_MAP_IMPORTED_CONFIG_RELWITHDEBINFO Release)
set(CMAKE_MAP_IMPORTED_CONFIG_DEBUG Release)

set(ncnn_DIR ${CMAKE_CURRENT_SOURCE_DIR}/ncnn-sdk/${ANDROID_ABI}/lib/cmake/ncnn)
find_package(ncnn REQUIRED)

add_library(yolo11_ncnn SHARED
    src/main/cpp/yolo11_ncnn.cpp
)

target_link_libraries(yolo11_ncnn
    ncnn
    android
    jnigraphics
    log
)
