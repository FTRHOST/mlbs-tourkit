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

#define LOG_TAG "MLBS_CORE"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

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

BattleStats GetBattleStats() {
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

void LoadConfig() {
    std::string path = "/storage/emulated/0/Android/data/com.mobile.legends/files/config.json";
    std::ifstream file(path);
    if (!file.is_open()) {
        std::ofstream outfile(path);
        if (outfile.is_open()) {
            outfile << "{\n  \"mod_enabled\": true\n}";
            outfile.close();
        }
        g_State.isModEnabled = true;
        return;
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string content = buffer.str();
    bool oldEnabled = g_State.isModEnabled;
    g_State.isModEnabled = (content.find("\"mod_enabled\": false") == std::string::npos);
    if (oldEnabled != g_State.isModEnabled) {
        std::lock_guard<std::mutex> lock(g_State.stateMutex);
        g_State.players.clear();
        g_State.logicPlayers.clear();
        g_State.battlePlayers.clear();
    }
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
            READ_PTR(s.m_LoigcBezierBullet_Ptr, LogicPlayer_m_LoigcBezierBullet);
            READ_PTR(s.moveControllers_Ptr, LogicPlayer_moveControllers);
            READ_PTR(s.m_copyHurtCount_Ptr, LogicPlayer_m_copyHurtCount);
            READ_PTR(s.m_dictFirstHitHeroTime_Ptr, LogicPlayer_m_dictFirstHitHeroTime);
            READ_PTR(s.m_listTimeSpent4Kill_Ptr, LogicPlayer_m_listTimeSpent4Kill);
            READ_PTR(s.m_arrSavedPositions_Ptr, LogicPlayer_m_arrSavedPositions);
            READ_PTR(s.hurtInfos_Ptr, LogicPlayer_hurtInfos);
            READ_PTR(s.enemySightLoss_Ptr, LogicPlayer_enemySightLoss);
            READ_PTR(s.endedSightValue_Ptr, LogicPlayer_endedSightValue);
            READ_PTR(s.ongoingSightValue_Ptr, LogicPlayer_ongoingSightValue);
            READ_PTR(s.multiKillAssistIDs_Ptr, LogicPlayer_multiKillAssistIDs);
            READ_PTR(s.m_LogicGuLianBulletManger_Ptr, LogicPlayer_m_LogicGuLianBulletManger);
            READ_PTR(s.m_magicTranSpellSideEffect_Ptr, LogicPlayer_m_magicTranSpellSideEffect);
            READ_PTR(s.m_magicTranSpellStageEffect_Ptr, LogicPlayer_m_magicTranSpellStageEffect);
            READ_PTR(s.m_TwinPlayer_Ptr, LogicPlayer_m_TwinPlayer);
            READ_PTR(s.m_summonTwinAI_Ptr, LogicPlayer_m_summonTwinAI);
            READ_PTR(s.m_AFKTurnAIComponent_Ptr, LogicPlayer_m_AFKTurnAIComponent);
            READ_PTR(s.m_uiAFKHoldCDRangeTimes_Ptr, LogicPlayer_m_uiAFKHoldCDRangeTimes);
            READ_PTR(s.m_SynFightData_Ptr, LogicPlayer_m_SynFightData);
            READ_PTR(s.dicIgnoreOpered_Ptr, LogicPlayer_dicIgnoreOpered);
            READ_PTR(s.m_RelativeScore_Ptr, LogicPlayer_m_RelativeScore);
            READ_PTR(s.dicTalentSkill_Ptr, LogicPlayer_dicTalentSkill);
            READ_PTR(s.dicRuneSkill2023_Ptr, LogicPlayer_dicRuneSkill2023);
            READ_PTR(s.lsMissions_Ptr, LogicPlayer_lsMissions);
            READ_PTR(s.easterEggMissions_Ptr, LogicPlayer_easterEggMissions);
            READ_PTR(s.m_lsEmoji_Ptr, LogicPlayer_m_lsEmoji);
            READ_PTR(s.m_lsAutoEmoji_Ptr, LogicPlayer_m_lsAutoEmoji);
            READ_PTR(s.m_lsAnima_Ptr, LogicPlayer_m_lsAnima);
            READ_PTR(s.m_lsGraffiti_Ptr, LogicPlayer_m_lsGraffiti);
            READ_PTR(s.m_PlayerData_Ptr, LogicPlayer_m_PlayerData);
            READ_PTR(s.m_ConfigData_Ptr, LogicPlayer_m_ConfigData);
            READ_PTR(s.m_HeroCostType_Ptr, LogicPlayer_m_HeroCostType);
            READ_PTR(s.m_BattleConfig_Ptr, LogicPlayer_m_BattleConfig);
            READ_PTR(s.m_TowerTurnData_Ptr, LogicPlayer_m_TowerTurnData);
            READ_PTR(s.m_OperateTimeMonitor_Ptr, LogicPlayer_m_OperateTimeMonitor);
            READ_PTR(s.m_CheckNearComponent_Ptr, LogicPlayer_m_CheckNearComponent);
            READ_PTR(s.m_EstimateAttrComponent_Ptr, LogicPlayer_m_EstimateAttrComponent);
            READ_PTR(s.m_StoreSkillComp_Ptr, LogicPlayer_m_StoreSkillComp);
            READ_PTR(s.m_operCache_Ptr, LogicPlayer_m_operCache);
            READ_PTR(s.m_HighLightComp_Ptr, LogicPlayer_m_HighLightComp);
            READ_PTR(s.m_GankShoeRewardComp_Ptr, LogicPlayer_m_GankShoeRewardComp);
            READ_PTR(s.m_ReqMoveDir_Ptr, LogicPlayer_m_ReqMoveDir);
            READ_PTR(s.m_ReqMovePos_Ptr, LogicPlayer_m_ReqMovePos);
            READ_PTR(s.listKillTime_Ptr, LogicPlayer_listKillTime);
            READ_PTR(s.m_vDelayRemoveSkillIds_Ptr, LogicPlayer_m_vDelayRemoveSkillIds);
            READ_PTR(s.m_HitHeroTimes_SkillGuid_Ptr, LogicPlayer_m_HitHeroTimes_SkillGuid);
            READ_PTR(s.m_dStealValue_Ptr, LogicPlayer_m_dStealValue);
            READ_PTR(s.m_AutoAttackAI_Ptr, LogicPlayer_m_AutoAttackAI);
            READ_PTR(s.m_LogicPunish_Ptr, LogicPlayer_m_LogicPunish);
            READ_PTR(s.m_Killer_Ptr, LogicPlayer_m_Killer);
            READ_PTR(s.m_DevourData_Ptr, LogicPlayer_m_DevourData);
            READ_PTR(s.m_ControlSummer_Ptr, LogicPlayer_m_ControlSummer);
            READ_PTR(s.m_vSkillLogicFighter_Ptr, LogicPlayer_m_vSkillLogicFighter);
            READ_PTR(s.m_vPlayerDeadInfo_Ptr, LogicPlayer_m_vPlayerDeadInfo);
            READ_PTR(s.m_RecmendEquips_Ptr, LogicPlayer_m_RecmendEquips);
            READ_PTR(s.m_v2StarDir_Ptr, LogicPlayer_m_v2StarDir);
            READ_PTR(s.shopData_Ptr, LogicPlayer_shopData);
            READ_PTR(s.v2LastCheckPos_Ptr, LogicPlayer_v2LastCheckPos);
            READ_PTR(s.lastCheckMoveDir_Ptr, LogicPlayer_lastCheckMoveDir);
            READ_PTR(s.lastFailedAutoAiSpellCast_Ptr, LogicPlayer_lastFailedAutoAiSpellCast);
            READ_PTR(s.ownNormalSkillCache_Ptr, LogicPlayer_ownNormalSkillCache);
            READ_PTR(s.lEatFruits_Ptr, LogicPlayer_lEatFruits);
            READ_FIELD(s.m_ID, int32_t, LogicPlayer_m_ID);
            READ_FIELD(s.totalGold, int32_t, LogicPlayer_totalGold);
            READ_FIELD(s.m_HurtTotalValue, double, LogicPlayer_m_HurtTotalValue);
            READ_FIELD(s.m_HurtHeroValue, double, LogicPlayer_m_HurtHeroValue);
            READ_FIELD(s.m_ATKHero, double, LogicPlayer_m_ATKHero);
            READ_FIELD(s.m_iCommonAttackHeroCount, int32_t, LogicPlayer_m_iCommonAttackHeroCount);
            READ_FIELD(s.m_iNormalSkillHeroCount, int32_t, LogicPlayer_m_iNormalSkillHeroCount);
            READ_FIELD(s.m_HurtHeroReel, double, LogicPlayer_m_HurtHeroReel);
            READ_FIELD(s.m_HurtHeroAD, double, LogicPlayer_m_HurtHeroAD);
            READ_FIELD(s.m_HurtHeroAP, double, LogicPlayer_m_HurtHeroAP);
            READ_FIELD(s.m_HurtHeroByEquip, double, LogicPlayer_m_HurtHeroByEquip);
            READ_FIELD(s.m_HurtHeroByEmblem, double, LogicPlayer_m_HurtHeroByEmblem);
            READ_FIELD(s.m_HurtTowerValue, double, LogicPlayer_m_HurtTowerValue);
            READ_FIELD(s.m_HurtSoliderValue, double, LogicPlayer_m_HurtSoliderValue);
            READ_FIELD(s.m_iInjuredShield, int32_t, LogicPlayer_m_iInjuredShield);
            READ_FIELD(s.m_InjuredValue, double, LogicPlayer_m_InjuredValue);
            READ_FIELD(s.m_InjuredTower, double, LogicPlayer_m_InjuredTower);
            READ_FIELD(s.m_InjuredTotal, int32_t, LogicPlayer_m_InjuredTotal);
            READ_FIELD(s.m_InjuredSoldier, double, LogicPlayer_m_InjuredSoldier);
            READ_FIELD(s.m_InjuredAD, double, LogicPlayer_m_InjuredAD);
            READ_FIELD(s.m_InjuredAP, double, LogicPlayer_m_InjuredAP);
            READ_FIELD(s.m_InjuredReal, double, LogicPlayer_m_InjuredReal);
            READ_FIELD(s.m_RealInjuredVal, double, LogicPlayer_m_RealInjuredVal);
            READ_FIELD(s.m_iBeCuredValue, int32_t, LogicPlayer_m_iBeCuredValue);
            READ_FIELD(s.m_CureHero, double, LogicPlayer_m_CureHero);
            READ_FIELD(s.m_CureTeammate, double, LogicPlayer_m_CureTeammate);
            READ_FIELD(s.m_CureSelf, double, LogicPlayer_m_CureSelf);
            READ_FIELD(s.m_CureHeroJustSkill, double, LogicPlayer_m_CureHeroJustSkill);
            READ_FIELD(s.m_iSkillUseCount, int32_t, LogicPlayer_m_iSkillUseCount);
            READ_FIELD(s.m_iCommonAtkUseCount, int32_t, LogicPlayer_m_iCommonAtkUseCount);
            READ_FIELD(s.m_iCommonAtkUseCount_AllSkillCD, int32_t, LogicPlayer_m_iCommonAtkUseCount_AllSkillCD);
            READ_FIELD(s.m_iNormalSkillUseCount, int32_t, LogicPlayer_m_iNormalSkillUseCount);
            READ_FIELD(s.m_iNormalSkillHasDraggedCount, int32_t, LogicPlayer_m_iNormalSkillHasDraggedCount);
            READ_FIELD(s.m_iFirstSkillUseCount, int32_t, LogicPlayer_m_iFirstSkillUseCount);
            READ_FIELD(s.m_iSecondSkillUseCount, int32_t, LogicPlayer_m_iSecondSkillUseCount);
            READ_FIELD(s.m_iThirdSkillUseCount, int32_t, LogicPlayer_m_iThirdSkillUseCount);
            READ_FIELD(s.m_iFourthSkillUseCount, int32_t, LogicPlayer_m_iFourthSkillUseCount);
            READ_FIELD(s.m_iEquipSkillUseCount, int32_t, LogicPlayer_m_iEquipSkillUseCount);
            READ_FIELD(s.m_iCureSkillUseCount, int32_t, LogicPlayer_m_iCureSkillUseCount);
            READ_FIELD(s.m_iBackHomeSkillUseCount, int32_t, LogicPlayer_m_iBackHomeSkillUseCount);
            READ_FIELD(s.m_iSummonSkillUseCount, int32_t, LogicPlayer_m_iSummonSkillUseCount);
            READ_FIELD(s.m_iHuntSkillUseCount, int32_t, LogicPlayer_m_iHuntSkillUseCount);
            READ_FIELD(s.m_iGankSkillUseCount, int32_t, LogicPlayer_m_iGankSkillUseCount);
            READ_FIELD(s.m_iKillMageCount, int32_t, LogicPlayer_m_iKillMageCount);
            READ_FIELD(s.m_iKillMarksmanCount, int32_t, LogicPlayer_m_iKillMarksmanCount);
            READ_FIELD(s.m_iEnterHeroBattleFromGrass, int32_t, LogicPlayer_m_iEnterHeroBattleFromGrass);
            READ_FIELD(s.m_iEnterGrassTimes, int32_t, LogicPlayer_m_iEnterGrassTimes);
            READ_FIELD(s.KillTowerTimes, int32_t, LogicPlayer_KillTowerTimes);
            READ_FIELD(s.KillSoldierTimes, int32_t, LogicPlayer_KillSoldierTimes);
            READ_FIELD(s.m_nSavedPositionsStart, int32_t, LogicPlayer_m_nSavedPositionsStart);
            READ_FIELD(s.m_nSavedPositionsCount, int32_t, LogicPlayer_m_nSavedPositionsCount);
            READ_FIELD(s.m_uLossOfSightTime, uint32_t, LogicPlayer_m_uLossOfSightTime);
            READ_FIELD(s.sightIdGenerator, int32_t, LogicPlayer_sightIdGenerator);
            READ_FIELD(s.continueKill, int32_t, LogicPlayer_continueKill);
            READ_FIELD(s.multiKill, int32_t, LogicPlayer_multiKill);
            READ_FIELD(s.DoubleKillTimes, int32_t, LogicPlayer_DoubleKillTimes);
            READ_FIELD(s.TripleKillTimes, int32_t, LogicPlayer_TripleKillTimes);
            READ_FIELD(s.QuadraKillTimes, int32_t, LogicPlayer_QuadraKillTimes);
            READ_FIELD(s.PentaKillTimes, int32_t, LogicPlayer_PentaKillTimes);
            READ_FIELD(s.greenLightCanUse, bool, LogicPlayer_greenLightCanUse);
            READ_FIELD(s.greenLightStartTime, uint32_t, LogicPlayer_greenLightStartTime);
            READ_FIELD(s.greenLightTimeSpan, uint32_t, LogicPlayer_greenLightTimeSpan);
            READ_FIELD(s.greenLightIgnoreCountDown, bool, LogicPlayer_greenLightIgnoreCountDown);
            READ_FIELD(s.bMonitoringSoloBreakLane, bool, LogicPlayer_bMonitoringSoloBreakLane);
            READ_FIELD(s.uMonitoringTowerGuid, uint32_t, LogicPlayer_uMonitoringTowerGuid);
            READ_FIELD(s.uMonitoringTimeout, uint32_t, LogicPlayer_uMonitoringTimeout);
            READ_FIELD(s.lastReceiveMoveOptTime, uint32_t, LogicPlayer_lastReceiveMoveOptTime);
            READ_FIELD(s.moveProtectTime, int32_t, LogicPlayer_moveProtectTime);
            READ_FIELD(s.m_bMoveProtectAIState, bool, LogicPlayer_m_bMoveProtectAIState);
            READ_FIELD(s.uCheckStarLightTaskTimer, uint32_t, LogicPlayer_uCheckStarLightTaskTimer);
            READ_FIELD(s.uLastGuideSoldier2Tower, uint32_t, LogicPlayer_uLastGuideSoldier2Tower);
            READ_FIELD(s.m_iGuideSoldier2Tower, int32_t, LogicPlayer_m_iGuideSoldier2Tower);
            READ_FIELD(s.m_bIsTwinMain, bool, LogicPlayer_m_bIsTwinMain);
            READ_FIELD(s.m_bIsTwinControl, bool, LogicPlayer_m_bIsTwinControl);
            READ_FIELD(s.bMLAIState, bool, LogicPlayer_bMLAIState);
            READ_FIELD(s.bShowConnectMsg, bool, LogicPlayer_bShowConnectMsg);
            READ_FIELD(s.m_IsRobotPlayer, bool, LogicPlayer_m_IsRobotPlayer);
            READ_FIELD(s.m_uiWaitTrunAITime, uint32_t, LogicPlayer_m_uiWaitTrunAITime);
            READ_FIELD(s.uiQuicklyTrunToAITime, uint32_t, LogicPlayer_uiQuicklyTrunToAITime);
            READ_FIELD(s.uiNomalTurnAITime, uint32_t, LogicPlayer_uiNomalTurnAITime);
            READ_FIELD(s.uIgnoreTurnAITime, uint32_t, LogicPlayer_uIgnoreTurnAITime);
            READ_FIELD(s.iIgnoreOpered, int32_t, LogicPlayer_iIgnoreOpered);
            READ_FIELD(s.m_bForceAi, bool, LogicPlayer_m_bForceAi);
            READ_FIELD(s.m_bWeakNetWork, bool, LogicPlayer_m_bWeakNetWork);
            READ_FIELD(s.m_uLastTimePlayerOpered, uint32_t, LogicPlayer_m_uLastTimePlayerOpered);
            READ_FIELD(s.bWaitTurnAI, bool, LogicPlayer_bWaitTurnAI);
            READ_FIELD(s.uplandRangeDistance, int32_t, LogicPlayer_uplandRangeDistance);
            READ_FIELD(s.m_bConnected, bool, LogicPlayer_m_bConnected);
            READ_FIELD(s.m_uiVoiceParam, uint32_t, LogicPlayer_m_uiVoiceParam);
            READ_FIELD(s.m_iHolyStatueSkillID, int32_t, LogicPlayer_m_iHolyStatueSkillID);
            READ_FIELD(s.m_uHolyStatueID, uint32_t, LogicPlayer_m_uHolyStatueID);
            READ_FIELD(s.m_uHolyStatueIDIfUsed, uint32_t, LogicPlayer_m_uHolyStatueIDIfUsed);
            READ_FIELD(s.m_TotalExp, int32_t, LogicPlayer_m_TotalExp);
            READ_FIELD(s.m_bGankEquip, bool, LogicPlayer_m_bGankEquip);
            READ_FIELD(s.m_bHuntSkill, bool, LogicPlayer_m_bHuntSkill);
            READ_FIELD(s.m_bLowestMoneyOrExp, int32_t, LogicPlayer_m_bLowestMoneyOrExp);
            READ_FIELD(s.m_ShareMoneyEx, double, LogicPlayer_m_ShareMoneyEx);
            READ_FIELD(s.m_ShareExpEx, double, LogicPlayer_m_ShareExpEx);
            READ_FIELD(s.m_RewardMoney, int32_t, LogicPlayer_m_RewardMoney);
            READ_FIELD(s.m_iBaseMoney, int32_t, LogicPlayer_m_iBaseMoney);
            READ_FIELD(s.m_KillBounty, int32_t, LogicPlayer_m_KillBounty);
            READ_FIELD(s.m_bBountyOverThreshold, bool, LogicPlayer_m_bBountyOverThreshold);
            READ_FIELD(s.m_uLastBountyOverThreshold, uint32_t, LogicPlayer_m_uLastBountyOverThreshold);
            READ_FIELD(s.m_iContinueDeadSub, int32_t, LogicPlayer_m_iContinueDeadSub);
            READ_FIELD(s.m_iContinueKillNum, int32_t, LogicPlayer_m_iContinueKillNum);
            READ_FIELD(s.m_iContinueKillAdd, int32_t, LogicPlayer_m_iContinueKillAdd);
            READ_FIELD(s.m_RewardExp, int32_t, LogicPlayer_m_RewardExp);
            READ_FIELD(s.m_iBaseExp, int32_t, LogicPlayer_m_iBaseExp);
            READ_FIELD(s.m_iLevelExp, int32_t, LogicPlayer_m_iLevelExp);
            READ_FIELD(s.m_iLvExpRate, double, LogicPlayer_m_iLvExpRate);
            READ_FIELD(s.m_fContinueDeadPara, double, LogicPlayer_m_fContinueDeadPara);
            READ_FIELD(s.DeadAndKillTimes, int32_t, LogicPlayer_DeadAndKillTimes);
            READ_FIELD(s.m_AssistTimesReward, int32_t, LogicPlayer_m_AssistTimesReward);
            READ_FIELD(s.m_bReqMoveUpdate, bool, LogicPlayer_m_bReqMoveUpdate);
            READ_FIELD(s.bDeathHoldKillCount, bool, LogicPlayer_bDeathHoldKillCount);
            READ_FIELD(s.mShutDown, int32_t, LogicPlayer_mShutDown);
            READ_FIELD(s.lastKillTime, uint32_t, LogicPlayer_lastKillTime);
            READ_FIELD(s.mutiKillUsefulTime, uint32_t, LogicPlayer_mutiKillUsefulTime);
            READ_FIELD(s.mutiKillUsefulTimeOn5kill, uint32_t, LogicPlayer_mutiKillUsefulTimeOn5kill);
            READ_FIELD(s.m_uiLastMoveTime, uint32_t, LogicPlayer_m_uiLastMoveTime);
            READ_FIELD(s.m_GetGoldTimesBySoldier, int32_t, LogicPlayer_m_GetGoldTimesBySoldier);
            READ_FIELD(s.m_BeyondGodlike, int32_t, LogicPlayer_m_BeyondGodlike);
            READ_FIELD(s.m_MaxMutiKill, int32_t, LogicPlayer_m_MaxMutiKill);
            READ_FIELD(s.m_MaxContinueKill, int32_t, LogicPlayer_m_MaxContinueKill);
            READ_FIELD(s.m_singleKill, int32_t, LogicPlayer_m_singleKill);
            READ_FIELD(s.m_KillLingZhu, int32_t, LogicPlayer_m_KillLingZhu);
            READ_FIELD(s.m_AssistLingZhu, int32_t, LogicPlayer_m_AssistLingZhu);
            READ_FIELD(s.KillWildTimes, int32_t, LogicPlayer_KillWildTimes);
            READ_FIELD(s.m_WeekKill, int32_t, LogicPlayer_m_WeekKill);
            READ_FIELD(s.m_KillShenGui, int32_t, LogicPlayer_m_KillShenGui);
            READ_FIELD(s.m_AssistShenGui, int32_t, LogicPlayer_m_AssistShenGui);
            READ_FIELD(s.m_KillCdMonster, int32_t, LogicPlayer_m_KillCdMonster);
            READ_FIELD(s.m_KillAtkMonster, int32_t, LogicPlayer_m_KillAtkMonster);
            READ_FIELD(s.m_KillMePlayerCount, int32_t, LogicPlayer_m_KillMePlayerCount);
            READ_FIELD(s.m_CurZoneId, int32_t, LogicPlayer_m_CurZoneId);
            READ_FIELD(s.m_HurtTurtle, double, LogicPlayer_m_HurtTurtle);
            READ_FIELD(s.m_HurtLord, double, LogicPlayer_m_HurtLord);
            READ_FIELD(s.m_ShieldCureHero, double, LogicPlayer_m_ShieldCureHero);
            READ_FIELD(s.m_ShieldCureSelf, double, LogicPlayer_m_ShieldCureSelf);
            READ_FIELD(s.m_ShieldTeammate, double, LogicPlayer_m_ShieldTeammate);
            READ_FIELD(s.m_SufferControlTime, int32_t, LogicPlayer_m_SufferControlTime);
            READ_FIELD(s.m_SufferSlowTime, int32_t, LogicPlayer_m_SufferSlowTime);
            READ_FIELD(s.m_ControlTime, int32_t, LogicPlayer_m_ControlTime);
            READ_FIELD(s.m_KillsWithRedAndBlueBuff, int32_t, LogicPlayer_m_KillsWithRedAndBlueBuff);
            READ_FIELD(s.m_MoveDis, double, LogicPlayer_m_MoveDis);
            READ_FIELD(s.m_MoveDisTickCount, double, LogicPlayer_m_MoveDisTickCount);
            READ_FIELD(s.m_MoveCountPrePosX, double, LogicPlayer_m_MoveCountPrePosX);
            READ_FIELD(s.m_MoveCountPrePosY, double, LogicPlayer_m_MoveCountPrePosY);
            READ_FIELD(s.m_GoldByWild, int32_t, LogicPlayer_m_GoldByWild);
            READ_FIELD(s.m_GoldBySoldier, int32_t, LogicPlayer_m_GoldBySoldier);
            READ_FIELD(s.m_GoldByHero, int32_t, LogicPlayer_m_GoldByHero);
            READ_FIELD(s.iAllHurtVal, int32_t, LogicPlayer_iAllHurtVal);
            READ_FIELD(s.m_CrlTimes, int32_t, LogicPlayer_m_CrlTimes);
            READ_FIELD(s.m_iPoisonValue, int32_t, LogicPlayer_m_iPoisonValue);
            READ_FIELD(s.m_hurtEnemyWild, double, LogicPlayer_m_hurtEnemyWild);
            READ_FIELD(s.m_hurtWildValue, double, LogicPlayer_m_hurtWildValue);
            READ_FIELD(s.m_TrunSpeed, double, LogicPlayer_m_TrunSpeed);
            READ_FIELD(s.m_GreatGuid, uint32_t, LogicPlayer_m_GreatGuid);
            READ_FIELD(s.m_bRefuseSelectAIType, bool, LogicPlayer_m_bRefuseSelectAIType);
            READ_FIELD(s.m_uiLastOperFrameTime, uint32_t, LogicPlayer_m_uiLastOperFrameTime);
            READ_FIELD(s.SummonSkillId, int32_t, LogicPlayer_SummonSkillId);
            READ_FIELD(s.m_SummonStartSkillId, int32_t, LogicPlayer_m_SummonStartSkillId);
            READ_FIELD(s.m_RankLv, uint32_t, LogicPlayer_m_RankLv);
            READ_FIELD(s.m_bigRankLv, uint32_t, LogicPlayer_m_bigRankLv);
            READ_FIELD(s.m_rankStar, uint32_t, LogicPlayer_m_rankStar);
            READ_FIELD(s.m_rankNum, uint32_t, LogicPlayer_m_rankNum);
            READ_FIELD(s.m_lastReliveTime, uint32_t, LogicPlayer_m_lastReliveTime);
            READ_FIELD(s.m_ReviveTimeMs, uint32_t, LogicPlayer_m_ReviveTimeMs);
            READ_FIELD(s.m_bFastDie, bool, LogicPlayer_m_bFastDie);
            READ_FIELD(s.m_EatFruit, uint32_t, LogicPlayer_m_EatFruit);
            READ_FIELD(s.m_KillByFruit, uint32_t, LogicPlayer_m_KillByFruit);
            READ_FIELD(s.m_GetFruitOnMin, uint32_t, LogicPlayer_m_GetFruitOnMin);
            READ_FIELD(s.bAllowRelive, bool, LogicPlayer_bAllowRelive);
            READ_FIELD(s.m_uiRoleLevel, uint32_t, LogicPlayer_m_uiRoleLevel);
            READ_FIELD(s.m_iAddGoldValue, int32_t, LogicPlayer_m_iAddGoldValue);
            READ_FIELD(s.iMaxHurtValue, int32_t, LogicPlayer_iMaxHurtValue);
            READ_FIELD(s.m_iSkinId, int32_t, LogicPlayer_m_iSkinId);
            READ_FIELD(s.m_iDragonCrystalId, int32_t, LogicPlayer_m_iDragonCrystalId);
            READ_FIELD(s.m_uUserMapID, uint32_t, LogicPlayer_m_uUserMapID);
            READ_FIELD(s.iLastGiveupEquip, int32_t, LogicPlayer_iLastGiveupEquip);
            READ_FIELD(s.m_iSurvivalTime, uint32_t, LogicPlayer_m_iSurvivalTime);
            READ_FIELD(s.m_iChickenRanking, uint32_t, LogicPlayer_m_iChickenRanking);
            READ_FIELD(s.m_bEmojiBirthday, bool, LogicPlayer_m_bEmojiBirthday);
            READ_FIELD(s.logAttackSpeed, bool, LogicPlayer_logAttackSpeed);
            READ_FIELD(s.doAttackSpeed, bool, LogicPlayer_doAttackSpeed);
            READ_FIELD(s.m_CommATK_RunTimer, uint32_t, LogicPlayer_m_CommATK_RunTimer);
            READ_FIELD(s.m_dCommATKSingTime_Mod, int32_t, LogicPlayer_m_dCommATKSingTime_Mod);
            READ_FIELD(s.m_CommATKSingTime_LastTimer, uint32_t, LogicPlayer_m_CommATKSingTime_LastTimer);
            READ_FIELD(s.m_dCommATKCD_Mod, int32_t, LogicPlayer_m_dCommATKCD_Mod);
            READ_FIELD(s.m_CommATKCD_LastTimer, uint32_t, LogicPlayer_m_CommATKCD_LastTimer);
            READ_FIELD(s.m_PriorEquip, uint32_t, LogicPlayer_m_PriorEquip);
            READ_FIELD(s.m_uHeroEnhanceLevel, uint32_t, LogicPlayer_m_uHeroEnhanceLevel);
            READ_FIELD(s.m_bGhostHasDied, bool, LogicPlayer_m_bGhostHasDied);
            READ_FIELD(s.lastCheckDirSymbol, int32_t, LogicPlayer_lastCheckDirSymbol);
            READ_FIELD(s.right, int32_t, LogicPlayer_right);
            READ_FIELD(s.lastFailedAutoAiSpellCastTime, uint32_t, LogicPlayer_lastFailedAutoAiSpellCastTime);
            READ_FIELD(s.autoTime, int32_t, LogicPlayer_autoTime);
            READ_FIELD(s.m_dXpGrowthDecimal, double, LogicPlayer_m_dXpGrowthDecimal);
            READ_FIELD(s.bBornedBoss, bool, LogicPlayer_bBornedBoss);
            READ_FIELD(s.iPreMutiKillValue, int32_t, LogicPlayer_iPreMutiKillValue);
            READ_FIELD(s.iPreContinueKillValue, int32_t, LogicPlayer_iPreContinueKillValue);
            READ_FIELD(s.iPreKillLingZhu, int32_t, LogicPlayer_iPreKillLingZhu);
            READ_FIELD(s.iPreKillShenGui, int32_t, LogicPlayer_iPreKillShenGui);
            READ_FIELD(s.iPreShutDown, int32_t, LogicPlayer_iPreShutDown);
            READ_FIELD(s.bCheckFirstBlood, bool, LogicPlayer_bCheckFirstBlood);
            READ_FIELD(s.iCurrentResult, int32_t, LogicPlayer_iCurrentResult);
            READ_FIELD(s.iPreGetResultTime, uint32_t, LogicPlayer_iPreGetResultTime);
            READ_FIELD(s.iCurKilledResult, int32_t, LogicPlayer_iCurKilledResult);
            READ_FIELD(s.iPreKilledResultTime, uint32_t, LogicPlayer_iPreKilledResultTime);
            localLogicPlayers.push_back(s);
        }
    };
    processList(0x100);
    processList(0x108);
    { std::lock_guard<std::mutex> lock(g_State.stateMutex); g_State.logicPlayers = localLogicPlayers; }
}

