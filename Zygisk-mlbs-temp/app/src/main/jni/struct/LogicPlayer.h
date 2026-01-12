#pragma once
#include <cstdint>
#include "../DynamicOffsets.h"

// Offsets for Battle.LogicPlayer based on user provided dump
// Class: Battle.LogicPlayer
// Base: Battle.LogicFighter

#define LogicPlayer_m_ID OFF_LogicPlayer_m_ID // From EntityBase (Inherited)

#define LogicPlayer_m_LoigcBezierBullet OFF_LogicPlayer_m_LoigcBezierBullet // Dictionary<int, LogicBulletBase>
#define LogicPlayer_moveControllers OFF_LogicPlayer_moveControllers // HashSet<uint>
#define LogicPlayer_totalGold OFF_LogicPlayer_totalGold // int32
#define LogicPlayer_m_copyHurtCount OFF_LogicPlayer_m_copyHurtCount // Dictionary<uint, CopyHurtInfo>
#define LogicPlayer_m_HurtTotalValue OFF_LogicPlayer_m_HurtTotalValue // double
#define LogicPlayer_m_HurtHeroValue OFF_LogicPlayer_m_HurtHeroValue // double
#define LogicPlayer_m_ATKHero OFF_LogicPlayer_m_ATKHero // double
#define LogicPlayer_m_iCommonAttackHeroCount OFF_LogicPlayer_m_iCommonAttackHeroCount // int32
#define LogicPlayer_m_iNormalSkillHeroCount OFF_LogicPlayer_m_iNormalSkillHeroCount // int32
#define LogicPlayer_m_HurtHeroReel OFF_LogicPlayer_m_HurtHeroReel // double
#define LogicPlayer_m_HurtHeroAD OFF_LogicPlayer_m_HurtHeroAD // double
#define LogicPlayer_m_HurtHeroAP OFF_LogicPlayer_m_HurtHeroAP // double
#define LogicPlayer_m_HurtHeroByEquip OFF_LogicPlayer_m_HurtHeroByEquip // double
#define LogicPlayer_m_HurtHeroByEmblem OFF_LogicPlayer_m_HurtHeroByEmblem // double
#define LogicPlayer_m_HurtTowerValue OFF_LogicPlayer_m_HurtTowerValue // double
#define LogicPlayer_m_HurtSoliderValue OFF_LogicPlayer_m_HurtSoliderValue // double
#define LogicPlayer_m_iInjuredShield OFF_LogicPlayer_m_iInjuredShield // int32
#define LogicPlayer_m_InjuredValue OFF_LogicPlayer_m_InjuredValue // double
#define LogicPlayer_m_InjuredTower OFF_LogicPlayer_m_InjuredTower // double
#define LogicPlayer_m_InjuredTotal OFF_LogicPlayer_m_InjuredTotal // int32
#define LogicPlayer_m_InjuredSoldier OFF_LogicPlayer_m_InjuredSoldier // double
#define LogicPlayer_m_InjuredAD OFF_LogicPlayer_m_InjuredAD // double
#define LogicPlayer_m_InjuredAP OFF_LogicPlayer_m_InjuredAP // double
#define LogicPlayer_m_InjuredReal OFF_LogicPlayer_m_InjuredReal // double
#define LogicPlayer_m_RealInjuredVal OFF_LogicPlayer_m_RealInjuredVal // double
#define LogicPlayer_m_iBeCuredValue OFF_LogicPlayer_m_iBeCuredValue // int32
#define LogicPlayer_m_CureHero OFF_LogicPlayer_m_CureHero // double
#define LogicPlayer_m_CureTeammate OFF_LogicPlayer_m_CureTeammate // double
#define LogicPlayer_m_CureSelf OFF_LogicPlayer_m_CureSelf // double
#define LogicPlayer_m_CureHeroJustSkill OFF_LogicPlayer_m_CureHeroJustSkill // double
#define LogicPlayer_m_iSkillUseCount OFF_LogicPlayer_m_iSkillUseCount // int32
#define LogicPlayer_m_iCommonAtkUseCount OFF_LogicPlayer_m_iCommonAtkUseCount // int32
#define LogicPlayer_m_iCommonAtkUseCount_AllSkillCD OFF_LogicPlayer_m_iCommonAtkUseCount_AllSkillCD // int32
#define LogicPlayer_m_iNormalSkillUseCount OFF_LogicPlayer_m_iNormalSkillUseCount // int32
#define LogicPlayer_m_iNormalSkillHasDraggedCount OFF_LogicPlayer_m_iNormalSkillHasDraggedCount // int32
#define LogicPlayer_m_iFirstSkillUseCount OFF_LogicPlayer_m_iFirstSkillUseCount // int32
#define LogicPlayer_m_iSecondSkillUseCount OFF_LogicPlayer_m_iSecondSkillUseCount // int32
#define LogicPlayer_m_iThirdSkillUseCount OFF_LogicPlayer_m_iThirdSkillUseCount // int32
#define LogicPlayer_m_iFourthSkillUseCount OFF_LogicPlayer_m_iFourthSkillUseCount // int32
#define LogicPlayer_m_iEquipSkillUseCount OFF_LogicPlayer_m_iEquipSkillUseCount // int32
#define LogicPlayer_m_iCureSkillUseCount OFF_LogicPlayer_m_iCureSkillUseCount // int32
#define LogicPlayer_m_iBackHomeSkillUseCount OFF_LogicPlayer_m_iBackHomeSkillUseCount // int32
#define LogicPlayer_m_iSummonSkillUseCount OFF_LogicPlayer_m_iSummonSkillUseCount // int32
#define LogicPlayer_m_iHuntSkillUseCount OFF_LogicPlayer_m_iHuntSkillUseCount // int32
#define LogicPlayer_m_iGankSkillUseCount OFF_LogicPlayer_m_iGankSkillUseCount // int32
#define LogicPlayer_m_iKillMageCount OFF_LogicPlayer_m_iKillMageCount // int32
#define LogicPlayer_m_iKillMarksmanCount OFF_LogicPlayer_m_iKillMarksmanCount // int32
#define LogicPlayer_m_iEnterHeroBattleFromGrass OFF_LogicPlayer_m_iEnterHeroBattleFromGrass // int32
#define LogicPlayer_m_iEnterGrassTimes OFF_LogicPlayer_m_iEnterGrassTimes // int32
#define LogicPlayer_m_dictFirstHitHeroTime OFF_LogicPlayer_m_dictFirstHitHeroTime // Dictionary<uint, uint>
#define LogicPlayer_m_listTimeSpent4Kill OFF_LogicPlayer_m_listTimeSpent4Kill // List<int>
#define LogicPlayer_KillTowerTimes OFF_LogicPlayer_KillTowerTimes // int32
#define LogicPlayer_KillSoldierTimes OFF_LogicPlayer_KillSoldierTimes // int32
#define LogicPlayer_m_arrSavedPositions OFF_LogicPlayer_m_arrSavedPositions // DVector2[]
#define LogicPlayer_m_nSavedPositionsStart OFF_LogicPlayer_m_nSavedPositionsStart // int32
#define LogicPlayer_m_nSavedPositionsCount OFF_LogicPlayer_m_nSavedPositionsCount // int32
#define LogicPlayer_hurtInfos OFF_LogicPlayer_hurtInfos // List<BeAtkData>
#define LogicPlayer_m_uLossOfSightTime OFF_LogicPlayer_m_uLossOfSightTime // uint32
#define LogicPlayer_enemySightLoss OFF_LogicPlayer_enemySightLoss // Dictionary<uint, uint>
#define LogicPlayer_endedSightValue OFF_LogicPlayer_endedSightValue // List<SightValueDetail>
#define LogicPlayer_ongoingSightValue OFF_LogicPlayer_ongoingSightValue // List<SightValueDetail>
#define LogicPlayer_sightIdGenerator OFF_LogicPlayer_sightIdGenerator // int32
// #define LogicPlayer_lossTimeDuration 0x974 // Nullable<float> (Size might be > 4 bytes)
#define LogicPlayer_continueKill OFF_LogicPlayer_continueKill // int32
#define LogicPlayer_multiKill OFF_LogicPlayer_multiKill // int32
#define LogicPlayer_DoubleKillTimes OFF_LogicPlayer_DoubleKillTimes // int32
#define LogicPlayer_TripleKillTimes OFF_LogicPlayer_TripleKillTimes // int32
#define LogicPlayer_QuadraKillTimes OFF_LogicPlayer_QuadraKillTimes // int32
#define LogicPlayer_PentaKillTimes OFF_LogicPlayer_PentaKillTimes // int32
#define LogicPlayer_multiKillAssistIDs OFF_LogicPlayer_multiKillAssistIDs // List<uint>
// #define LogicPlayer_greenLightSkillID 0x9a0 // Nullable<int>
#define LogicPlayer_greenLightCanUse OFF_LogicPlayer_greenLightCanUse // bool
#define LogicPlayer_greenLightStartTime OFF_LogicPlayer_greenLightStartTime // uint32
#define LogicPlayer_greenLightTimeSpan OFF_LogicPlayer_greenLightTimeSpan // uint32
#define LogicPlayer_greenLightIgnoreCountDown OFF_LogicPlayer_greenLightIgnoreCountDown // bool
#define LogicPlayer_m_LogicGuLianBulletManger OFF_LogicPlayer_m_LogicGuLianBulletManger // LogicGuLianBulletManger
#define LogicPlayer_bMonitoringSoloBreakLane OFF_LogicPlayer_bMonitoringSoloBreakLane // bool
#define LogicPlayer_uMonitoringTowerGuid OFF_LogicPlayer_uMonitoringTowerGuid // uint32
#define LogicPlayer_uMonitoringTimeout OFF_LogicPlayer_uMonitoringTimeout // uint32
#define LogicPlayer_m_magicTranSpellSideEffect OFF_LogicPlayer_m_magicTranSpellSideEffect // Dictionary<int, LogicEffect>
#define LogicPlayer_m_magicTranSpellStageEffect OFF_LogicPlayer_m_magicTranSpellStageEffect // Dictionary<int, LogicEffect>
#define LogicPlayer_lastReceiveMoveOptTime OFF_LogicPlayer_lastReceiveMoveOptTime // uint32
#define LogicPlayer_moveProtectTime OFF_LogicPlayer_moveProtectTime // int32
#define LogicPlayer_m_bMoveProtectAIState OFF_LogicPlayer_m_bMoveProtectAIState // bool
#define LogicPlayer_uCheckStarLightTaskTimer OFF_LogicPlayer_uCheckStarLightTaskTimer // uint32
#define LogicPlayer_uLastGuideSoldier2Tower OFF_LogicPlayer_uLastGuideSoldier2Tower // uint32
#define LogicPlayer_m_iGuideSoldier2Tower OFF_LogicPlayer_m_iGuideSoldier2Tower // int32
#define LogicPlayer_m_TwinPlayer OFF_LogicPlayer_m_TwinPlayer // LogicPlayer
#define LogicPlayer_m_bIsTwinMain OFF_LogicPlayer_m_bIsTwinMain // bool
#define LogicPlayer_m_bIsTwinControl OFF_LogicPlayer_m_bIsTwinControl // bool
#define LogicPlayer_m_summonTwinAI OFF_LogicPlayer_m_summonTwinAI // AIBase
#define LogicPlayer_m_AFKTurnAIComponent OFF_LogicPlayer_m_AFKTurnAIComponent // AFKTurnAIComponent
#define LogicPlayer_bMLAIState OFF_LogicPlayer_bMLAIState // bool
#define LogicPlayer_bShowConnectMsg OFF_LogicPlayer_bShowConnectMsg // bool
#define LogicPlayer_m_IsRobotPlayer OFF_LogicPlayer_m_IsRobotPlayer // bool
#define LogicPlayer_m_uiWaitTrunAITime OFF_LogicPlayer_m_uiWaitTrunAITime // uint32
#define LogicPlayer_uiQuicklyTrunToAITime OFF_LogicPlayer_uiQuicklyTrunToAITime // uint32 (readonly)
#define LogicPlayer_uiNomalTurnAITime OFF_LogicPlayer_uiNomalTurnAITime // uint32 (internal readonly)
#define LogicPlayer_uIgnoreTurnAITime OFF_LogicPlayer_uIgnoreTurnAITime // uint32
#define LogicPlayer_iIgnoreOpered OFF_LogicPlayer_iIgnoreOpered // int32
#define LogicPlayer_m_bForceAi OFF_LogicPlayer_m_bForceAi // bool
#define LogicPlayer_m_bWeakNetWork OFF_LogicPlayer_m_bWeakNetWork // bool
#define LogicPlayer_m_uiAFKHoldCDRangeTimes OFF_LogicPlayer_m_uiAFKHoldCDRangeTimes // List<ValueTuple<uint, uint, uint>>
#define LogicPlayer_m_uLastTimePlayerOpered OFF_LogicPlayer_m_uLastTimePlayerOpered // uint32
#define LogicPlayer_bWaitTurnAI OFF_LogicPlayer_bWaitTurnAI // bool
// #define LogicPlayer_g_aoiCastData 0x0 // static
#define LogicPlayer_m_SynFightData OFF_LogicPlayer_m_SynFightData // FightPlayerData
#define LogicPlayer_uplandRangeDistance OFF_LogicPlayer_uplandRangeDistance // int32 (readonly)
#define LogicPlayer_dicIgnoreOpered OFF_LogicPlayer_dicIgnoreOpered // Dictionary
#define LogicPlayer_m_bConnected OFF_LogicPlayer_m_bConnected // bool
#define LogicPlayer_m_uiVoiceParam OFF_LogicPlayer_m_uiVoiceParam // uint32
#define LogicPlayer_m_RelativeScore OFF_LogicPlayer_m_RelativeScore // Dictionary<uint, int>
#define LogicPlayer_dicTalentSkill OFF_LogicPlayer_dicTalentSkill // Dictionary<uint, uint>
#define LogicPlayer_dicRuneSkill2023 OFF_LogicPlayer_dicRuneSkill2023 // Dictionary<uint, uint>
#define LogicPlayer_lsMissions OFF_LogicPlayer_lsMissions // List<uint>
#define LogicPlayer_easterEggMissions OFF_LogicPlayer_easterEggMissions // List<uint>
#define LogicPlayer_m_lsEmoji OFF_LogicPlayer_m_lsEmoji // List<uint>
#define LogicPlayer_m_lsAutoEmoji OFF_LogicPlayer_m_lsAutoEmoji // BattleAutoEmojiInfos
#define LogicPlayer_m_lsAnima OFF_LogicPlayer_m_lsAnima // List<uint>
#define LogicPlayer_m_lsGraffiti OFF_LogicPlayer_m_lsGraffiti // List<uint>
#define LogicPlayer_m_iHolyStatueSkillID OFF_LogicPlayer_m_iHolyStatueSkillID // int32
#define LogicPlayer_m_uHolyStatueID OFF_LogicPlayer_m_uHolyStatueID // uint32
#define LogicPlayer_m_uHolyStatueIDIfUsed OFF_LogicPlayer_m_uHolyStatueIDIfUsed // uint32
#define LogicPlayer_m_TotalExp OFF_LogicPlayer_m_TotalExp // int32
#define LogicPlayer_m_PlayerData OFF_LogicPlayer_m_PlayerData // PlayerData
#define LogicPlayer_m_ConfigData OFF_LogicPlayer_m_ConfigData // CData_Hero_Element
#define LogicPlayer_m_HeroCostType OFF_LogicPlayer_m_HeroCostType // HeroCostType
#define LogicPlayer_m_BattleConfig OFF_LogicPlayer_m_BattleConfig // BattleConfig
#define LogicPlayer_m_TowerTurnData OFF_LogicPlayer_m_TowerTurnData // LogicTurnFighterData
#define LogicPlayer_m_OperateTimeMonitor OFF_LogicPlayer_m_OperateTimeMonitor // OperateTimeMonitor
#define LogicPlayer_m_CheckNearComponent OFF_LogicPlayer_m_CheckNearComponent // CheckNearDirOptimizeComponent
#define LogicPlayer_m_EstimateAttrComponent OFF_LogicPlayer_m_EstimateAttrComponent // LogicEstimateAttrComponent
#define LogicPlayer_m_StoreSkillComp OFF_LogicPlayer_m_StoreSkillComp // LogicStoreSkillComp
#define LogicPlayer_m_operCache OFF_LogicPlayer_m_operCache // LogicOperCacheComp
#define LogicPlayer_m_HighLightComp OFF_LogicPlayer_m_HighLightComp // HighLight_Comp
#define LogicPlayer_m_GankShoeRewardComp OFF_LogicPlayer_m_GankShoeRewardComp // LogicGankShoeRewardComp
#define LogicPlayer_m_bGankEquip OFF_LogicPlayer_m_bGankEquip // bool
#define LogicPlayer_m_bHuntSkill OFF_LogicPlayer_m_bHuntSkill // bool
#define LogicPlayer_m_bLowestMoneyOrExp OFF_LogicPlayer_m_bLowestMoneyOrExp // int32
#define LogicPlayer_m_ShareMoneyEx OFF_LogicPlayer_m_ShareMoneyEx // double
#define LogicPlayer_m_ShareExpEx OFF_LogicPlayer_m_ShareExpEx // double
#define LogicPlayer_m_RewardMoney OFF_LogicPlayer_m_RewardMoney // int32
#define LogicPlayer_m_iBaseMoney OFF_LogicPlayer_m_iBaseMoney // int32
#define LogicPlayer_m_KillBounty OFF_LogicPlayer_m_KillBounty // int32
#define LogicPlayer_m_bBountyOverThreshold OFF_LogicPlayer_m_bBountyOverThreshold // bool
#define LogicPlayer_m_uLastBountyOverThreshold OFF_LogicPlayer_m_uLastBountyOverThreshold // uint32
#define LogicPlayer_m_iContinueDeadSub OFF_LogicPlayer_m_iContinueDeadSub // int32
#define LogicPlayer_m_iContinueKillNum OFF_LogicPlayer_m_iContinueKillNum // int32
#define LogicPlayer_m_iContinueKillAdd OFF_LogicPlayer_m_iContinueKillAdd // int32
#define LogicPlayer_m_RewardExp OFF_LogicPlayer_m_RewardExp // int32
#define LogicPlayer_m_iBaseExp OFF_LogicPlayer_m_iBaseExp // int32
#define LogicPlayer_m_iLevelExp OFF_LogicPlayer_m_iLevelExp // int32
#define LogicPlayer_m_iLvExpRate OFF_LogicPlayer_m_iLvExpRate // double
#define LogicPlayer_m_fContinueDeadPara OFF_LogicPlayer_m_fContinueDeadPara // double
#define LogicPlayer_DeadAndKillTimes OFF_LogicPlayer_DeadAndKillTimes // int32
#define LogicPlayer_m_AssistTimesReward OFF_LogicPlayer_m_AssistTimesReward // int32
#define LogicPlayer_m_bReqMoveUpdate OFF_LogicPlayer_m_bReqMoveUpdate // bool
#define LogicPlayer_m_ReqMoveDir OFF_LogicPlayer_m_ReqMoveDir // DVector2 (struct, check size, usually 16 bytes for 2 doubles)
#define LogicPlayer_m_ReqMovePos OFF_LogicPlayer_m_ReqMovePos // DVector2
#define LogicPlayer_bDeathHoldKillCount OFF_LogicPlayer_bDeathHoldKillCount // bool
#define LogicPlayer_mShutDown OFF_LogicPlayer_mShutDown // int32
#define LogicPlayer_lastKillTime OFF_LogicPlayer_lastKillTime // uint32
#define LogicPlayer_mutiKillUsefulTime OFF_LogicPlayer_mutiKillUsefulTime // uint32
#define LogicPlayer_mutiKillUsefulTimeOn5kill OFF_LogicPlayer_mutiKillUsefulTimeOn5kill // uint32
#define LogicPlayer_listKillTime OFF_LogicPlayer_listKillTime // List<string>
#define LogicPlayer_m_vDelayRemoveSkillIds OFF_LogicPlayer_m_vDelayRemoveSkillIds // Dictionary<int, uint>
#define LogicPlayer_m_uiLastMoveTime OFF_LogicPlayer_m_uiLastMoveTime // uint32
#define LogicPlayer_m_GetGoldTimesBySoldier OFF_LogicPlayer_m_GetGoldTimesBySoldier // int32
#define LogicPlayer_m_BeyondGodlike OFF_LogicPlayer_m_BeyondGodlike // int32
#define LogicPlayer_m_MaxMutiKill OFF_LogicPlayer_m_MaxMutiKill // int32
#define LogicPlayer_m_MaxContinueKill OFF_LogicPlayer_m_MaxContinueKill // int32
#define LogicPlayer_m_singleKill OFF_LogicPlayer_m_singleKill // int32
#define LogicPlayer_m_KillLingZhu OFF_LogicPlayer_m_KillLingZhu // int32
#define LogicPlayer_m_AssistLingZhu OFF_LogicPlayer_m_AssistLingZhu // int32
#define LogicPlayer_KillWildTimes OFF_LogicPlayer_KillWildTimes // int32
#define LogicPlayer_m_HitHeroTimes_SkillGuid OFF_LogicPlayer_m_HitHeroTimes_SkillGuid // HashSet<uint>
#define LogicPlayer_m_WeekKill OFF_LogicPlayer_m_WeekKill // int32
#define LogicPlayer_m_KillShenGui OFF_LogicPlayer_m_KillShenGui // int32
#define LogicPlayer_m_AssistShenGui OFF_LogicPlayer_m_AssistShenGui // int32
#define LogicPlayer_m_KillCdMonster OFF_LogicPlayer_m_KillCdMonster // int32
#define LogicPlayer_m_KillAtkMonster OFF_LogicPlayer_m_KillAtkMonster // int32
#define LogicPlayer_m_KillMePlayerCount OFF_LogicPlayer_m_KillMePlayerCount // int32
#define LogicPlayer_m_CurZoneId OFF_LogicPlayer_m_CurZoneId // int32
#define LogicPlayer_m_HurtTurtle OFF_LogicPlayer_m_HurtTurtle // double
#define LogicPlayer_m_HurtLord OFF_LogicPlayer_m_HurtLord // double
#define LogicPlayer_m_ShieldCureHero OFF_LogicPlayer_m_ShieldCureHero // double
#define LogicPlayer_m_ShieldCureSelf OFF_LogicPlayer_m_ShieldCureSelf // double
#define LogicPlayer_m_ShieldTeammate OFF_LogicPlayer_m_ShieldTeammate // double
#define LogicPlayer_m_SufferControlTime OFF_LogicPlayer_m_SufferControlTime // int32
#define LogicPlayer_m_SufferSlowTime OFF_LogicPlayer_m_SufferSlowTime // int32
#define LogicPlayer_m_ControlTime OFF_LogicPlayer_m_ControlTime // int32
#define LogicPlayer_m_KillsWithRedAndBlueBuff OFF_LogicPlayer_m_KillsWithRedAndBlueBuff // int32
#define LogicPlayer_m_MoveDis OFF_LogicPlayer_m_MoveDis // double
#define LogicPlayer_m_MoveDisTickCount OFF_LogicPlayer_m_MoveDisTickCount // double
#define LogicPlayer_m_MoveCountPrePosX OFF_LogicPlayer_m_MoveCountPrePosX // double
#define LogicPlayer_m_MoveCountPrePosY OFF_LogicPlayer_m_MoveCountPrePosY // double
#define LogicPlayer_m_GoldByWild OFF_LogicPlayer_m_GoldByWild // int32
#define LogicPlayer_m_GoldBySoldier OFF_LogicPlayer_m_GoldBySoldier // int32
#define LogicPlayer_m_GoldByHero OFF_LogicPlayer_m_GoldByHero // int32
#define LogicPlayer_iAllHurtVal OFF_LogicPlayer_iAllHurtVal // int32
#define LogicPlayer_m_CrlTimes OFF_LogicPlayer_m_CrlTimes // int32
#define LogicPlayer_m_iPoisonValue OFF_LogicPlayer_m_iPoisonValue // int32
#define LogicPlayer_m_hurtEnemyWild OFF_LogicPlayer_m_hurtEnemyWild // double
#define LogicPlayer_m_hurtWildValue OFF_LogicPlayer_m_hurtWildValue // double
#define LogicPlayer_m_dStealValue OFF_LogicPlayer_m_dStealValue // Dictionary<int, Dictionary<int, int>>
#define LogicPlayer_m_TrunSpeed OFF_LogicPlayer_m_TrunSpeed // double
#define LogicPlayer_m_GreatGuid OFF_LogicPlayer_m_GreatGuid // uint32
#define LogicPlayer_m_bRefuseSelectAIType OFF_LogicPlayer_m_bRefuseSelectAIType // bool
#define LogicPlayer_m_uiLastOperFrameTime OFF_LogicPlayer_m_uiLastOperFrameTime // uint32
#define LogicPlayer_SummonSkillId OFF_LogicPlayer_SummonSkillId // int32
#define LogicPlayer_m_SummonStartSkillId OFF_LogicPlayer_m_SummonStartSkillId // int32
#define LogicPlayer_m_RankLv OFF_LogicPlayer_m_RankLv // uint32
#define LogicPlayer_m_bigRankLv OFF_LogicPlayer_m_bigRankLv // uint32
#define LogicPlayer_m_rankStar OFF_LogicPlayer_m_rankStar // uint32
#define LogicPlayer_m_rankNum OFF_LogicPlayer_m_rankNum // uint32
#define LogicPlayer_m_AutoAttackAI OFF_LogicPlayer_m_AutoAttackAI // AutoAttackAI
#define LogicPlayer_m_LogicPunish OFF_LogicPlayer_m_LogicPunish // LogicPunish
#define LogicPlayer_m_lastReliveTime OFF_LogicPlayer_m_lastReliveTime // uint32
#define LogicPlayer_m_ReviveTimeMs OFF_LogicPlayer_m_ReviveTimeMs // uint32
#define LogicPlayer_m_bFastDie OFF_LogicPlayer_m_bFastDie // bool
#define LogicPlayer_m_EatFruit OFF_LogicPlayer_m_EatFruit // uint32
#define LogicPlayer_m_KillByFruit OFF_LogicPlayer_m_KillByFruit // uint32
#define LogicPlayer_m_GetFruitOnMin OFF_LogicPlayer_m_GetFruitOnMin // uint32
#define LogicPlayer_bAllowRelive OFF_LogicPlayer_bAllowRelive // bool
#define LogicPlayer_m_uiRoleLevel OFF_LogicPlayer_m_uiRoleLevel // uint32
#define LogicPlayer_m_Killer OFF_LogicPlayer_m_Killer // LogicFighter
#define LogicPlayer_m_iAddGoldValue OFF_LogicPlayer_m_iAddGoldValue // int32
#define LogicPlayer_iMaxHurtValue OFF_LogicPlayer_iMaxHurtValue // int32
#define LogicPlayer_m_iSkinId OFF_LogicPlayer_m_iSkinId // int32
#define LogicPlayer_m_iDragonCrystalId OFF_LogicPlayer_m_iDragonCrystalId // int32
#define LogicPlayer_m_uUserMapID OFF_LogicPlayer_m_uUserMapID // uint32
#define LogicPlayer_m_DevourData OFF_LogicPlayer_m_DevourData // DevourData
#define LogicPlayer_iLastGiveupEquip OFF_LogicPlayer_iLastGiveupEquip // int32
#define LogicPlayer_m_ControlSummer OFF_LogicPlayer_m_ControlSummer // LogicControlSummons
#define LogicPlayer_m_vSkillLogicFighter OFF_LogicPlayer_m_vSkillLogicFighter // Dictionary<int, LogicFighter>
#define LogicPlayer_m_iSurvivalTime OFF_LogicPlayer_m_iSurvivalTime // uint32
#define LogicPlayer_m_iChickenRanking OFF_LogicPlayer_m_iChickenRanking // uint32
#define LogicPlayer_m_bEmojiBirthday OFF_LogicPlayer_m_bEmojiBirthday // bool
#define LogicPlayer_logAttackSpeed OFF_LogicPlayer_logAttackSpeed // bool
#define LogicPlayer_doAttackSpeed OFF_LogicPlayer_doAttackSpeed // bool
#define LogicPlayer_m_CommATK_RunTimer OFF_LogicPlayer_m_CommATK_RunTimer // uint32
#define LogicPlayer_m_dCommATKSingTime_Mod OFF_LogicPlayer_m_dCommATKSingTime_Mod // int32
#define LogicPlayer_m_CommATKSingTime_LastTimer OFF_LogicPlayer_m_CommATKSingTime_LastTimer // uint32
#define LogicPlayer_m_dCommATKCD_Mod OFF_LogicPlayer_m_dCommATKCD_Mod // int32
#define LogicPlayer_m_CommATKCD_LastTimer OFF_LogicPlayer_m_CommATKCD_LastTimer // uint32
#define LogicPlayer_m_vPlayerDeadInfo OFF_LogicPlayer_m_vPlayerDeadInfo // List<PlayerDeadInfo>
#define LogicPlayer_m_PriorEquip OFF_LogicPlayer_m_PriorEquip // uint32
#define LogicPlayer_m_RecmendEquips OFF_LogicPlayer_m_RecmendEquips // List<uint>
#define LogicPlayer_m_uHeroEnhanceLevel OFF_LogicPlayer_m_uHeroEnhanceLevel // uint32
#define LogicPlayer_m_bGhostHasDied OFF_LogicPlayer_m_bGhostHasDied // bool
#define LogicPlayer_m_v2StarDir OFF_LogicPlayer_m_v2StarDir // DVector2
#define LogicPlayer_shopData OFF_LogicPlayer_shopData // CantShopComp
#define LogicPlayer_v2LastCheckPos OFF_LogicPlayer_v2LastCheckPos // DVector2
#define LogicPlayer_lastCheckDirSymbol OFF_LogicPlayer_lastCheckDirSymbol // int32
#define LogicPlayer_lastCheckMoveDir OFF_LogicPlayer_lastCheckMoveDir // DVector2
#define LogicPlayer_right OFF_LogicPlayer_right // int32
#define LogicPlayer_lastFailedAutoAiSpellCast OFF_LogicPlayer_lastFailedAutoAiSpellCast // SpellCastData
#define LogicPlayer_lastFailedAutoAiSpellCastTime OFF_LogicPlayer_lastFailedAutoAiSpellCastTime // uint32
#define LogicPlayer_ownNormalSkillCache OFF_LogicPlayer_ownNormalSkillCache // IList<int>
#define LogicPlayer_autoTime OFF_LogicPlayer_autoTime // int32
#define LogicPlayer_m_dXpGrowthDecimal OFF_LogicPlayer_m_dXpGrowthDecimal // double
#define LogicPlayer_lEatFruits OFF_LogicPlayer_lEatFruits // List<EatFruitData>
#define LogicPlayer_bBornedBoss OFF_LogicPlayer_bBornedBoss // bool
#define LogicPlayer_iPreMutiKillValue OFF_LogicPlayer_iPreMutiKillValue // int32
#define LogicPlayer_iPreContinueKillValue OFF_LogicPlayer_iPreContinueKillValue // int32
#define LogicPlayer_iPreKillLingZhu OFF_LogicPlayer_iPreKillLingZhu // int32
#define LogicPlayer_iPreKillShenGui OFF_LogicPlayer_iPreKillShenGui // int32
#define LogicPlayer_iPreShutDown OFF_LogicPlayer_iPreShutDown // int32
#define LogicPlayer_bCheckFirstBlood OFF_LogicPlayer_bCheckFirstBlood // bool
#define LogicPlayer_iCurrentResult OFF_LogicPlayer_iCurrentResult // int32
#define LogicPlayer_iPreGetResultTime OFF_LogicPlayer_iPreGetResultTime // uint32
#define LogicPlayer_iCurKilledResult OFF_LogicPlayer_iCurKilledResult // int32
#define LogicPlayer_iPreKilledResultTime OFF_LogicPlayer_iPreKilledResultTime // uint32
