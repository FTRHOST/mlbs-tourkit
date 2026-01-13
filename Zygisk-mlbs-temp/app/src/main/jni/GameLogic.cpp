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

void* g_LogicBattleManager_Instance = nullptr;
void* g_BattleData_Instance = nullptr;
void* g_UIRankHero_Instance = nullptr;

// Hook Functions
void (*orig_UIRankHero_Update)(void* instance);
void hook_UIRankHero_Update(void* instance) {
    g_UIRankHero_Instance = instance;
    if (orig_UIRankHero_Update) orig_UIRankHero_Update(instance);
}

void (*orig_LogicBattleManager_Update)(void* instance);
void hook_LogicBattleManager_Update(void* instance) {
    g_LogicBattleManager_Instance = instance;
    if (orig_LogicBattleManager_Update) orig_LogicBattleManager_Update(instance);
}

#define LOG_TAG "MLBS_CORE"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

// --- Helper Functions ---

std::string SafeReadString(uintptr_t monoStringPtr) {
    if (monoStringPtr == 0) return "";
    int32_t length = 0;
    if (!read_memory_safe((void*)(monoStringPtr + 0x10), &length, sizeof(length))) return "";
    if (length <= 0 || length > 1024) return "";
    std::u16string u16;
    u16.resize(length);
    if (!read_memory_safe((void*)(monoStringPtr + 0x14), &u16[0], length * sizeof(char16_t))) return "";
    std::string utf8;
    utf8.reserve(length);
    for (char16_t c : u16) {
        if (c < 0x80) utf8.push_back((char)c);
        else utf8.push_back('?'); 
    }
    return utf8;
}

// Macros for reading fields relative to a 'pawn' pointer
#define READ_FIELD(target, type, offset) \
    if(offset > 0) { \
        read_memory_safe((void*)((uintptr_t)pawn + offset), &target, sizeof(type)); \
    }

#define READ_STRING(target, offset) \
    if(offset > 0) { \
        uintptr_t strPtr = 0; \
        if (read_memory_safe((void*)((uintptr_t)pawn + offset), &strPtr, sizeof(strPtr)) && strPtr != 0) { \
            target = SafeReadString(strPtr); \
        } \
    }

#define READ_PTR(target, offset) \
    if(offset > 0) { \
        read_memory_safe((void*)((uintptr_t)pawn + offset), &target, sizeof(uintptr_t)); \
    }

// --- Stats Updaters ---

