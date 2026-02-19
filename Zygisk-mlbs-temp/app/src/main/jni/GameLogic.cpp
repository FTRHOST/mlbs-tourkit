#include "GameLogic.h"
#include <jni.h>
#include <thread>
#include <chrono>
#include <android/log.h>
#include <vector>
#include <string>
#include <mutex>
#include <sstream>
#include <map>
#include <fstream>
#include <sys/stat.h>

#include "Include.h"
#include "utils.h"
#include "utils_safe.h"
#include "DynamicOffsets.h"
#include "Il2Cpp/il2cpp_dump.h"
#include "feature/GameClass.h"
#include "feature/ToString.h"
#include "feature/ToString2.h"
#include "feature/BattleData.h" 
#include "struct/LogicPlayer.h" 
#include "IpcServer.h"
#include "obfuscate.h"
#include "dobby.h"

GlobalState g_State;
std::chrono::steady_clock::time_point g_battleStartTime;
std::chrono::duration<float> g_elapsedBattleTime(0);
std::atomic<bool> g_isBattleTimerRunning(false);

#define LOG_TAG "MLBS_CORE"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// =============================================================
// Variabel Global untuk Hook (Simpan Pointer Asli)
// =============================================================
// Signature: void visit(MTTDProto.SdpUnpacker t, System.Boolean bOpt)
void (*old_Cmd_Room_GetInfo_SC_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;
void (*old_Cmd_Room_Enter_SC_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;
void (*old_Cmd_Notify_StartBanTogether_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;

// =============================================================
// Fungsi Detour (Palsu) - Untuk Mencegat Data
// =============================================================

// 1. Menangkap Data Room Utama (Full Data) - Post-Deserialization
void new_Cmd_Room_GetInfo_SC_visit(void* instance, void* unpacker, bool bOpt) {
    // 1. Panggil fungsi asli DULU agar data terisi ke 'instance'
    if(old_Cmd_Room_GetInfo_SC_visit) old_Cmd_Room_GetInfo_SC_visit(instance, unpacker, bOpt);

    // 2. Sekarang 'instance' sudah berisi data yang didecode
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_GetInfo_SC::visit Selesai! Data Ready di Instance: %p", instance);

    // TODO: Extract stRoomInfo field
}

// 2. Menangkap Player Masuk (Incremental Data)
void new_Cmd_Room_Enter_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_Enter_SC_visit) old_Cmd_Room_Enter_SC_visit(instance, unpacker, bOpt);

    LOGI("MLBS_CORE: [HOOK] Cmd_Room_Enter_SC::visit Selesai! Data Ready di Instance: %p", instance);
}

// 3. Menangkap Timer Ban/Pick
void new_Cmd_Notify_StartBanTogether_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Notify_StartBanTogether_visit) old_Cmd_Notify_StartBanTogether_visit(instance, unpacker, bOpt);

    LOGI("MLBS_CORE: [HOOK] Cmd_Notify_StartBanTogether::visit Selesai! Data Ready di Instance: %p", instance);
}

// =========================================================
// FITUR DIAGNOSA
// =========================================================
void DiagnoseServerData() {
    LOGI("=== MLBS DIAGNOSE START ===");

    // Target Class (namespace MTTDProto)
    const char* targets[] = {
        "Cmd_Room_GetInfo_SC",
        "Cmd_Room_Enter_SC",
        "Cmd_Notify_StartBanTogether"
    };

    // Argument Types untuk membedakan overload visit(Packer) vs visit(Unpacker)
    const char* args[] = { "MTTDProto.SdpUnpacker", "System.Boolean" };

    for (const char* className : targets) {
        // Coba cari di Namespace MTTDProto
        void* addr = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", className, "visit", (char**)args, 2);

        if (addr != nullptr) {
            LOGI("[SUKSES] Found %s::visit(Unpacker) at %p", className, addr);
        } else {
            LOGI("[GAGAL] Failed to find %s::visit(Unpacker)", className);
            // Coba debug tanpa args types (mungkin akan ambigu)
            void* addrAmbiguous = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", className, "visit", 2);
            if (addrAmbiguous) {
                 LOGI("   -> TAPI ditemukan overload ambigu (Packer/Unpacker?) at %p", addrAmbiguous);
            }
        }
    }

    LOGI("=== MLBS DIAGNOSE END ===");
}

void InitGameLogic() {
    InitDynamicOffsets();

    // 1. Jalankan Diagnosa
    DiagnoseServerData();

    LOGI("GameLogic Initialized. Hooking 'visit' methods for SdpUnpacker...");

    // Argument types for disambiguation
    char* args[] = { (char*)"MTTDProto.SdpUnpacker", (char*)"System.Boolean" };

    // 1. Hook Data Room
    void* addrRoomInfo = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Room_GetInfo_SC", "visit", args, 2);
    if (addrRoomInfo) {
        LOGI("Installing Hook: Cmd_Room_GetInfo_SC::visit at %p", addrRoomInfo);
        DobbyHook(addrRoomInfo, (void*)new_Cmd_Room_GetInfo_SC_visit, (void**)&old_Cmd_Room_GetInfo_SC_visit);
    } else {
        LOGE("FATAL: Failed to find Cmd_Room_GetInfo_SC::visit");
    }

    // 2. Hook Player Enter
    void* addrRoomEnter = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Room_Enter_SC", "visit", args, 2);
    if (addrRoomEnter) {
        LOGI("Installing Hook: Cmd_Room_Enter_SC::visit at %p", addrRoomEnter);
        DobbyHook(addrRoomEnter, (void*)new_Cmd_Room_Enter_SC_visit, (void**)&old_Cmd_Room_Enter_SC_visit);
    }

    // 3. Hook Ban/Pick Timer
    void* addrBanPick = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Notify_StartBanTogether", "visit", args, 2);
    if (addrBanPick) {
        LOGI("Installing Hook: Cmd_Notify_StartBanTogether::visit at %p", addrBanPick);
        DobbyHook(addrBanPick, (void*)new_Cmd_Notify_StartBanTogether_visit, (void**)&old_Cmd_Notify_StartBanTogether_visit);
    }
}

// Placeholder functions to keep linker happy
void LoadConfig() {}
void UpdateLogicPlayerStats(void* logicBattleManager) {}
BattleStats GetBattleStats() { return {}; }
void MonitorBattleState() {}
