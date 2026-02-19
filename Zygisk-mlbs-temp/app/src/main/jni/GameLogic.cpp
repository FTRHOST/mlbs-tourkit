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
void (*old_Cmd_Room_ChangeInfo_Common_SC_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;
void (*old_Cmd_Room_Hero_Confirm_SC_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;

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

// Iterate List<RoomPlayerInfo> and extract ALL fields
void ProcessPlayerList(void* listPointer) {
    if (!listPointer) return;

    static int off_items = 0;
    static int off_size = 0;

    if (off_items == 0) {
        off_items = Il2CppGetFieldOffset("mscorlib.dll", "System.Collections.Generic", "List`1", "_items");
        if (off_items == 0) off_items = 0x10;
    }
    if (off_size == 0) {
        off_size = Il2CppGetFieldOffset("mscorlib.dll", "System.Collections.Generic", "List`1", "_size");
        if (off_size == 0) off_size = 0x18;
    }

    void* itemsArray = nullptr;
    int size = 0;

    if (!read_memory_safe((void*)((uint64_t)listPointer + off_items), &itemsArray, sizeof(itemsArray))) return;
    if (!read_memory_safe((void*)((uint64_t)listPointer + off_size), &size, sizeof(size))) return;

    LOGI("MLBS_CORE: [PARSER] Found %d players in list.", size);

    if (!itemsArray || size <= 0 || size > 20) return;

    // Field Offsets for MTTDProto.RoomPlayerInfo
    static int off_ulUid = 0;
    static int off_uiSvrId = 0;
    static int off_iPos = 0;
    static int off_strName = 0;
    static int off_uiLevel = 0;
    static int off_uiFaceId = 0;
    static int off_uiNationality = 0;
    static int off_uiRankLevel = 0;
    static int off_uiRankLevelBig = 0;
    static int off_iFaceBorderId = 0;
    static int off_sFacePath = 0;
    static int off_bStarVip = 0;
    static int off_iPingVal = 0;
    static int off_uiPingLimit = 0;
    static int off_bIsWhiteName = 0;
    static int off_iHeroId = 0;
    static int off_iScrambleHeroId = 0;

    // Initialize offsets (Lazy load)
    if (off_ulUid == 0) {
        off_ulUid = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "ulUid");
        off_uiSvrId = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "uiSvrId");
        off_iPos = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "iPos");
        off_strName = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "strName");
        off_uiLevel = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "uiLevel");
        off_uiFaceId = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "uiFaceId");
        off_uiNationality = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "uiNationality");
        off_uiRankLevel = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "uiRankLevel");
        off_uiRankLevelBig = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "uiRankLevelBig");
        off_iFaceBorderId = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "iFaceBorderId");
        off_sFacePath = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "sFacePath");
        off_bStarVip = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "bStarVip");
        off_iPingVal = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "iPingVal");
        off_uiPingLimit = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "uiPingLimit");
        off_bIsWhiteName = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "bIsWhiteName");
        off_iHeroId = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "iHeroId");
        off_iScrambleHeroId = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "RoomPlayerInfo", "iScrambleHeroId");
    }

    uint64_t arrayStart = (uint64_t)itemsArray + 0x20;

    std::stringstream json;
    json << "[";

    for (int i = 0; i < size; i++) {
        void* playerObj = nullptr;
        if (!read_memory_safe((void*)(arrayStart + (i * 8)), &playerObj, sizeof(playerObj))) continue;

        if (playerObj) {
            // Strings
            void* namePtr = nullptr;
            read_memory_safe((void*)((uint64_t)playerObj + off_strName), &namePtr, sizeof(namePtr));
            std::string name = ReadMonoString(namePtr);

            void* facePathPtr = nullptr;
            read_memory_safe((void*)((uint64_t)playerObj + off_sFacePath), &facePathPtr, sizeof(facePathPtr));
            std::string facePath = ReadMonoString(facePathPtr);

            // Primitives
            uint64_t uid = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_ulUid), &uid, sizeof(uid));

            uint32_t svrId = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiSvrId), &svrId, sizeof(svrId));

            uint32_t pos = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_iPos), &pos, sizeof(pos));

            uint32_t level = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiLevel), &level, sizeof(level));

            uint32_t faceId = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiFaceId), &faceId, sizeof(faceId));

            uint32_t nationality = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiNationality), &nationality, sizeof(nationality));

            uint32_t rankLevel = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiRankLevel), &rankLevel, sizeof(rankLevel));

            uint32_t rankLevelBig = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiRankLevelBig), &rankLevelBig, sizeof(rankLevelBig));

            uint32_t faceBorderId = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_iFaceBorderId), &faceBorderId, sizeof(faceBorderId));

            bool starVip = false;
            read_memory_safe((void*)((uint64_t)playerObj + off_bStarVip), &starVip, sizeof(starVip));

            uint32_t pingVal = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_iPingVal), &pingVal, sizeof(pingVal));

            uint32_t pingLimit = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiPingLimit), &pingLimit, sizeof(pingLimit));

            bool isWhiteName = false;
            read_memory_safe((void*)((uint64_t)playerObj + off_bIsWhiteName), &isWhiteName, sizeof(isWhiteName));

            int32_t heroId = 0;
            if (off_iHeroId > 0) read_memory_safe((void*)((uint64_t)playerObj + off_iHeroId), &heroId, sizeof(heroId));

            uint32_t scrambleHeroId = 0;
            if (off_iScrambleHeroId > 0) read_memory_safe((void*)((uint64_t)playerObj + off_iScrambleHeroId), &scrambleHeroId, sizeof(scrambleHeroId));

            // JSON Construction
            if (i > 0) json << ",";
            json << "{"
                 << "\"uid\":" << uid << ","
                 << "\"svrId\":" << svrId << ","
                 << "\"pos\":" << pos << ","
                 << "\"name\":\"" << SanitizeJson(name) << "\","
                 << "\"level\":" << level << ","
                 << "\"faceId\":" << faceId << ","
                 << "\"nationality\":" << nationality << ","
                 << "\"rankLevel\":" << rankLevel << ","
                 << "\"rankLevelBig\":" << rankLevelBig << ","
                 << "\"faceBorderId\":" << faceBorderId << ","
                 << "\"facePath\":\"" << SanitizeJson(facePath) << "\","
                 << "\"starVip\":" << (starVip ? "true" : "false") << ","
                 << "\"pingVal\":" << pingVal << ","
                 << "\"pingLimit\":" << pingLimit << ","
                 << "\"isWhiteName\":" << (isWhiteName ? "true" : "false") << ","
                 << "\"heroId\":" << heroId << ","
                 << "\"scrambleHeroId\":" << scrambleHeroId
                 << "}";

            LOGI(" >> Player %d Parsed: %s (UID: %lu)", i, name.c_str(), uid);
        }
    }
    json << "]";

    std::string finalJson = "{\"type\":\"RoomInfo\", \"data\":" + json.str() + "}";
    LOGI("JSON OUTPUT: %s", finalJson.c_str());

    BroadcastData(finalJson);
}

