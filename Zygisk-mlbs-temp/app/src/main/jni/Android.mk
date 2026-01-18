LOCAL_PATH := $(call my-dir)

# --- 1. Prebuilt Dobby Library ---
include $(CLEAR_VARS)
LOCAL_MODULE := dobby
LOCAL_SRC_FILES := dobby/libraries/$(TARGET_ARCH_ABI)/libdobby.a
LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/dobby/include
include $(PREBUILT_STATIC_LIBRARY)

# --- 2. Main Module (Zygisk Module) ---
include $(CLEAR_VARS)
LOCAL_MODULE := mlbs_tourkit

# Daftar Source Code (C/C++)
LOCAL_SRC_FILES := \
    main.cpp \
    GameLogic.cpp \
    Il2Cpp.cpp \
    IpcServer.cpp \
    hack.cpp \
    utils.cpp \
    utils_safe.cpp \
    PathManager.cpp \
    fake_dlfcn.cpp \
    DynamicOffsets.cpp \
    Il2Cpp/il2cpp_dump.cpp \
    Il2Cpp/BNMUtils.h \
    Utils/Unity/ByNameModding/Il2Cpp.cpp \
    Utils/Unity/ByNameModding/Tools.cpp \
    Utils/Unity/ByNameModding/fake_dlfcn.cpp \
    KittyMemory/KittyMemory.cpp \
    KittyMemory/KittyScanner.cpp \
    KittyMemory/KittyUtils.cpp \
    KittyMemory/KittyArm64.cpp \
    KittyMemory/MemoryBackup.cpp \
    KittyMemory/MemoryPatch.cpp \
    KittyMemory/SubstrateDebug.cpp \
    KittyMemory/SubstrateHook.cpp \
    KittyMemory/SubstratePosixMemory.cpp \
    KittyMemory/SymbolFinder.cpp \
    KittyMemory/hde64.c \
    xDL/xdl.c \
    xDL/xdl_iterate.c \
    xDL/xdl_linker.c \
    xDL/xdl_lzma.c \
    xDL/xdl_util.c

# Include Headers
LOCAL_C_INCLUDES := \
    $(LOCAL_PATH) \
    $(LOCAL_PATH)/include \
    $(LOCAL_PATH)/KittyMemory \
    $(LOCAL_PATH)/xDL \
    $(LOCAL_PATH)/dobby \
    $(LOCAL_PATH)/Il2Cpp \
    $(LOCAL_PATH)/Utils

# Compiler Flags
LOCAL_CFLAGS := -Wno-error=format-security -fvisibility=hidden
LOCAL_CPPFLAGS := -Wno-error=format-security -fvisibility=hidden -std=c++17 -fexceptions

# Libraries
LOCAL_LDLIBS := -llog -landroid -lEGL -lGLESv2
LOCAL_STATIC_LIBRARIES := dobby

include $(BUILD_SHARED_LIBRARY)