BattleStats GetBattleStatsInternal() {
    BattleStats stats = {};
    void* showFightDataInstance = nullptr;
    Il2CppGetStaticFieldValue(OBFUSCATE("Assembly-CSharp.dll"), "", OBFUSCATE("ShowFightData"), OBFUSCATE("Instance"), &showFightDataInstance);
    if (showFightDataInstance) {
        uintptr_t pawn = (uintptr_t)showFightDataInstance;
        READ_FIELD(stats.m_levelOnSixMin, uint32_t, OFF_ShowFightDataTiny_m_levelOnSixMin);
        READ_FIELD(stats.m_LevelOnTwelveMin, uint32_t, OFF_ShowFightDataTiny_m_LevelOnTwelveMin);
        READ_FIELD(stats.m_KillNumCrossTower, uint32_t, OFF_ShowFightDataTiny_m_KillNumCrossTower);
        READ_FIELD(stats.m_RevengeKillNum, uint32_t, OFF_ShowFightDataTiny_m_RevengeKillNum);
        READ_FIELD(stats.m_ExtremeBackHomeNum, uint32_t, OFF_ShowFightDataTiny_m_ExtremeBackHomeNum);
        READ_FIELD(stats.bLockGuidChanged, bool, OFF_ShowFightDataTiny_bLockGuidChanged);
        READ_FIELD(stats.m_BackHomeCount, uint32_t, OFF_ShowFightDataTiny_m_BackHomeCount);
        READ_FIELD(stats.m_RecoverSuccessfullyCount, uint32_t, OFF_ShowFightDataTiny_m_RecoverSuccessfullyCount);
        READ_FIELD(stats.m_BuyEquipCount, uint32_t, OFF_ShowFightDataTiny_m_BuyEquipCount);
        READ_FIELD(stats.m_BuyEquipTime, float, OFF_ShowFightDataTiny_m_BuyEquipTime);
        READ_FIELD(stats.m_uSurvivalCount, uint32_t, OFF_ShowFightDataTiny_m_uSurvivalCount);
        READ_FIELD(stats.m_uPlayerCount, uint32_t, OFF_ShowFightDataTiny_m_uPlayerCount);
        READ_FIELD(stats.m_iCampAKill, int32_t, OFF_ShowFightDataTiny_m_iCampAKill);
        READ_FIELD(stats.m_iCampBKill, int32_t, OFF_ShowFightDataTiny_m_iCampBKill);
        READ_FIELD(stats.m_CampAGold, uint32_t, OFF_ShowFightDataTiny_m_CampAGold);
        READ_FIELD(stats.m_CampBGold, uint32_t, OFF_ShowFightDataTiny_m_CampBGold);
        READ_FIELD(stats.m_CampAExp, uint32_t, OFF_ShowFightDataTiny_m_CampAExp);
        READ_FIELD(stats.m_CampBExp, uint32_t, OFF_ShowFightDataTiny_m_CampBExp);
        READ_FIELD(stats.m_CampAKillTower, uint32_t, OFF_ShowFightDataTiny_m_CampAKillTower);
        READ_FIELD(stats.m_CampBKillTower, uint32_t, OFF_ShowFightDataTiny_m_CampBKillTower);
        READ_FIELD(stats.m_CampAKillLingZhu, uint32_t, OFF_ShowFightDataTiny_m_CampAKillLingZhu);
        READ_FIELD(stats.m_CampBKillLingZhu, uint32_t, OFF_ShowFightDataTiny_m_CampBKillLingZhu);
        READ_FIELD(stats.m_CampAKillShenGui, uint32_t, OFF_ShowFightDataTiny_m_CampAKillShenGui);
        READ_FIELD(stats.m_CampBKillShenGui, uint32_t, OFF_ShowFightDataTiny_m_CampBKillShenGui);
        READ_FIELD(stats.m_CampAKillLingzhuOnSuperior, uint32_t, OFF_ShowFightDataTiny_m_CampAKillLingzhuOnSuperior);
        READ_FIELD(stats.m_CampBKillLingzhuOnSuperior, uint32_t, OFF_ShowFightDataTiny_m_CampBKillLingzhuOnSuperior);
        READ_FIELD(stats.m_CampASuperiorTime, uint32_t, OFF_ShowFightDataTiny_m_CampASuperiorTime);
        READ_FIELD(stats.m_CampBSuperiorTime, uint32_t, OFF_ShowFightDataTiny_m_CampBSuperiorTime);
        READ_FIELD(stats.m_iFirstBldTime, uint32_t, OFF_ShowFightDataTiny_m_iFirstBldTime);
        READ_FIELD(stats.m_iFirstBldKiller, uint32_t, OFF_ShowFightDataTiny_m_iFirstBldKiller);
    }
    return stats;
}