void ParseRoomInfo(void* cmdInstance) {
    if (!cmdInstance) return;

    static int off_stRoomInfo = 0;
    if (off_stRoomInfo == 0) {
        off_stRoomInfo = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Room_GetInfo_SC", "stRoomInfo");
    }
    if (off_stRoomInfo == 0) {
        off_stRoomInfo = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Room_GetInfo_SC", "stInfo");
    }

    if (off_stRoomInfo == 0) {
        LOGE("Failed to find offset: Cmd_Room_GetInfo_SC.stRoomInfo");
        return;
    }

    void* roomInfoObj = *(void**)((uint64_t)cmdInstance + off_stRoomInfo);
    if (!roomInfoObj) return;

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
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_Enter_SC::visit Selesai!");
}

// 3. Hook Ban/Pick Timer
void new_Cmd_Notify_StartBanTogether_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Notify_StartBanTogether_visit) old_Cmd_Notify_StartBanTogether_visit(instance, unpacker, bOpt);

    static int off_iTime = 0;
    if (off_iTime == 0) off_iTime = Il2CppGetFieldOffset("Assembly-CSharp.dll", "MTTDProto", "Cmd_Notify_StartBanTogether", "iTime");

    if (off_iTime > 0) {
        uint32_t timer = *(uint32_t*)((uint64_t)instance + off_iTime);
        LOGI("MLBS_CORE: [TIMER] Ban Phase Started! Time: %d", timer);

        std::stringstream ss;
        ss << "{\"type\":\"TimerUpdate\", \"phase\":\"ban\", \"time\":" << timer << "}";
        BroadcastData(ss.str());
    }
}

// 4. Hook Room Change Info
void new_Cmd_Room_ChangeInfo_Common_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_ChangeInfo_Common_SC_visit) old_Cmd_Room_ChangeInfo_Common_SC_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_ChangeInfo_Common_SC::visit Selesai!");
}

// 5. Hook Hero Confirm
void new_Cmd_Room_Hero_Confirm_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_Hero_Confirm_SC_visit) old_Cmd_Room_Hero_Confirm_SC_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_Hero_Confirm_SC::visit Selesai!");
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
        void* addr = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", cls, "visit", (char**)argsFull, 2);
        if (!addr) {
            addr = Il2CppGetMethodOffset("Assembly-CSharp.dll", "MTTDProto", cls, "visit", (char**)argsShort, 2);
        }
        return addr;
    };

    void* addr1 = findMethod("Cmd_Room_GetInfo_SC");
    if (addr1) DobbyHook(addr1, (void*)new_Cmd_Room_GetInfo_SC_visit, (void**)&old_Cmd_Room_GetInfo_SC_visit);

    void* addr2 = findMethod("Cmd_Room_Enter_SC");
    if (addr2) DobbyHook(addr2, (void*)new_Cmd_Room_Enter_SC_visit, (void**)&old_Cmd_Room_Enter_SC_visit);

    void* addr3 = findMethod("Cmd_Notify_StartBanTogether");
    if (addr3) DobbyHook(addr3, (void*)new_Cmd_Notify_StartBanTogether_visit, (void**)&old_Cmd_Notify_StartBanTogether_visit);

    void* addr4 = findMethod("Cmd_Room_ChangeInfo_Common_SC");
    if (addr4) {
        LOGI("Hooking Cmd_Room_ChangeInfo_Common_SC::visit at %p", addr4);
        DobbyHook(addr4, (void*)new_Cmd_Room_ChangeInfo_Common_SC_visit, (void**)&old_Cmd_Room_ChangeInfo_Common_SC_visit);
    }

    void* addr5 = findMethod("Cmd_Room_Hero_Confirm_SC");
    if (addr5) {
        LOGI("Hooking Cmd_Room_Hero_Confirm_SC::visit at %p", addr5);
        DobbyHook(addr5, (void*)new_Cmd_Room_Hero_Confirm_SC_visit, (void**)&old_Cmd_Room_Hero_Confirm_SC_visit);
    }
}

// Placeholder functions
void LoadConfig() {}
void UpdateLogicPlayerStats(void* logicBattleManager) {}
BattleStats GetBattleStats() { return {}; }
void MonitorBattleState() {}
