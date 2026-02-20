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
// Updated hooks based on correct dump analysis
void (*old_Cmd_Notify_RoomInfoChange_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;
void (*old_Cmd_Notify_BattlePlayerInfo_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;

// =============================================================
// Helper Functions
// =============================================================

// Helper membaca C# String (UTF-16) ke std::string (UTF-8)
std::string ReadMonoString(void* monoString) {
    if (!monoString) return "";

    int length = 0;
    if (!read_memory_safe((void*)((uint64_t)monoString + 0x10), &length, sizeof(length))) return "";
    if (length <= 0 || length > 4096) return "";

    std::vector<char16_t> buf(length);
    if (!read_memory_safe((void*)((uint64_t)monoString + 0x14), buf.data(), length * sizeof(char16_t))) return "";

    std::string result;
    result.reserve(length);
    for (int i = 0; i < length; i++) {
        if (buf[i] < 128) {
            result += (char)buf[i];
        } else {
            result += '?';
        }
    }
    return result;
}

// Helper to sanitize strings for JSON
std::string SanitizeJson(const std::string& input) {
    std::string output;
    output.reserve(input.length());
    for (char c : input) {
        switch (c) {
            case '"': output += "\\\""; break;
            case '\\': output += "\\\\"; break;
            case '\b': output += "\\b"; break;
            case '\f': output += "\\f"; break;
            case '\n': output += "\\n"; break;
            case '\r': output += "\\r"; break;
            case '\t': output += "\\t"; break;
            default: output += c; break;
        }
    }
    return output;
}

// Helper for parsing List<T> structure (generic logic)
bool GetListItems(void* listPointer, void** outItemsArray, int* outSize) {
    if (!listPointer) return false;

    static int off_items = 0;
    static int off_size = 0;

    if (off_items == 0) {
        off_items = Il2CppGetFieldOffset(OBFUSCATE("mscorlib.dll"), OBFUSCATE("System.Collections.Generic"), OBFUSCATE("List`1"), OBFUSCATE("_items"));
        if (off_items == 0) off_items = 0x10;
    }
    if (off_size == 0) {
        off_size = Il2CppGetFieldOffset(OBFUSCATE("mscorlib.dll"), OBFUSCATE("System.Collections.Generic"), OBFUSCATE("List`1"), OBFUSCATE("_size"));
        if (off_size == 0) off_size = 0x18;
    }

    if (!read_memory_safe((void*)((uint64_t)listPointer + off_items), outItemsArray, sizeof(void*))) return false;
    if (!read_memory_safe((void*)((uint64_t)listPointer + off_size), outSize, sizeof(int))) return false;

    return true;
}

// Extract fields from MTTDProto.RoomPlayerInfo
void ProcessRoomPlayerList(void* listPointer) {
    void* itemsArray = nullptr;
    int size = 0;
    if (!GetListItems(listPointer, &itemsArray, &size)) return;

    LOGI("MLBS_CORE: [ROOM] Found %d players.", size);
    if (!itemsArray || size <= 0 || size > 20) return;

    // Field Offsets for MTTDProto.RoomPlayerInfo
    static int off_ulUid = 0;
    static int off_iPos = 0;
    static int off_strName = 0;
    static int off_uiLevel = 0;
    static int off_uiRankLevel = 0;
    static int off_bStarVip = 0;

    // Initialize offsets (Lazy load)
    if (off_ulUid == 0) {
        off_ulUid = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("ulUid"));
        off_iPos = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("iPos"));
        off_strName = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("strName"));
        off_uiLevel = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("uiLevel"));
        off_uiRankLevel = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("uiRankLevel"));
        off_bStarVip = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("bStarVip"));
    }

    uint64_t arrayStart = (uint64_t)itemsArray + 0x20; // Array header offset

    std::stringstream json;
    json << "[";

    for (int i = 0; i < size; i++) {
        void* playerObj = nullptr;
        if (!read_memory_safe((void*)(arrayStart + (i * 8)), &playerObj, sizeof(playerObj))) continue;

        if (playerObj) {
            void* namePtr = nullptr;
            read_memory_safe((void*)((uint64_t)playerObj + off_strName), &namePtr, sizeof(namePtr));
            std::string name = ReadMonoString(namePtr);

            uint64_t uid = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_ulUid), &uid, sizeof(uid));

            uint32_t pos = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_iPos), &pos, sizeof(pos));

            uint32_t rankLevel = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiRankLevel), &rankLevel, sizeof(rankLevel));

            if (i > 0) json << ",";
            json << "{"
                 << "\"uid\":" << uid << ","
                 << "\"pos\":" << pos << ","
                 << "\"name\":\"" << SanitizeJson(name) << "\","
                 << "\"rank\":" << rankLevel
                 << "}";
        }
    }
    json << "]";

    std::string finalJson = "{\"type\":\"RoomInfo\", \"data\":" + json.str() + "}";
    BroadcastData(finalJson);
}

