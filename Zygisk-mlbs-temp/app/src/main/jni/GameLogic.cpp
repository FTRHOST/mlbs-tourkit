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
// Helper Functions
// =============================================================

// Helper membaca C# String (UTF-16) ke std::string (UTF-8)
std::string ReadMonoString(void* monoString) {
    if (!monoString) return "";

    // Offset length is typically 0x10 on 64-bit Unity
    int length = 0;
    if (!read_memory_safe((void*)((uint64_t)monoString + 0x10), &length, sizeof(length))) return "";
    if (length <= 0 || length > 4096) return "";

    // Chars start at 0x14
    std::vector<char16_t> buf(length);
    if (!read_memory_safe((void*)((uint64_t)monoString + 0x14), buf.data(), length * sizeof(char16_t))) return "";

    std::string result;
    result.reserve(length);
    for (int i = 0; i < length; i++) {
        if (buf[i] < 128) {
            result += (char)buf[i];
        } else {
            result += '?'; // Simplify non-ascii
        }
    }
    return result;
}

// Iterate List<RoomPlayerInfo> and extract details
void ProcessPlayerList(void* listPointer) {
    if (!listPointer) return;

    // 1. Dapatkan Offset internal List (Standard Unity/Mono)
    // Field: _items (Array) dan _size (Count)
    static int off_items = 0;
    static int off_size = 0;

    if (off_items == 0) {
        // Try to find generic list fields. If fails, use hardcoded 64-bit standard offsets.
        off_items = Il2CppGetFieldOffset("mscorlib.dll", "System.Collections.Generic", "List`1", "_items");
        if (off_items == 0) off_items = 0x10; // Fallback for 64-bit
    }
    if (off_size == 0) {
        off_size = Il2CppGetFieldOffset("mscorlib.dll", "System.Collections.Generic", "List`1", "_size");
        if (off_size == 0) off_size = 0x18;   // Fallback for 64-bit
    }

    // 2. Baca Array dan Size
    void* itemsArray = nullptr;
    int size = 0;

    // Read list internals safely
    if (!read_memory_safe((void*)((uint64_t)listPointer + off_items), &itemsArray, sizeof(itemsArray))) return;
    if (!read_memory_safe((void*)((uint64_t)listPointer + off_size), &size, sizeof(size))) return;

    LOGI("MLBS_CORE: [PARSER] Found %d players in list.", size);

    if (!itemsArray || size <= 0 || size > 20) return;

    // 3. Persiapkan Offset Data Player (Hanya cari sekali)
    // Namespace: MTTDProto, Class: RoomPlayerInfo
    static int off_strName = 0;
    static int off_ulUid = 0;
    static int off_iPos = 0; // Dump shows iPos, using that to infer camp

    if (off_strName == 0) off_strName = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "strName");
    if (off_ulUid == 0) off_ulUid = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "ulUid");
    if (off_iPos == 0) off_iPos = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "iPos");

    // Array data dimulai di offset 0x20 (pada ARM64 Il2Cpp Array)
    uint64_t arrayStart = (uint64_t)itemsArray + 0x20;

    std::stringstream json;
    json << "[";

    for (int i = 0; i < size; i++) {
        // Ambil pointer ke object RoomPlayerInfo ke-i
        void* playerObj = nullptr;
        if (!read_memory_safe((void*)(arrayStart + (i * 8)), &playerObj, sizeof(playerObj))) continue;

        if (playerObj) {
            // A. Ambil Nama
            void* namePtr = nullptr;
            read_memory_safe((void*)((uint64_t)playerObj + off_strName), &namePtr, sizeof(namePtr));
            std::string name = ReadMonoString(namePtr);

            // B. Ambil UID
            uint64_t uid = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_ulUid), &uid, sizeof(uid));

            // C. Ambil Pos/Camp
            // Note: iCamp field not found in dump, using iPos.
            // In MLBB usually pos 1-5 is one team, 6-10 is another, or derived from it.
            // Just logging raw pos for now.
            uint32_t pos = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_iPos), &pos, sizeof(pos));

            LOGI(" >> Player %d: %s | UID: %lu | Pos: %u", i, name.c_str(), uid, pos);

            // Format JSON Sederhana
            if (i > 0) json << ",";
            json << "{\"name\":\"" << name << "\",\"uid\":" << uid << ",\"pos\":" << pos << "}";
        }
    }
    json << "]";

    std::string finalJson = json.str();
    // Use LOGI for output to match user expectation
    LOGI("JSON OUTPUT: %s", finalJson.c_str());

    // Broadcast via IPC
    BroadcastToClients(finalJson);
}