void UpdateLogicPlayerStats(void* logicBattleManager) {
    if (!logicBattleManager) return;
    {
        std::lock_guard<std::mutex> lock(g_State.stateMutex);
        if (g_State.battleState < 3) return;
    }
    std::vector<LogicPlayerStats> localLogicPlayers;
    auto processList = [&](uintptr_t listOffset) {
        if (listOffset == 0) return;
        void* listPtr = nullptr;
        if (!read_memory_safe((void*)((uintptr_t)logicBattleManager + listOffset), &listPtr, sizeof(listPtr)) || !listPtr) return;
        auto* list = (monoList<void*>*)listPtr;
        int size = list->getSize();
        if (size < 0 || size > 20) return; 
        for (int i = 0; i < size; i++) {
            void* pawn = list->getItems()[i];
            if (!pawn) continue;
            LogicPlayerStats s = {};
            READ_PTR(s.m_LoigcBezierBullet_Ptr, OFF_LogicPlayer_m_LoigcBezierBullet);
            READ_PTR(s.moveControllers_Ptr, OFF_LogicPlayer_moveControllers);
            READ_PTR(s.m_copyHurtCount_Ptr, OFF_LogicPlayer_m_copyHurtCount);
            READ_PTR(s.m_dictFirstHitHeroTime_Ptr, OFF_LogicPlayer_m_dictFirstHitHeroTime);
            READ_PTR(s.m_listTimeSpent4Kill_Ptr, OFF_LogicPlayer_m_listTimeSpent4Kill);
            READ_PTR(s.m_arrSavedPositions_Ptr, OFF_LogicPlayer_m_arrSavedPositions);
            READ_PTR(s.hurtInfos_Ptr, OFF_LogicPlayer_hurtInfos);
            READ_PTR(s.enemySightLoss_Ptr, OFF_LogicPlayer_enemySightLoss);
            READ_PTR(s.endedSightValue_Ptr, OFF_LogicPlayer_endedSightValue);
            READ_PTR(s.ongoingSightValue_Ptr, OFF_LogicPlayer_ongoingSightValue);
            READ_PTR(s.multiKillAssistIDs_Ptr, OFF_LogicPlayer_multiKillAssistIDs);
            READ_PTR(s.m_LogicGuLianBulletManger_Ptr, OFF_LogicPlayer_m_LogicGuLianBulletManger);
            READ_PTR(s.m_magicTranSpellSideEffect_Ptr, OFF_LogicPlayer_m_magicTranSpellSideEffect);
            READ_PTR(s.m_magicTranSpellStageEffect_Ptr, OFF_LogicPlayer_m_magicTranSpellStageEffect);
            READ_PTR(s.m_TwinPlayer_Ptr, OFF_LogicPlayer_m_TwinPlayer);
            READ_PTR(s.m_summonTwinAI_Ptr, OFF_LogicPlayer_m_summonTwinAI);
            READ_PTR(s.m_AFKTurnAIComponent_Ptr, OFF_LogicPlayer_m_AFKTurnAIComponent);
            READ_PTR(s.m_uiAFKHoldCDRangeTimes_Ptr, OFF_LogicPlayer_m_uiAFKHoldCDRangeTimes);
            READ_PTR(s.m_SynFightData_Ptr, OFF_LogicPlayer_m_SynFightData);
            READ_PTR(s.dicIgnoreOpered_Ptr, OFF_LogicPlayer_dicIgnoreOpered);
            READ_PTR(s.m_RelativeScore_Ptr, OFF_LogicPlayer_m_RelativeScore);
            READ_PTR(s.dicTalentSkill_Ptr, OFF_LogicPlayer_dicTalentSkill);
            READ_PTR(s.dicRuneSkill2023_Ptr, OFF_LogicPlayer_dicRuneSkill2023);
            READ_PTR(s.lsMissions_Ptr, OFF_LogicPlayer_lsMissions);
            READ_PTR(s.easterEggMissions_Ptr, OFF_LogicPlayer_easterEggMissions);
            READ_PTR(s.m_lsEmoji_Ptr, OFF_LogicPlayer_m_lsEmoji);
            READ_PTR(s.m_lsAutoEmoji_Ptr, OFF_LogicPlayer_m_lsAutoEmoji);
            READ_PTR(s.m_lsAnima_Ptr, OFF_LogicPlayer_m_lsAnima);
            READ_PTR(s.m_lsGraffiti_Ptr, OFF_LogicPlayer_m_lsGraffiti);
            READ_PTR(s.m_PlayerData_Ptr, OFF_LogicPlayer_m_PlayerData);
            READ_PTR(s.m_ConfigData_Ptr, OFF_LogicPlayer_m_ConfigData);
            READ_PTR(s.m_HeroCostType_Ptr, OFF_LogicPlayer_m_HeroCostType);
            READ_PTR(s.m_BattleConfig_Ptr, OFF_LogicPlayer_m_BattleConfig);
            READ_PTR(s.m_TowerTurnData_Ptr, OFF_LogicPlayer_m_TowerTurnData);
            READ_PTR(s.m_OperateTimeMonitor_Ptr, OFF_LogicPlayer_m_OperateTimeMonitor);
            READ_PTR(s.m_CheckNearComponent_Ptr, OFF_LogicPlayer_m_CheckNearComponent);
            READ_PTR(s.m_EstimateAttrComponent_Ptr, OFF_LogicPlayer_m_EstimateAttrComponent);
            READ_PTR(s.m_StoreSkillComp_Ptr, OFF_LogicPlayer_m_StoreSkillComp);
            READ_PTR(s.m_operCache_Ptr, OFF_LogicPlayer_m_operCache);
            READ_PTR(s.m_HighLightComp_Ptr, OFF_LogicPlayer_m_HighLightComp);
            READ_PTR(s.m_GankShoeRewardComp_Ptr, OFF_LogicPlayer_m_GankShoeRewardComp);
            READ_PTR(s.m_ReqMoveDir_Ptr, OFF_LogicPlayer_m_ReqMoveDir);
            READ_PTR(s.m_ReqMovePos_Ptr, OFF_LogicPlayer_m_ReqMovePos);
            READ_PTR(s.listKillTime_Ptr, OFF_LogicPlayer_listKillTime);
            READ_PTR(s.m_vDelayRemoveSkillIds_Ptr, OFF_LogicPlayer_m_vDelayRemoveSkillIds);
            READ_PTR(s.m_HitHeroTimes_SkillGuid_Ptr, OFF_LogicPlayer_m_HitHeroTimes_SkillGuid);
            READ_PTR(s.m_dStealValue_Ptr, OFF_LogicPlayer_m_dStealValue);
            READ_PTR(s.m_AutoAttackAI_Ptr, OFF_LogicPlayer_m_AutoAttackAI);
            READ_PTR(s.m_LogicPunish_Ptr, OFF_LogicPlayer_m_LogicPunish);
            READ_PTR(s.m_Killer_Ptr, OFF_LogicPlayer_m_Killer);
            READ_PTR(s.m_DevourData_Ptr, OFF_LogicPlayer_m_DevourData);
            READ_PTR(s.m_ControlSummer_Ptr, OFF_LogicPlayer_m_ControlSummer);
            READ_PTR(s.m_vSkillLogicFighter_Ptr, OFF_LogicPlayer_m_vSkillLogicFighter);
            READ_PTR(s.m_vPlayerDeadInfo_Ptr, OFF_LogicPlayer_m_vPlayerDeadInfo);
            READ_PTR(s.m_RecmendEquips_Ptr, OFF_LogicPlayer_m_RecmendEquips);
            READ_PTR(s.m_v2StarDir_Ptr, OFF_LogicPlayer_m_v2StarDir);
            READ_PTR(s.shopData_Ptr, OFF_LogicPlayer_shopData);
            READ_PTR(s.v2LastCheckPos_Ptr, OFF_LogicPlayer_v2LastCheckPos);
            READ_PTR(s.lastCheckMoveDir_Ptr, OFF_LogicPlayer_lastCheckMoveDir);
            READ_PTR(s.lastFailedAutoAiSpellCast_Ptr, OFF_LogicPlayer_lastFailedAutoAiSpellCast);
            READ_PTR(s.ownNormalSkillCache_Ptr, OFF_LogicPlayer_ownNormalSkillCache);
            READ_PTR(s.lEatFruits_Ptr, OFF_LogicPlayer_lEatFruits);
            
            READ_FIELD(s.m_ID, int32_t, OFF_LogicPlayer_m_ID);
            READ_FIELD(s.totalGold, int32_t, OFF_LogicPlayer_totalGold);
            READ_FIELD(s.m_HurtTotalValue, double, OFF_LogicPlayer_m_HurtTotalValue);
            READ_FIELD(s.m_TotalExp, int32_t, OFF_LogicPlayer_m_TotalExp);
            READ_FIELD(s.TripleKillTimes, int32_t, OFF_LogicPlayer_TripleKillTimes);
            READ_FIELD(s.QuadraKillTimes, int32_t, OFF_LogicPlayer_QuadraKillTimes);
            READ_FIELD(s.PentaKillTimes, int32_t, OFF_LogicPlayer_PentaKillTimes);
            
            localLogicPlayers.push_back(s);
        }
    };
    processList(OFF_BattleManager_m_LocalPlayerShow); 
    processList(OFF_BattleManager_m_ShowPlayers);
    
    { std::lock_guard<std::mutex> lock(g_State.stateMutex); g_State.logicPlayers = localLogicPlayers; }
}