// Extract fields from MTTDProto.BattlePlayerInfo (Requested Feature)
void ProcessBattlePlayerList(void* listPointer) {
    void* itemsArray = nullptr;
    int size = 0;
    if (!GetListItems(listPointer, &itemsArray, &size)) return;

    LOGI("MLBS_CORE: [BATTLE] Found %d players in BattlePlayerInfo.", size);
    if (!itemsArray || size <= 0 || size > 20) return;

    // Field Offsets for MTTDProto.BattlePlayerInfo
    static int off_lUid = 0;
    static int off_iCamp = 0;
    static int off_iPos = 0;
    static int off_strName = 0;
    static int off_uiSelHero = 0;
    static int off_uiSkinId = 0;
    static int off_uiRankLevel = 0;

    // Lazy load offsets
    if (off_lUid == 0) {
        off_lUid = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("BattlePlayerInfo"), OBFUSCATE("lUid"));
        off_iCamp = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("BattlePlayerInfo"), OBFUSCATE("iCamp"));
        off_iPos = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("BattlePlayerInfo"), OBFUSCATE("iPos"));
        off_strName = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("BattlePlayerInfo"), OBFUSCATE("strName"));
        off_uiSelHero = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("BattlePlayerInfo"), OBFUSCATE("uiSelHero"));
        off_uiSkinId = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("BattlePlayerInfo"), OBFUSCATE("uiSkinId"));
        off_uiRankLevel = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("BattlePlayerInfo"), OBFUSCATE("uiRankLevel"));
    }

    uint64_t arrayStart = (uint64_t)itemsArray + 0x20;

    std::stringstream json;
    json << "[";

    for (int i = 0; i < size; i++) {
        void* playerObj = nullptr;
        if (!read_memory_safe((void*)(arrayStart + (i * 8)), &playerObj, sizeof(playerObj))) continue;

        if (playerObj) {
            void* namePtr = nullptr;
            read_memory_safe((void*)((uint64_t)playerObj + off_strName), &namePtr, sizeof(namePtr));
            std::string name = ReadMonoString(namePtr);

            uint64_t uid = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_lUid), &uid, sizeof(uid));

            uint32_t camp = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_iCamp), &camp, sizeof(camp));

            uint32_t pos = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_iPos), &pos, sizeof(pos));

            uint32_t heroId = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiSelHero), &heroId, sizeof(heroId));

            uint32_t skinId = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiSkinId), &skinId, sizeof(skinId));

            uint32_t rankLevel = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiRankLevel), &rankLevel, sizeof(rankLevel));

            if (i > 0) json << ",";
            json << "{"
                 << "\"uid\":" << uid << ","
                 << "\"camp\":" << camp << ","
                 << "\"pos\":" << pos << ","
                 << "\"name\":\"" << SanitizeJson(name) << "\","
                 << "\"heroId\":" << heroId << ","
                 << "\"skinId\":" << skinId << ","
                 << "\"rank\":" << rankLevel
                 << "}";

            LOGI(" >> BattlePlayer %d: %s (Hero: %d)", i, name.c_str(), heroId);
        }
    }
    json << "]";

    std::string finalJson = "{\"type\":\"BattleInfo\", \"data\":" + json.str() + "}";
    BroadcastData(finalJson);
}

