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
void (*old_Cmd_Room_GetInfo_SC_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;
void (*old_Cmd_Room_Enter_SC_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;
void (*old_Cmd_Notify_StartBanTogether_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;
void (*old_Cmd_Notify_RoomInfoChange_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;
void (*old_Cmd_Notify_BattlePlayerInfo_visit)(void* instance, void* unpacker, bool bOpt) = nullptr;

// Network Tracing Hooks
void (*old_SendData)(uint32_t uiMsgID, void* sdpMsg, int eSocketType, int packReliType, bool bNeedLockRequestIndex, int cryptoType) = nullptr;
void (*old_ReceiveMsgLog)(int iSocketType, int32_t iMsgID, void* seq) = nullptr;

// =============================================================
// Helper Functions
// =============================================================

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
        if (buf[i] < 128) result += (char)buf[i];
        else result += '?';
    }
    return result;
}

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

bool GetListItems(void* listPointer, void** outItemsArray, int* outSize) {
    if (!listPointer) return false;
    static int off_items = 0;
    static int off_size = 0;
    if (off_items == 0) off_items = Il2CppGetFieldOffset(OBFUSCATE("mscorlib.dll"), OBFUSCATE("System.Collections.Generic"), OBFUSCATE("List`1"), OBFUSCATE("_items"));
    if (off_items == 0) off_items = 0x10;
    if (off_size == 0) off_size = Il2CppGetFieldOffset(OBFUSCATE("mscorlib.dll"), OBFUSCATE("System.Collections.Generic"), OBFUSCATE("List`1"), OBFUSCATE("_size"));
    if (off_size == 0) off_size = 0x18;
    if (!read_memory_safe((void*)((uint64_t)listPointer + off_items), outItemsArray, sizeof(void*))) return false;
    if (!read_memory_safe((void*)((uint64_t)listPointer + off_size), outSize, sizeof(int))) return false;
    return true;
}

uint32_t GetHeroFromScramble(void* dictPointer) {
    if (!dictPointer) return 0;
    static int off_entries = 0;
    static int off_count = 0;
    if (off_entries == 0) off_entries = Il2CppGetFieldOffset(OBFUSCATE("mscorlib.dll"), OBFUSCATE("System.Collections.Generic"), OBFUSCATE("Dictionary`2"), OBFUSCATE("_entries"));
    if (off_entries == 0) off_entries = 0x18;
    if (off_count == 0) off_count = Il2CppGetFieldOffset(OBFUSCATE("mscorlib.dll"), OBFUSCATE("System.Collections.Generic"), OBFUSCATE("Dictionary`2"), OBFUSCATE("_count"));
    if (off_count == 0) off_count = 0x20;

    void* entriesArray = nullptr;
    int count = 0;
    if (!read_memory_safe((void*)((uint64_t)dictPointer + off_entries), &entriesArray, sizeof(entriesArray))) return 0;
    if (!read_memory_safe((void*)((uint64_t)dictPointer + off_count), &count, sizeof(count))) return 0;
    if (!entriesArray || count <= 0) return 0;

    uint64_t entriesStart = (uint64_t)entriesArray + 0x20;
    for (int i = 0; i < count; i++) {
        uint64_t entryAddr = entriesStart + (i * 24);
        void* scrambleHeroObj = nullptr;
        if (read_memory_safe((void*)(entryAddr + 0x10), &scrambleHeroObj, sizeof(scrambleHeroObj))) {
            if (scrambleHeroObj) {
                static int off_uiHeroID = 0;
                if (off_uiHeroID == 0) off_uiHeroID = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("ScrambleHero"), OBFUSCATE("uiHeroID"));
                if (off_uiHeroID == 0) off_uiHeroID = 0x10;
                uint32_t heroId = 0;
                if (read_memory_safe((void*)((uint64_t)scrambleHeroObj + off_uiHeroID), &heroId, sizeof(heroId))) {
                    if (heroId > 0) return heroId;
                }
            }
        }
    }
    return 0;
}

void ProcessRoomPlayerList(void* listPointer) {
    void* itemsArray = nullptr;
    int size = 0;
    if (!GetListItems(listPointer, &itemsArray, &size)) return;

    // LOGI("MLBS_CORE: [ROOM] Found %d players.", size);
    if (!itemsArray || size <= 0 || size > 20) return;

    static int off_ulUid = 0;
    static int off_iPos = 0;
    static int off_strName = 0;
    static int off_uiRankLevel = 0;
    static int off_mapScrambleHero = 0;

    if (off_ulUid == 0) {
        off_ulUid = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("ulUid"));
        off_iPos = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("iPos"));
        off_strName = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("strName"));
        off_uiRankLevel = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("uiRankLevel"));
        off_mapScrambleHero = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomPlayerInfo"), OBFUSCATE("mapScrambleHero"));
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
            read_memory_safe((void*)((uint64_t)playerObj + off_ulUid), &uid, sizeof(uid));
            uint32_t pos = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_iPos), &pos, sizeof(pos));
            uint32_t rankLevel = 0;
            read_memory_safe((void*)((uint64_t)playerObj + off_uiRankLevel), &rankLevel, sizeof(rankLevel));
            uint32_t heroId = 0;
            if (off_mapScrambleHero > 0) {
                void* mapObj = nullptr;
                if (read_memory_safe((void*)((uint64_t)playerObj + off_mapScrambleHero), &mapObj, sizeof(mapObj))) {
                    heroId = GetHeroFromScramble(mapObj);
                }
            }
            if (i > 0) json << ",";
            json << "{" << "\"uid\":" << uid << "," << "\"pos\":" << pos << "," << "\"name\":\"" << SanitizeJson(name) << "\"," << "\"rank\":" << rankLevel << "," << "\"heroId\":" << heroId << "}";
        }
    }
    json << "]";
    std::string finalJson = "{\"type\":\"RoomInfo\", \"data\":" + json.str() + "}";
    BroadcastData(finalJson);
}