void UpdateBattleStats(void* logicBattleManager) {
    float time = 0.0f;
    if (BattleStaticInit_GetTime) {
         float (*GetTimeFunc)() = (float (*)())BattleStaticInit_GetTime;
         time = GetTimeFunc();
    }
    BattleStats stats = GetBattleStatsInternal();
    std::vector<PlayerBattleData> localBattlePlayers;
    void* battleDataInstance = nullptr;
    Il2CppGetStaticFieldValue(OBFUSCATE("Assembly-CSharp.dll"), "", OBFUSCATE("BattleData"), OBFUSCATE("Instance"), &battleDataInstance);
    
    if (battleDataInstance && OFF_BattleData_heroInfoList > 0) {
        void* dictPtr = nullptr;
        if (read_memory_safe((void*)((uintptr_t)battleDataInstance + OFF_BattleData_heroInfoList), &dictPtr, sizeof(dictPtr)) && dictPtr) {
            auto* dictionary = (Dictionary<uint32_t, void*>*)dictPtr;
            if (dictionary->entries && dictionary->count > 0 && dictionary->count < 50) {
                auto entries = dictionary->entries->toCPPlist();
                for (auto& entry : entries) {
                    void* fightHeroInfo = entry.value;
                    if (!fightHeroInfo) continue;
                    PlayerBattleData pb = {};
                    void* pawn = fightHeroInfo; 
                    READ_FIELD(pb.uGuid, uint32_t, OFF_FightHeroInfo_m_uGuid);
                    READ_STRING(pb.playerName, OFF_FightHeroInfo_m_PlayerName);
                    READ_FIELD(pb.campType, int32_t, OFF_FightHeroInfo_m_CampType);
                    READ_FIELD(pb.kill, uint32_t, OFF_FightHeroInfo_m_KillNum);
                    READ_FIELD(pb.death, uint32_t, OFF_FightHeroInfo_m_DeadNum);
                    READ_FIELD(pb.assist, uint32_t, OFF_FightHeroInfo_m_AssistNum);
                    READ_FIELD(pb.gold, uint32_t, OFF_FightHeroInfo_m_Gold);
                    READ_FIELD(pb.totalGold, uint32_t, OFF_FightHeroInfo_m_TotalGold);
                    localBattlePlayers.push_back(pb);
                }
            }
        }
    }
    {
        std::lock_guard<std::mutex> lock(g_State.stateMutex);
        g_State.battleStats.gameTime = time;
        g_State.battleStats.m_levelOnSixMin = stats.m_levelOnSixMin;
        g_State.battleStats.m_LevelOnTwelveMin = stats.m_LevelOnTwelveMin;
        g_State.battleStats.m_KillNumCrossTower = stats.m_KillNumCrossTower;
        g_State.battlePlayers = localBattlePlayers;
    }
    UpdateLogicPlayerStats(logicBattleManager);
}