void ParseRoomInfo(void* cmdInstance) {
    if (!cmdInstance) return;

    static int off_stRoomInfo = 0;
    if (off_stRoomInfo == 0) {
        // Try exact name first
        off_stRoomInfo = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("Cmd_Room_GetInfo_SC"), OBFUSCATE("stRoomInfo"));
    }
    if (off_stRoomInfo == 0) {
        // Fallback or alias
        off_stRoomInfo = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("Cmd_Room_GetInfo_SC"), OBFUSCATE("stInfo"));
    }

    if (off_stRoomInfo == 0) return;

    void* roomInfoObj = *(void**)((uint64_t)cmdInstance + off_stRoomInfo);
    if (!roomInfoObj) return;

    static int off_vecPlayers = 0;
    if (off_vecPlayers == 0) {
        off_vecPlayers = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomInfo"), OBFUSCATE("vecPlayers"));
    }

    if (off_vecPlayers == 0) return;

    void* playerListObj = *(void**)((uint64_t)roomInfoObj + off_vecPlayers);
    if (playerListObj) {
        ProcessRoomPlayerList(playerListObj);
    }
}

// =============================================================
// Fungsi Detour
// =============================================================

// 1. Hook Room Info (Full Data)
void new_Cmd_Room_GetInfo_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_GetInfo_SC_visit) old_Cmd_Room_GetInfo_SC_visit(instance, unpacker, bOpt);
    ParseRoomInfo(instance);
}

// 2. Hook Room Enter
void new_Cmd_Room_Enter_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_Enter_SC_visit) old_Cmd_Room_Enter_SC_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_Enter_SC::visit Triggered.");
    // Usually triggers a GetInfo refresh
}

// 3. Hook Ban/Pick Timer
void new_Cmd_Notify_StartBanTogether_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Notify_StartBanTogether_visit) old_Cmd_Notify_StartBanTogether_visit(instance, unpacker, bOpt);

    static int off_iTime = 0;
    if (off_iTime == 0) off_iTime = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("Cmd_Notify_StartBanTogether"), OBFUSCATE("iTime"));

    if (off_iTime > 0) {
        uint32_t timer = *(uint32_t*)((uint64_t)instance + off_iTime);
        LOGI("MLBS_CORE: [TIMER] Ban Phase Started! Time: %d", timer);

        std::stringstream ss;
        ss << "{\"type\":\"TimerUpdate\", \"phase\":\"ban\", \"time\":" << timer << "}";
        BroadcastData(ss.str());
    }
}

// 4. Hook Notify Room Info Change (Alternative for Room Updates)
void new_Cmd_Notify_RoomInfoChange_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Notify_RoomInfoChange_visit) old_Cmd_Notify_RoomInfoChange_visit(instance, unpacker, bOpt);

    LOGI("MLBS_CORE: [HOOK] Cmd_Notify_RoomInfoChange::visit Triggered.");

    static int off_stRoomInfo_Change = 0;
    if (off_stRoomInfo_Change == 0) {
        off_stRoomInfo_Change = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("Cmd_Notify_RoomInfoChange"), OBFUSCATE("stRoomInfo"));
    }

    if (off_stRoomInfo_Change > 0) {
        void* roomInfoObj = *(void**)((uint64_t)instance + off_stRoomInfo_Change);
        if (roomInfoObj) {
            static int off_vecPlayers = 0;
            if (off_vecPlayers == 0) {
                off_vecPlayers = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomInfo"), OBFUSCATE("vecPlayers"));
            }
            if (off_vecPlayers > 0) {
                void* playerListObj = *(void**)((uint64_t)roomInfoObj + off_vecPlayers);
                if (playerListObj) ProcessRoomPlayerList(playerListObj);
            }
        }
    }
}

