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
// Helper Functions for Data Extraction
// =============================================================

// Extract Player List from RoomInfo
void ParseRoomInfo(void* cmdInstance) {
    if (!cmdInstance) return;

    // 1. Ambil Offset stRoomInfo (RoomInfo) dari Cmd_Room_GetInfo_SC
    static int off_stRoomInfo = 0;
    if (off_stRoomInfo == 0) {
        off_stRoomInfo = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Room_GetInfo_SC", "stRoomInfo");
    }

    if (off_stRoomInfo == 0) {
        // Fallback: Coba field name lain jika 'stRoomInfo' gagal (misal 'stInfo')
        off_stRoomInfo = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Room_GetInfo_SC", "stInfo");
    }

    if (off_stRoomInfo == 0) {
        LOGE("Failed to find offset: Cmd_Room_GetInfo_SC.stRoomInfo (or stInfo)");
        return;
    }

    // Dereference pointer to get RoomInfo object
    void* roomInfoObj = *(void**)((uint64_t)cmdInstance + off_stRoomInfo);

    if (!roomInfoObj) {
        LOGE("RoomInfo object is null!");
        return;
    }

    LOGI("Got RoomInfo Object at %p", roomInfoObj);

    // 2. Ambil Offset vecPlayers (List<RoomPlayerInfo>)
    static int off_vecPlayers = 0;
    if (off_vecPlayers == 0) {
        off_vecPlayers = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomInfo", "vecPlayers");
    }

    if (off_vecPlayers == 0) {
        LOGE("Failed to find offset: RoomInfo.vecPlayers");
        return;
    }

    void* playerListObj = *(void**)((uint64_t)roomInfoObj + off_vecPlayers);

    if (playerListObj) {
        LOGI("DAPAT PLAYER LIST POINTER: %p", playerListObj);
        // TODO: Iterate list
    } else {
        LOGI("Player list is null/empty");
    }
}

// =============================================================
// Fungsi Detour (Palsu) - Untuk Mencegat Data
// =============================================================

// 1. Menangkap Data Room Utama (Full Data) - Post-Deserialization
void new_Cmd_Room_GetInfo_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_GetInfo_SC_visit) old_Cmd_Room_GetInfo_SC_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_GetInfo_SC::visit Selesai! Data Ready at %p", instance);
    ParseRoomInfo(instance);
}

// 2. Menangkap Player Masuk (Incremental Data)
void new_Cmd_Room_Enter_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_Enter_SC_visit) old_Cmd_Room_Enter_SC_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_Enter_SC::visit Selesai! Data Ready at %p", instance);
}

// 3. Menangkap Timer Ban/Pick
void new_Cmd_Notify_StartBanTogether_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Notify_StartBanTogether_visit) old_Cmd_Notify_StartBanTogether_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Cmd_Notify_StartBanTogether::visit Selesai! Data Ready at %p", instance);
}

// =========================================================
// FITUR DIAGNOSA
// =========================================================
void DiagnoseServerData() {
    LOGI("=== MLBS DIAGNOSE START ===");

    const char* targets[] = { "Cmd_Room_GetInfo_SC", "Cmd_Room_Enter_SC", "Cmd_Notify_StartBanTogether" };

    // Variasi Argument Types untuk mengatasi namespace yang mungkin berbeda di runtime
    const char* argsVariants[][2] = {
        { "MTTDProto.SdpUnpacker", "System.Boolean" },
        { "SdpUnpacker", "System.Boolean" },
        { "MTTDProto.SdpUnpackerImpl", "System.Boolean" }
    };

    for (const char* className : targets) {
        bool found = false;
        for (int i = 0; i < 3; i++) {
            const char** args = argsVariants[i];
            void* addr = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", className, "visit", (char**)args, 2);
            if (addr) {
                LOGI("[SUKSES] Found %s::visit(%s) at %p", className, args[0], addr);
                found = true;
                break;
            }
        }
        if (!found) {
            LOGI("[GAGAL] Failed to find %s::visit with known arg types", className);
        }
    }

    LOGI("=== MLBS DIAGNOSE END ===");
}

void InitGameLogic() {
    InitDynamicOffsets();
    DiagnoseServerData();

    LOGI("GameLogic Initialized. Hooking 'visit' methods...");

    // Try robust lookup: 1. Full Namespace, 2. Short Name
    const char* argsFull[] = { "MTTDProto.SdpUnpacker", "System.Boolean" };
    const char* argsShort[] = { "SdpUnpacker", "System.Boolean" };

    auto findMethod = [&](const char* cls) -> void* {
        void* addr = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", cls, "visit", (char**)argsFull, 2);
        if (!addr) {
            addr = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", cls, "visit", (char**)argsShort, 2);
        }
        return addr;
    };

    // 1. Room Info
    void* addr1 = findMethod("Cmd_Room_GetInfo_SC");
    if (addr1) {
        LOGI("Hooking Cmd_Room_GetInfo_SC::visit at %p", addr1);
        DobbyHook(addr1, (void*)new_Cmd_Room_GetInfo_SC_visit, (void**)&old_Cmd_Room_GetInfo_SC_visit);
    } else LOGE("FATAL: Failed to hook Cmd_Room_GetInfo_SC::visit");

    // 2. Room Enter
    void* addr2 = findMethod("Cmd_Room_Enter_SC");
    if (addr2) {
        LOGI("Hooking Cmd_Room_Enter_SC::visit at %p", addr2);
        DobbyHook(addr2, (void*)new_Cmd_Room_Enter_SC_visit, (void**)&old_Cmd_Room_Enter_SC_visit);
    }

    // 3. Ban Pick
    void* addr3 = findMethod("Cmd_Notify_StartBanTogether");
    if (addr3) {
        LOGI("Hooking Cmd_Notify_StartBanTogether::visit at %p", addr3);
        DobbyHook(addr3, (void*)new_Cmd_Notify_StartBanTogether_visit, (void**)&old_Cmd_Notify_StartBanTogether_visit);
    }
}

// Placeholder functions
void LoadConfig() {}
void UpdateLogicPlayerStats(void* logicBattleManager) {}
BattleStats GetBattleStats() { return {}; }
void MonitorBattleState() {}