// Extract Player List from RoomInfo
void ParseRoomInfo(void* cmdInstance) {
    if (!cmdInstance) return;

    // 1. Ambil Offset stRoomInfo (RoomInfo) dari Cmd_Room_GetInfo_SC
    static int off_stRoomInfo = 0;
    if (off_stRoomInfo == 0) {
        off_stRoomInfo = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Room_GetInfo_SC", "stRoomInfo");
    }
    // Fallback if needed
    if (off_stRoomInfo == 0) {
        off_stRoomInfo = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Room_GetInfo_SC", "stInfo");
    }

    if (off_stRoomInfo == 0) {
        LOGE("Failed to find offset: Cmd_Room_GetInfo_SC.stRoomInfo");
        return;
    }

    void* roomInfoObj = *(void**)((uint64_t)cmdInstance + off_stRoomInfo);

    if (!roomInfoObj) return; // Silent return if null to reduce log spam on empty objects

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
        ProcessPlayerList(playerListObj);
    }
}

// =============================================================
// Fungsi Detour (Palsu) - Untuk Mencegat Data
// =============================================================

// 1. Menangkap Data Room Utama (Full Data) - Post-Deserialization
void new_Cmd_Room_GetInfo_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_GetInfo_SC_visit) old_Cmd_Room_GetInfo_SC_visit(instance, unpacker, bOpt);
    // Data is ready here
    ParseRoomInfo(instance);
}

// 2. Menangkap Player Masuk (Incremental Data)
void new_Cmd_Room_Enter_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_Enter_SC_visit) old_Cmd_Room_Enter_SC_visit(instance, unpacker, bOpt);
    // LOGI("MLBS_CORE: [HOOK] Cmd_Room_Enter_SC::visit Selesai!");
    // Ideally we parse this too, but focusing on RoomInfo list for now
}

// 3. Menangkap Timer Ban/Pick
void new_Cmd_Notify_StartBanTogether_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Notify_StartBanTogether_visit) old_Cmd_Notify_StartBanTogether_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Ban/Pick Timer Update");
}

// =========================================================
// FITUR DIAGNOSA
// =========================================================
void DiagnoseServerData() {
    LOGI("=== MLBS DIAGNOSE START ===");

    const char* targets[] = { "Cmd_Room_GetInfo_SC" };
    const char* argsVariants[][2] = {
        { "MTTDProto.SdpUnpacker", "System.Boolean" },
        { "SdpUnpacker", "System.Boolean" }
    };

    for (const char* className : targets) {
        bool found = false;
        for (int i = 0; i < 2; i++) {
            const char** args = argsVariants[i];
            void* addr = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", className, "visit", (char**)args, 2);
            if (addr) {
                LOGI("[SUKSES] Found %s::visit(%s) at %p", className, args[0], addr);
                found = true;
                break;
            }
        }
        if (!found) {
            LOGI("[INFO] Diagnose: %s::visit not found (yet).", className);
        }
    }

    LOGI("=== MLBS DIAGNOSE END ===");
}

void InitGameLogic() {
    InitDynamicOffsets();
    DiagnoseServerData();

    LOGI("GameLogic Initialized. Hooking 'visit' methods...");

    const char* argsFull[] = { "MTTDProto.SdpUnpacker", "System.Boolean" };
    const char* argsShort[] = { "SdpUnpacker", "System.Boolean" };

    auto findMethod = [&](const char* cls) -> void* {
        void* addr = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", cls, "visit", (char**)argsFull, 2);
        if (!addr) {
            addr = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", cls, "visit", (char**)argsShort, 2);
        }
        return addr;
    };

    void* addr1 = findMethod("Cmd_Room_GetInfo_SC");
    if (addr1) {
        LOGI("Hooking Cmd_Room_GetInfo_SC::visit at %p", addr1);
        DobbyHook(addr1, (void*)new_Cmd_Room_GetInfo_SC_visit, (void**)&old_Cmd_Room_GetInfo_SC_visit);
    }

    void* addr2 = findMethod("Cmd_Room_Enter_SC");
    if (addr2) {
        DobbyHook(addr2, (void*)new_Cmd_Room_Enter_SC_visit, (void**)&old_Cmd_Room_Enter_SC_visit);
    }

    void* addr3 = findMethod("Cmd_Notify_StartBanTogether");
    if (addr3) {
        DobbyHook(addr3, (void*)new_Cmd_Notify_StartBanTogether_visit, (void**)&old_Cmd_Notify_StartBanTogether_visit);
    }
}

// Placeholder functions
void LoadConfig() {}
void UpdateLogicPlayerStats(void* logicBattleManager) {}
BattleStats GetBattleStats() { return {}; }
void MonitorBattleState() {}