void UpdateBanPickState() {
    if (!g_UIRankHero_Instance) {
        Il2CppGetStaticFieldValue(OBFUSCATE("Assembly-CSharp.dll"), "", OBFUSCATE("UIRankHero"), OBFUSCATE("Instance"), &g_UIRankHero_Instance);
        if (!g_UIRankHero_Instance) return;
    }
    
    void* pawn = g_UIRankHero_Instance;
    BanPickState bp = {};
    
    auto readIntList = [&](uintptr_t offset) -> std::vector<int32_t> {
        std::vector<int32_t> res;
        uintptr_t listPtr = 0;
        if(offset > 0) {
             read_memory_safe((void*)((uintptr_t)pawn + offset), &listPtr, sizeof(listPtr));
             if (listPtr) {
                 auto* list = (monoList<int32_t>*)listPtr;
                 if (list->getSize() > 0 && list->getSize() < 20) {
                     res = list->toCPPlist();
                 }
             }
        }
        return res;
    };

    bp.banList = readIntList(OFF_UIRankHero_banList);
    bp.pickList = readIntList(OFF_UIRankHero_pickList);
    
    READ_FIELD(bp.banOrder, int32_t, OFF_UIRankHero_banOrder);
    READ_FIELD(bp.pickOrder, int32_t, OFF_UIRankHero_pickOrder);
    READ_FIELD(bp.startBanTime, float, OFF_UIRankHero__startBanTime);
    READ_FIELD(bp.startSelectTime, float, OFF_UIRankHero__startSelectTime);
    READ_FIELD(bp.banTimeSpan, int32_t, OFF_UIRankHero_iBanTimeSpan);
    READ_FIELD(bp.pickTimeSpan, int32_t, OFF_UIRankHero_iPickTimeSpan);

    {
        std::lock_guard<std::mutex> lock(g_State.stateMutex);
        g_State.banPickState = bp;
    }
}