void ProcessBattlePlayerList(void* listPointer) {
    void* itemsArray = nullptr;
    int size = 0;
    if (!GetListItems(listPointer, &itemsArray, &size)) return;

    // LOGI("MLBS_CORE: [BATTLE] Found %d players in BattlePlayerInfo.", size);
    if (!itemsArray || size <= 0 || size > 20) return;

    static int off_lUid = 0;
    static int off_iCamp = 0;
    static int off_iPos = 0;
    static int off_strName = 0;
    static int off_uiSelHero = 0;
    static int off_uiSkinId = 0;
    static int off_uiRankLevel = 0;

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
            json << "{" << "\"uid\":" << uid << "," << "\"camp\":" << camp << "," << "\"pos\":" << pos << "," << "\"name\":\"" << SanitizeJson(name) << "\"," << "\"heroId\":" << heroId << "," << "\"skinId\":" << skinId << "," << "\"rank\":" << rankLevel << "}";
        }
    }
    json << "]";
    std::string finalJson = "{\"type\":\"BattleInfo\", \"data\":" + json.str() + "}";
    BroadcastData(finalJson);
}

void ParseRoomInfo(void* cmdInstance) {
    if (!cmdInstance) return;
    static int off_stRoomInfo = 0;
    if (off_stRoomInfo == 0) off_stRoomInfo = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("Cmd_Room_GetInfo_SC"), OBFUSCATE("stRoomInfo"));
    if (off_stRoomInfo == 0) off_stRoomInfo = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("Cmd_Room_GetInfo_SC"), OBFUSCATE("stInfo"));
    if (off_stRoomInfo == 0) return;

    void* roomInfoObj = *(void**)((uint64_t)cmdInstance + off_stRoomInfo);
    if (!roomInfoObj) return;
    static int off_vecPlayers = 0;
    if (off_vecPlayers == 0) off_vecPlayers = Il2CppGetFieldOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("RoomInfo"), OBFUSCATE("vecPlayers"));
    if (off_vecPlayers == 0) return;

    void* playerListObj = *(void**)((uint64_t)roomInfoObj + off_vecPlayers);
    if (playerListObj) ProcessRoomPlayerList(playerListObj);
}

// =============================================================
// Fungsi Detour
// =============================================================

void new_Cmd_Room_GetInfo_SC_visit(void* instance, void* unpacker, bool bOpt) {
    LOGI("TRACE: Cmd_Room_GetInfo_SC Received");
    if(old_Cmd_Room_GetInfo_SC_visit) old_Cmd_Room_GetInfo_SC_visit(instance, unpacker, bOpt);
    ParseRoomInfo(instance);
}

void new_Cmd_Room_Enter_SC_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Room_Enter_SC_visit) old_Cmd_Room_Enter_SC_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_Enter_SC::visit Triggered.");
}

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

void new_Cmd_Notify_RoomInfoChange_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Notify_RoomInfoChange_visit) old_Cmd_Notify_RoomInfoChange_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Cmd_Notify_RoomInfoChange::visit Triggered.");

    // DISABLED: Temporarily disabling detailed parsing to prevent stuck issues
    /*
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
    */
}

void new_Cmd_Notify_BattlePlayerInfo_visit(void* instance, void* unpacker, bool bOpt) {
    if(old_Cmd_Notify_BattlePlayerInfo_visit) old_Cmd_Notify_BattlePlayerInfo_visit(instance, unpacker, bOpt);
    LOGI("MLBS_CORE: [HOOK] Cmd_Notify_BattlePlayerInfo::visit Triggered.");

    // DISABLED: Temporarily disabling detailed parsing to prevent stuck issues
    /*
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
    */
}