// =============================================================
// Variabel Global untuk Hook (Simpan Pointer Asli)
// =============================================================
void (*old_OnRecv_RoomInfo)(void* instance, void* msg) = nullptr;
void (*old_OnRecv_RoomEnter)(void* instance, void* msg) = nullptr;
void (*old_OnRecv_BanPick)(void* instance, void* msg) = nullptr;

// =============================================================
// Fungsi Detour (Palsu) - Untuk Mencegat Data
// =============================================================

// 1. Menangkap Data Room Utama (Full Data)
void new_OnRecv_RoomInfo(void* instance, void* msg) {
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_GetInfo_SC::OnRecv Terpanggil! MsgPtr: %p", msg);

    // Panggil fungsi asli agar game tidak error
    if(old_OnRecv_RoomInfo) old_OnRecv_RoomInfo(instance, msg);
}

// 2. Menangkap Player Masuk (Incremental Data)
void new_OnRecv_RoomEnter(void* instance, void* msg) {
    LOGI("MLBS_CORE: [HOOK] Cmd_Room_Enter_SC::OnRecv Terpanggil! MsgPtr: %p", msg);

    if(old_OnRecv_RoomEnter) old_OnRecv_RoomEnter(instance, msg);
}

// 3. Menangkap Timer Ban/Pick
void new_OnRecv_BanPick(void* instance, void* msg) {
    LOGI("MLBS_CORE: [HOOK] Cmd_Notify_StartBanTogether::OnRecv Terpanggil! MsgPtr: %p", msg);

    if(old_OnRecv_BanPick) old_OnRecv_BanPick(instance, msg);
}