// 5. Hook Battle Player Info (Loading Screen / Final Draft Data)
void new_Cmd_Notify_BattlePlayerInfo_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Notify_BattlePlayerInfo_visit) old_Cmd_Notify_BattlePlayerInfo_visit(instance, unpacker, bOpt);

    LOGI("MLBS_CORE: [HOOK] Cmd_Notify_BattlePlayerInfo::visit Triggered.");

    static int off_vPlayer = 0;
    if (off_vPlayer == 0) {
        off_vPlayer = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("Cmd_Notify_BattlePlayerInfo"), OBFUSCATE("vPlayer"));
    }

    if (off_vPlayer > 0) {
        void* playerListObj = *(void**)((uint64_t)instance + off_vPlayer);
        if (playerListObj) {
            ProcessBattlePlayerList(playerListObj);
        }
    }
}


// =========================================================
// FITUR DIAGNOSA
// =========================================================
void DiagnoseServerData() {
    LOGI("=== MLBS DIAGNOSE START ===");

    const char* targets[] = {
        "Cmd_Room_GetInfo_SC",
        "Cmd_Notify_RoomInfoChange",
        "Cmd_Notify_BattlePlayerInfo"
    };

    const char* argsVariants[][2] = {
        { "MTTDProto.SdpUnpacker", "System.Boolean" },
        { "SdpUnpacker", "System.Boolean" }
    };

    for (const char* className : targets) {
        bool found = false;
        for (int i = 0; i < 2; i++) {
            const char** args = argsVariants[i];
            void* addr = Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), className, OBFUSCATE("visit"), (char**)args, 2);
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

// =========================================================
// Initialization
// =========================================================

void InitGameLogic() {
    InitDynamicOffsets();
    DiagnoseServerData();

    LOGI("GameLogic Initialized. Hooking 'visit' methods...");

    const char* argsFull[] = { "MTTDProto.SdpUnpacker", "System.Boolean" };
    const char* argsShort[] = { "SdpUnpacker", "System.Boolean" };

    auto findMethod = [&](const char* cls) -> void* {
        void* addr = Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), cls, OBFUSCATE("visit"), (char**)argsFull, 2);
        if (!addr) {
            addr = Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), cls, OBFUSCATE("visit"), (char**)argsShort, 2);
        }
        return addr;
    };

    // 1. Room Get Info
    void* addr1 = findMethod("Cmd_Room_GetInfo_SC");
    if (addr1) DobbyHook(addr1, (void*)new_Cmd_Room_GetInfo_SC_visit, (void**)&old_Cmd_Room_GetInfo_SC_visit);

    // 2. Room Enter
    void* addr2 = findMethod("Cmd_Room_Enter_SC");
    if (addr2) DobbyHook(addr2, (void*)new_Cmd_Room_Enter_SC_visit, (void**)&old_Cmd_Room_Enter_SC_visit);

    // 3. Ban Timer
    void* addr3 = findMethod("Cmd_Notify_StartBanTogether");
    if (addr3) DobbyHook(addr3, (void*)new_Cmd_Notify_StartBanTogether_visit, (void**)&old_Cmd_Notify_StartBanTogether_visit);

    // 4. Room Info Change (Updates)
    void* addr4 = findMethod("Cmd_Notify_RoomInfoChange");
    if (addr4) {
        LOGI("Hooking Cmd_Notify_RoomInfoChange::visit at %p", addr4);
        DobbyHook(addr4, (void*)new_Cmd_Notify_RoomInfoChange_visit, (void**)&old_Cmd_Notify_RoomInfoChange_visit);
    }

    // 5. Battle Player Info (Final Draft / Loading)
    void* addr5 = findMethod("Cmd_Notify_BattlePlayerInfo");
    if (addr5) {
        LOGI("Hooking Cmd_Notify_BattlePlayerInfo::visit at %p", addr5);
        DobbyHook(addr5, (void*)new_Cmd_Notify_BattlePlayerInfo_visit, (void**)&old_Cmd_Notify_BattlePlayerInfo_visit);
    }
}

// Placeholder functions
void LoadConfig() {}
void UpdateLogicPlayerStats(void* logicBattleManager) {}
BattleStats GetBattleStats() { return {}; }
void MonitorBattleState() {}