// Trace Hooks
void new_SendData(uint32_t uiMsgID, void* sdpMsg, int eSocketType, int packReliType, bool bNeedLockRequestIndex, int cryptoType) {
    // Log outgoing packet ID
    LOGI("TRACE [OUT]: MsgID=%d", uiMsgID);

    // Optional: Log sdpMsg class name if possible
    if (sdpMsg) {
        // Assuming sdpMsg is a valid Il2CppObject
        // Il2CppClass* klass = ((Il2CppObject*)sdpMsg)->klass;
        // if (klass && klass->name) LOGI("  Type: %s", klass->name);
    }

    if (old_SendData) old_SendData(uiMsgID, sdpMsg, eSocketType, packReliType, bNeedLockRequestIndex, cryptoType);
}

void new_ReceiveMsgLog(int iSocketType, int32_t iMsgID, void* seq) {
    // Log incoming packet ID
    // iMsgID is often negative or positive, depending on context? In dump it says int32.
    LOGI("TRACE [IN ]: MsgID=%d", iMsgID);

    if (old_ReceiveMsgLog) old_ReceiveMsgLog(iSocketType, iMsgID, seq);
}

void HookNetworkTrace() {
    LOGI("Initializing Network Trace...");

    // Hook SendData
    void* addrSend = Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("BattleReceiveMessageBridge"), OBFUSCATE("SendData"), 6);
    if (addrSend) {
        LOGI("Hooking BattleReceiveMessageBridge.SendData at %p", addrSend);
        DobbyHook(addrSend, (void*)new_SendData, (void**)&old_SendData);
    } else {
        LOGE("Failed to find BattleReceiveMessageBridge.SendData");
    }

    // Hook ReceiveMsgLog (Incoming)
    // public static System.Void ReceiveMsgLog(GameSocketType iSocketType, System.Int32 iMsgID, System.Nullable<System.UInt32> seq);
    // Note: System.Nullable<T> is a struct. If T is UInt32 (4 bytes), Nullable is often larger (boolean flag + value).
    // It might be passed by value or pointer.
    // For tracing, we just want iMsgID (2nd arg). This usually works fine even if subsequent args are messy.
    void* addrRecv = Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("GameSocket"), OBFUSCATE("ReceiveMsgLog"), 3);
    if (addrRecv) {
        LOGI("Hooking GameSocket.ReceiveMsgLog at %p", addrRecv);
        DobbyHook(addrRecv, (void*)new_ReceiveMsgLog, (void**)&old_ReceiveMsgLog);
    } else {
        LOGE("Failed to find GameSocket.ReceiveMsgLog");
    }
}

void InitGameLogic() {
    InitDynamicOffsets();

    LOGI("GameLogic Initialized.");

    const char* argsFull[] = { "MTTDProto.SdpUnpacker", "System.Boolean" };
    const char* argsShort[] = { "SdpUnpacker", "System.Boolean" };

    auto findMethod = [&](const char* cls) -> void* {
        void* addr = Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), cls, OBFUSCATE("visit"), (char**)argsFull, 2);
        if (!addr) {
            addr = Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), cls, OBFUSCATE("visit"), (char**)argsShort, 2);
        }
        return addr;
    };

    void* addr1 = findMethod("Cmd_Room_GetInfo_SC");
    if (addr1) DobbyHook(addr1, (void*)new_Cmd_Room_GetInfo_SC_visit, (void**)&old_Cmd_Room_GetInfo_SC_visit);

    void* addr2 = findMethod("Cmd_Room_Enter_SC");
    if (addr2) DobbyHook(addr2, (void*)new_Cmd_Room_Enter_SC_visit, (void**)&old_Cmd_Room_Enter_SC_visit);

    void* addr3 = findMethod("Cmd_Notify_StartBanTogether");
    if (addr3) DobbyHook(addr3, (void*)new_Cmd_Notify_StartBanTogether_visit, (void**)&old_Cmd_Notify_StartBanTogether_visit);

    void* addr4 = findMethod("Cmd_Notify_RoomInfoChange");
    if (addr4) DobbyHook(addr4, (void*)new_Cmd_Notify_RoomInfoChange_visit, (void**)&old_Cmd_Notify_RoomInfoChange_visit);

    void* addr5 = findMethod("Cmd_Notify_BattlePlayerInfo");
    if (addr5) DobbyHook(addr5, (void*)new_Cmd_Notify_BattlePlayerInfo_visit, (void**)&old_Cmd_Notify_BattlePlayerInfo_visit);

    // Enable Network Trace
    HookNetworkTrace();
}

void LoadConfig() {}
void UpdateLogicPlayerStats(void* logicBattleManager) {}
BattleStats GetBattleStats() { return {}; }
void MonitorBattleState() {}