// =========================================================
// FITUR DIAGNOSA: Mencari kombinasi Namespace/Class yang benar
// =========================================================
void DiagnoseServerData() {
    LOGI("=== MLBS DIAGNOSE START ===");

    // 1. Variasi Nama Assembly (DLL)
    const char* assemblies[] = {
        "Assembly-CSharp.dll",
        "Assembly-CSharp",
        "System.dll"
    };

    // 2. Variasi Namespace
    const char* namespaces[] = {
        "",             // Global
        "MTTDProto",    // Protokol MLBB
        nullptr         // Null pointer (Kadang diperlukan oleh library tertentu)
    };

    // 3. Target Class
    const char* targetClass = "Cmd_Room_GetInfo_SC";

    bool found = false;

    // Loop semua kombinasi untuk mencari yang cocok
    for (const char* asmName : assemblies) {
        for (const char* ns : namespaces) {
            // Kita coba cari Method 'OnRecv' dengan argumen 1
            void* addr = Il2CppGetMethodOffset(asmName, ns, targetClass, "OnRecv", 1);

            // Format log supaya kita tahu apa yang sedang dites
            const char* nsLog = (ns == nullptr) ? "nullptr" : (ns[0] == '\0' ? "EMPTY_STRING" : ns);

            if (addr != nullptr) {
                LOGI("[SUKSES] DITEMUKAN! >> Assembly: '%s' | Namespace: '%s' | Class: '%s' | Addr: %p",
                     asmName, nsLog, targetClass, addr);
                found = true;
            } else {
                LOGI("[GAGAL] Mencoba: Assembly: '%s' | Namespace: '%s'", asmName, nsLog);
            }
        }
    }

    if (!found) {
        LOGE("!!! FATAL: Tidak ada kombinasi yang cocok untuk %s. Cek nama class di dump.cs lagi !!!", targetClass);
    }

    LOGI("=== MLBS DIAGNOSE END ===");
}