void UpdatePlayerInfo() {
    auto battlePlayerList = ((monoList<void *> *(*)(uintptr_t))SystemData_GetBattlePlayerInfo)((uintptr_t)0);
    if (!battlePlayerList) {
        std::lock_guard<std::mutex> lock(g_State.stateMutex);
        if (!g_State.players.empty()) g_State.players.clear();
        return;
    }
    std::lock_guard<std::mutex> lock(g_State.stateMutex);
    g_State.players.clear();
    for (int i = 0; i < battlePlayerList->getSize(); i++) {
        void *pawn = battlePlayerList->getItems()[i];
        if (!pawn) continue;
        PlayerData p = {};
        READ_FIELD(p.lUid, uint64_t, OFF_SystemData_RoomData_lUid);
        READ_FIELD(p.bUid, uint64_t, OFF_SystemData_RoomData_bUid);
        READ_FIELD(p.iCamp, uint32_t, OFF_SystemData_RoomData_iCamp);
        READ_FIELD(p.iPos, uint32_t, OFF_SystemData_RoomData_iPos);
        READ_STRING(p._sName, OFF_SystemData_RoomData__sName);
        READ_FIELD(p.heroid, uint32_t, OFF_SystemData_RoomData_heroid);
        READ_FIELD(p.heroskin, uint32_t, OFF_SystemData_RoomData_heroskin);
        READ_FIELD(p.summonSkillId, int32_t, OFF_SystemData_RoomData_summonSkillId);
        READ_FIELD(p.runeId, int32_t, OFF_SystemData_RoomData_runeId);
        READ_FIELD(p.runeLv, int32_t, OFF_SystemData_RoomData_runeLv);
        READ_FIELD(p.uiRankLevel, uint32_t, OFF_SystemData_RoomData_uiRankLevel);
        READ_FIELD(p.iMythPoint, uint32_t, OFF_SystemData_RoomData_iMythPoint);
        READ_FIELD(p.uiZoneId, uint32_t, OFF_SystemData_RoomData_uiZoneId);
        
        p.name = p._sName; 
        p.uid = std::to_string(p.lUid) + "(" + std::to_string(p.uiZoneId) + ")";
        p.rank = RankToString(p.uiRankLevel, p.iMythPoint);
        p.spell = SpellToString(p.summonSkillId);
        p.heroName = HeroToString(p.heroid);
        p.camp = p.iCamp;
        p.heroId = p.heroid;
        p.spellId = p.summonSkillId;
        p.rankLevel = p.uiRankLevel;
        g_State.players.push_back(p);
    }
}

void LoadConfig() {
    std::string path = "/storage/emulated/0/Android/data/com.mobile.legends/files/config.json";
    std::ifstream file(path);
    if (!file.is_open()) {
        std::ofstream outfile(path);
        if (outfile.is_open()) outfile << "{\n  \"mod_enabled\": true\n}";
        g_State.isModEnabled = true;
        return;
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string content = buffer.str();
    g_State.isModEnabled = (content.find("\"mod_enabled\": false") == std::string::npos);
}

void MonitorBattleState() {
    static int configTick = 0;
    if (++configTick >= 180) { LoadConfig(); configTick = 0; }
    if (!g_State.isModEnabled) return;
    
    static int logicTick = 0, infoTick = 0;
    logicTick++; infoTick++;
    
    void *logicBattleManager = nullptr;
    Il2CppGetStaticFieldValue(OBFUSCATE("Assembly-CSharp.dll"), "", OBFUSCATE("LogicBattleManager"), OBFUSCATE("Instance"), &logicBattleManager);
    
    int currentBattleState = -1;
    if (logicBattleManager) {
        currentBattleState = GetBattleState(logicBattleManager);
        { std::lock_guard<std::mutex> lock(g_State.stateMutex); g_State.battleState = currentBattleState; }
        
        if (currentBattleState == 6 && !g_isBattleTimerRunning) {
             g_battleStartTime = std::chrono::steady_clock::now();
             g_isBattleTimerRunning = true;
        } else if (currentBattleState == 7 && g_isBattleTimerRunning) {
             g_isBattleTimerRunning = false;
        }
        if (g_isBattleTimerRunning) {
             g_elapsedBattleTime = std::chrono::steady_clock::now() - g_battleStartTime;
        }

        if (currentBattleState == 2) {
             if (infoTick >= 30) { UpdatePlayerInfo(); UpdateBanPickState(); infoTick = 0; }
        }
        else if (currentBattleState >= 3) {
             if (logicTick >= 15) { UpdateBattleStats(logicBattleManager); logicTick = 0; }
             if (infoTick >= 60) { UpdatePlayerInfo(); infoTick = 0; }
        }
    }
    
    static int frameTick = 0;
    if (++frameTick % 60 == 0) {
        std::stringstream ss;
        ss << "{\"type\":\"heartbeat\",\"debug\":{\"manager_found\":" << (logicBattleManager?"true":"false") 
           << ",\"game_state\":" << currentBattleState 
           << ",\"feature_enabled\":true},\"data\":{";
        {
             std::lock_guard<std::mutex> lock(g_State.stateMutex);
             ss << "\"room_info\":{\"player_count\":