void InitGameLogic() {
    // 1. Jalankan Diagnosa DULU
    DiagnoseServerData();

    InitDynamicOffsets();
    LoadConfig();
    LOGI("GameLogic Initialized. Mod Enabled: %s", g_State.isModEnabled ? "true" : "false");

    // ==============================================================================
    // PERBAIKAN: Ubah Namespace "MTTDProto" menjadi "" (Kosong)
    // Karena Cmd_... biasanya ada di root namespace Assembly-CSharp.dll
    // ==============================================================================

    // 1. Hook Data Room
    void* addrRoomInfo = Il2CppGetMethodOffset("Assembly-CSharp.dll", "", "Cmd_Room_GetInfo_SC", "OnRecv", 1);
    if (addrRoomInfo) {
        LOGI("Found Cmd_Room_GetInfo_SC::OnRecv at %p", addrRoomInfo);
        DobbyHook(addrRoomInfo, (void*)new_OnRecv_RoomInfo, (void**)&old_OnRecv_RoomInfo);
    } else {
        LOGE("Failed to find Cmd_Room_GetInfo_SC::OnRecv");
    }

    // 2. Hook Player Enter
    void* addrRoomEnter = Il2CppGetMethodOffset("Assembly-CSharp.dll", "", "Cmd_Room_Enter_SC", "OnRecv", 1);
    if (addrRoomEnter) {
        LOGI("Found Cmd_Room_Enter_SC::OnRecv at %p", addrRoomEnter);
        DobbyHook(addrRoomEnter, (void*)new_OnRecv_RoomEnter, (void**)&old_OnRecv_RoomEnter);
    }

    // 3. Hook Ban/Pick Timer
    void* addrBanPick = Il2CppGetMethodOffset("Assembly-CSharp.dll", "", "Cmd_Notify_StartBanTogether", "OnRecv", 1);
    if (addrBanPick) {
        LOGI("Found Cmd_Notify_StartBanTogether::OnRecv at %p", addrBanPick);
        DobbyHook(addrBanPick, (void*)new_OnRecv_BanPick, (void**)&old_OnRecv_BanPick);
    }
}

void MonitorBattleState() {
    // Placeholder to satisfy linker.
    // The main logic is now driven by hooks in InitGameLogic.
}
