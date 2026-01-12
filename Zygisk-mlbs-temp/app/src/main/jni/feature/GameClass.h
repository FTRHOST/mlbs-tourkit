#pragma once

#include "../Include.h"

//Class Camera
#define Camera_get_main (uintptr_t) Il2CppGetMethodOffset("UnityEngine.dll", "UnityEngine", "Camera", "get_main")
#define Camera_WorldToScreenPoint (uintptr_t) Il2CppGetMethodOffset("UnityEngine.dll", "UnityEngine", "Camera", "WorldToScreenPoint", 1)
#define Camera_get_fieldOfView (uintptr_t) Il2CppGetMethodOffset("UnityEngine.dll", "UnityEngine", "Camera", "get_fieldOfView")
#define Camera_set_fieldOfView (uintptr_t) Il2CppGetMethodOffset("UnityEngine.dll", "UnityEngine", "Camera", "set_fieldOfView", 1)

void *get_main() {
	return reinterpret_cast<void *(__fastcall *)()>(Camera_get_main)();
}

Vector3 WorldToScreen(Vector3 position) {
	return reinterpret_cast<Vector3(__fastcall *)(void *, Vector3)>(Camera_WorldToScreenPoint)(get_main(), position);
}

float get_fieldOfView() {
	return reinterpret_cast<float(__fastcall *)(void *)>(Camera_get_fieldOfView)(get_main());
}

void *set_fieldOfView(float value) {
	return reinterpret_cast<void *(__fastcall *)(void *, float)>(Camera_set_fieldOfView)(get_main(), value);
}

//Class Transform
#define Transform_get_position (uintptr_t) Il2CppGetMethodOffset("UnityEngine.dll", "UnityEngine", "Transform", "get_position")

class Transform {
public:
    Vector3 get_position() {
        auto get_position = (Vector3 (*)(Transform *)) (Transform_get_position);
        return get_position(this);
    }
};

//Class BattleManager
#define BattleManager_m_LocalPlayerShow (uintptr_t) Il2CppGetFieldOffset("Assembly-CSharp.dll", "", "BattleManager", "m_LocalPlayerShow")
#define BattleManager_m_ShowPlayers (uintptr_t) Il2CppGetFieldOffset("Assembly-CSharp.dll", "", "BattleManager", "m_ShowPlayers")
#define BattleManager_m_ShowMonsters (uintptr_t) Il2CppGetFieldOffset("Assembly-CSharp.dll", "", "BattleManager", "m_ShowMonsters")
#define BattleManager_m_dicPlayerShow (uintptr_t) Il2CppGetFieldOffset("Assembly-CSharp.dll", "", "BattleManager", OBFUSCATE("m_dicPlayerShow"))
#define BattleManager_m_dicMonsterShow (uintptr_t) Il2CppGetFieldOffset("Assembly-CSharp.dll", "", "BattleManager", OBFUSCATE("m_dicMonsterShow"))

//Class BattleBridge
#define BattleBridge_bStartBattle OFF_BattleBridge_bStartBattle

#define BattleManager_m_LocalShowPlayers OFF_BattleManager_m_LocalShowPlayers
#define ShowPlayer_m_bInBattle OFF_ShowPlayer_m_bInBattle

//Class ShowEntity
#define ShowEntity_get_InTransformation (uintptr_t) Il2CppGetMethodOffset("Assembly-CSharp.dll", "", "ShowEntity", OBFUSCATE("get_InTransformation"))
#define ShowEntity__Position OFF_ShowEntity__Position
#define ShowEntity_bShowEntityLayer OFF_ShowEntity_bShowEntityLayer
#define ShowEntity_m_OwnSkillComp OFF_ShowEntity_m_OwnSkillComp
#define ShowEntity_m_RoleName OFF_ShowEntity_m_RoleName
#define ShowEntity__MoveDir OFF_ShowEntity__MoveDir

//Class EntityBase
#define EntityBase_bMove OFF_EntityBase_bMove
#define EntityBase_m_ID OFF_EntityBase_m_ID
#define EntityBase_m_Level OFF_EntityBase_m_Level
#define EntityBase_m_bDeath OFF_EntityBase_m_bDeath
#define EntityBase_m_IsDeathProgress OFF_EntityBase_m_IsDeathProgress
#define EntityBase_m_bSameCampType OFF_EntityBase_m_bSameCampType
#define EntityBase_m_Hp OFF_EntityBase_m_Hp
#define EntityBase_m_HpMax OFF_EntityBase_m_HpMax
#define EntityBase_m_EntityCampType OFF_EntityBase_m_EntityCampType
#define EntityBase_m_iType OFF_EntityBase_m_iType
#define EntityBase_canSight OFF_EntityBase_canSight
#define EntityBase_m_uGuid OFF_EntityBase_m_uGuid

//Class ShowPlayer
#define ShowPlayer_m_HeroName OFF_ShowPlayer_m_HeroName

//Class LogicFighter
#define LogicFighter_m_SkillComp OFF_LogicFighter_m_SkillComp

#define LogicBattleManager_GetBattleState (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("LogicBattleManager"), OBFUSCATE("GetBattleState"))

int GetBattleState(void* instance) {
    return reinterpret_cast<int(__fastcall *)(void*)>(LogicBattleManager_GetBattleState)(instance);
}

//Class SystemData
#define SystemData_GetBattlePlayerInfo (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("GetBattlePlayerInfo"))

//Class SystemData.RoomData 
#define SystemData_RoomData_bAutoConditionNew OFF_SystemData_RoomData_bAutoConditionNew
#define SystemData_RoomData_bShowSeasonAchieve OFF_SystemData_RoomData_bShowSeasonAchieve
#define SystemData_RoomData_iStyleBoardId OFF_SystemData_RoomData_iStyleBoardId
#define SystemData_RoomData_iMatchEffectId OFF_SystemData_RoomData_iMatchEffectId
#define SystemData_RoomData_iDayBreakNo1Count OFF_SystemData_RoomData_iDayBreakNo1Count
#define SystemData_RoomData_lUid OFF_SystemData_RoomData_lUid
#define SystemData_RoomData_bUid OFF_SystemData_RoomData_bUid
#define SystemData_RoomData_iCamp OFF_SystemData_RoomData_iCamp
#define SystemData_RoomData_iPos OFF_SystemData_RoomData_iPos
#define SystemData_RoomData_bAutoReadySelect OFF_SystemData_RoomData_bAutoReadySelect
#define SystemData_RoomData__sName OFF_SystemData_RoomData__sName
#define SystemData_RoomData_bRobot OFF_SystemData_RoomData_bRobot
#define SystemData_RoomData_heroid OFF_SystemData_RoomData_heroid
#define SystemData_RoomData_heroskin OFF_SystemData_RoomData_heroskin
#define SystemData_RoomData_headID OFF_SystemData_RoomData_headID
#define SystemData_RoomData_uiSex OFF_SystemData_RoomData_uiSex
#define SystemData_RoomData_country OFF_SystemData_RoomData_country
#define SystemData_RoomData_uiZoneId OFF_SystemData_RoomData_uiZoneId
#define SystemData_RoomData_summonSkillId OFF_SystemData_RoomData_summonSkillId
#define SystemData_RoomData_runeId OFF_SystemData_RoomData_runeId
#define SystemData_RoomData_mapTalentTree OFF_SystemData_RoomData_mapTalentTree
#define SystemData_RoomData_mRuneSkill2023 OFF_SystemData_RoomData_mRuneSkill2023
#define SystemData_RoomData_runeLv OFF_SystemData_RoomData_runeLv
#define SystemData_RoomData_skinlist OFF_SystemData_RoomData_skinlist
#define SystemData_RoomData_facePath OFF_SystemData_RoomData_facePath
#define SystemData_RoomData_faceBorder OFF_SystemData_RoomData_faceBorder
#define SystemData_RoomData_bStarVip OFF_SystemData_RoomData_bStarVip
#define SystemData_RoomData_bMCStarVip OFF_SystemData_RoomData_bMCStarVip
#define SystemData_RoomData_bMCStarVipPlus OFF_SystemData_RoomData_bMCStarVipPlus
#define SystemData_RoomData_ulRoomID OFF_SystemData_RoomData_ulRoomID
#define SystemData_RoomData_iConBlackRoomId OFF_SystemData_RoomData_iConBlackRoomId
#define SystemData_RoomData_banHero OFF_SystemData_RoomData_banHero
#define SystemData_RoomData_vCanSelectHero OFF_SystemData_RoomData_vCanSelectHero
#define SystemData_RoomData_vCanPickHero OFF_SystemData_RoomData_vCanPickHero
#define SystemData_RoomData_uiBattlePlayerType OFF_SystemData_RoomData_uiBattlePlayerType
#define SystemData_RoomData_sThisLoginCountry OFF_SystemData_RoomData_sThisLoginCountry
#define SystemData_RoomData_sCreateRoleCountry OFF_SystemData_RoomData_sCreateRoleCountry
#define SystemData_RoomData_uiLanguage OFF_SystemData_RoomData_uiLanguage
#define SystemData_RoomData_bIsOpenLive OFF_SystemData_RoomData_bIsOpenLive
#define SystemData_RoomData_iTeamId OFF_SystemData_RoomData_iTeamId
#define SystemData_RoomData_iTeamNationId OFF_SystemData_RoomData_iTeamNationId
#define SystemData_RoomData__steamName OFF_SystemData_RoomData__steamName
#define SystemData_RoomData__steamSimpleName OFF_SystemData_RoomData__steamSimpleName
#define SystemData_RoomData_iCertify OFF_SystemData_RoomData_iCertify
#define SystemData_RoomData_lsEffectSkins OFF_SystemData_RoomData_lsEffectSkins
#define SystemData_RoomData_lsComEffSkins OFF_SystemData_RoomData_lsComEffSkins
#define SystemData_RoomData_vMissions OFF_SystemData_RoomData_vMissions
#define SystemData_RoomData_uiRankLevel OFF_SystemData_RoomData_uiRankLevel
#define SystemData_RoomData_uiPVPRank OFF_SystemData_RoomData_uiPVPRank
#define SystemData_RoomData_bRankReview OFF_SystemData_RoomData_bRankReview
#define SystemData_RoomData_iElo OFF_SystemData_RoomData_iElo
#define SystemData_RoomData_uiRoleLevel OFF_SystemData_RoomData_uiRoleLevel
#define SystemData_RoomData_bNewPlayer OFF_SystemData_RoomData_bNewPlayer
#define SystemData_RoomData_iRoad OFF_SystemData_RoomData_iRoad
#define SystemData_RoomData_uiSkinSource OFF_SystemData_RoomData_uiSkinSource
#define SystemData_RoomData_iFighterType OFF_SystemData_RoomData_iFighterType
#define SystemData_RoomData_iWorldCupSupportCountry OFF_SystemData_RoomData_iWorldCupSupportCountry
#define SystemData_RoomData_iHeroLevel OFF_SystemData_RoomData_iHeroLevel
#define SystemData_RoomData_iHeroSubLevel OFF_SystemData_RoomData_iHeroSubLevel
#define SystemData_RoomData_iHeroPowerLevel OFF_SystemData_RoomData_iHeroPowerLevel
#define SystemData_RoomData_iActCamp OFF_SystemData_RoomData_iActCamp
#define SystemData_RoomData_vTitle OFF_SystemData_RoomData_vTitle
#define SystemData_RoomData_mHeroMission OFF_SystemData_RoomData_mHeroMission
#define SystemData_RoomData_vEmoji OFF_SystemData_RoomData_vEmoji
#define SystemData_RoomData_vItemBuff OFF_SystemData_RoomData_vItemBuff
#define SystemData_RoomData_vMapPaint OFF_SystemData_RoomData_vMapPaint
#define SystemData_RoomData_mSkinPaint OFF_SystemData_RoomData_mSkinPaint
#define SystemData_RoomData_sClientVersion OFF_SystemData_RoomData_sClientVersion
#define SystemData_RoomData_uiHolyStatue OFF_SystemData_RoomData_uiHolyStatue
#define SystemData_RoomData_uiKamon OFF_SystemData_RoomData_uiKamon
#define SystemData_RoomData_uiUserMapID OFF_SystemData_RoomData_uiUserMapID
#define SystemData_RoomData_iSurviveRank OFF_SystemData_RoomData_iSurviveRank
#define SystemData_RoomData_iDefenceRankID OFF_SystemData_RoomData_iDefenceRankID
#define SystemData_RoomData_iLeagueWCNum OFF_SystemData_RoomData_iLeagueWCNum
#define SystemData_RoomData_iLeagueFCNum OFF_SystemData_RoomData_iLeagueFCNum
#define SystemData_RoomData_iMPLCertifyTime OFF_SystemData_RoomData_iMPLCertifyTime
#define SystemData_RoomData_iMPLCertifyID OFF_SystemData_RoomData_iMPLCertifyID
#define SystemData_RoomData_mapBattleAttr OFF_SystemData_RoomData_mapBattleAttr
#define SystemData_RoomData_iHeroUseCount OFF_SystemData_RoomData_iHeroUseCount
#define SystemData_RoomData_iMythPoint OFF_SystemData_RoomData_iMythPoint
#define SystemData_RoomData_bMythEvaled OFF_SystemData_RoomData_bMythEvaled
#define SystemData_RoomData_iDefenceFlag OFF_SystemData_RoomData_iDefenceFlag
#define SystemData_RoomData_iDefenPoint OFF_SystemData_RoomData_iDefenPoint
#define SystemData_RoomData_iDefenceMap OFF_SystemData_RoomData_iDefenceMap
#define SystemData_RoomData_iAIType OFF_SystemData_RoomData_iAIType
#define SystemData_RoomData_iAISeed OFF_SystemData_RoomData_iAISeed
#define SystemData_RoomData_sAiName OFF_SystemData_RoomData_sAiName
#define SystemData_RoomData_iWarmValue OFF_SystemData_RoomData_iWarmValue
#define SystemData_RoomData_uiAircraftIDChooose OFF_SystemData_RoomData_uiAircraftIDChooose
#define SystemData_RoomData_uiHeroIDChoose OFF_SystemData_RoomData_uiHeroIDChoose
#define SystemData_RoomData_uiHeroSkinIDChoose OFF_SystemData_RoomData_uiHeroSkinIDChoose
#define SystemData_RoomData_uiMapIDChoose OFF_SystemData_RoomData_uiMapIDChoose
#define SystemData_RoomData_uiMapSkinIDChoose OFF_SystemData_RoomData_uiMapSkinIDChoose
#define SystemData_RoomData_uiDefenceRankScore OFF_SystemData_RoomData_uiDefenceRankScore
#define SystemData_RoomData_bBanChat OFF_SystemData_RoomData_bBanChat
#define SystemData_RoomData_iChatBanFinishTime OFF_SystemData_RoomData_iChatBanFinishTime
#define SystemData_RoomData_iChatBanBattleNum OFF_SystemData_RoomData_iChatBanBattleNum
#define SystemData_RoomData_vFastChat OFF_SystemData_RoomData_vFastChat
#define SystemData_RoomData_vWantSelectHero OFF_SystemData_RoomData_vWantSelectHero
#define SystemData_RoomData_bForbidUseFaceName OFF_SystemData_RoomData_bForbidUseFaceName
#define SystemData_RoomData_sClientIp OFF_SystemData_RoomData_sClientIp
#define SystemData_RoomData_iRoomOrder OFF_SystemData_RoomData_iRoomOrder
#define SystemData_RoomData_vRougeTotalSkill OFF_SystemData_RoomData_vRougeTotalSkill
#define SystemData_RoomData_vRougeOMGSkill OFF_SystemData_RoomData_vRougeOMGSkill
#define SystemData_RoomData_vRecommendEquipList OFF_SystemData_RoomData_vRecommendEquipList
#define SystemData_RoomData_sRecommendEquipVersion OFF_SystemData_RoomData_sRecommendEquipVersion
#define SystemData_RoomData_vPingParamDetail OFF_SystemData_RoomData_vPingParamDetail
#define SystemData_RoomData_uiPlayerPing OFF_SystemData_RoomData_uiPlayerPing
#define SystemData_RoomData_mSkinRankSeasonTag OFF_SystemData_RoomData_mSkinRankSeasonTag
#define SystemData_RoomData_mSkinNumTag OFF_SystemData_RoomData_mSkinNumTag
#define SystemData_RoomData_bFullSkillaber OFF_SystemData_RoomData_bFullSkillaber
#define SystemData_RoomData_uiCommanderSkinAttackEffect OFF_SystemData_RoomData_uiCommanderSkinAttackEffect
#define SystemData_RoomData_uiDailyFreeRandomNum OFF_SystemData_RoomData_uiDailyFreeRandomNum
#define SystemData_RoomData_bIllustrateCornerEffectClose OFF_SystemData_RoomData_bIllustrateCornerEffectClose
#define SystemData_RoomData_bTagedBackOf2022 OFF_SystemData_RoomData_bTagedBackOf2022
#define SystemData_RoomData_iTapConflictTipNum OFF_SystemData_RoomData_iTapConflictTipNum
#define SystemData_RoomData_iNameShowType OFF_SystemData_RoomData_iNameShowType
#define SystemData_RoomData_bOpenHighLight OFF_SystemData_RoomData_bOpenHighLight
#define SystemData_RoomData_mMCBanPickCommander OFF_SystemData_RoomData_mMCBanPickCommander
#define SystemData_RoomData_vForbidBanCommander OFF_SystemData_RoomData_vForbidBanCommander
#define SystemData_RoomData_iTeamLevel OFF_SystemData_RoomData_iTeamLevel
#define SystemData_RoomData_vAdditionalHero OFF_SystemData_RoomData_vAdditionalHero
#define SystemData_RoomData_uiDisorderPublicHeroScore OFF_SystemData_RoomData_uiDisorderPublicHeroScore
#define SystemData_RoomData_bPlayerBirthdayToday OFF_SystemData_RoomData_bPlayerBirthdayToday
#define SystemData_RoomData_iTeamHeadId OFF_SystemData_RoomData_iTeamHeadId
#define SystemData_RoomData_mapHeroBattleNum OFF_SystemData_RoomData_mapHeroBattleNum
#define SystemData_RoomData_vCurSeasonRealRoadInfo OFF_SystemData_RoomData_vCurSeasonRealRoadInfo
#define SystemData_RoomData_vCultivateRoadShow OFF_SystemData_RoomData_vCultivateRoadShow
#define SystemData_RoomData_uiCommanderLevel OFF_SystemData_RoomData_uiCommanderLevel
#define SystemData_RoomData_bOpenSubRankID OFF_SystemData_RoomData_bOpenSubRankID
#define SystemData_RoomData_iSubRankID OFF_SystemData_RoomData_iSubRankID
#define SystemData_RoomData_iSingleLv OFF_SystemData_RoomData_iSingleLv
#define SystemData_RoomData_stArenaMatchBattleInfo OFF_SystemData_RoomData_stArenaMatchBattleInfo
#define SystemData_RoomData_stArenaMatchShowInfo OFF_SystemData_RoomData_stArenaMatchShowInfo
#define SystemData_RoomData_stSkinAttach OFF_SystemData_RoomData_stSkinAttach
#define SystemData_RoomData_iMatchTeamId OFF_SystemData_RoomData_iMatchTeamId
#define SystemData_RoomData_iFlowBackTYpe OFF_SystemData_RoomData_iFlowBackTYpe
#define SystemData_RoomData_bRoadAdditionCover OFF_SystemData_RoomData_bRoadAdditionCover
#define SystemData_RoomData_iRoadAdditionCoverTimes OFF_SystemData_RoomData_iRoadAdditionCoverTimes
#define SystemData_RoomData_iRoomPos OFF_SystemData_RoomData_iRoomPos
#define SystemData_RoomData_stEasterEggInfo OFF_SystemData_RoomData_stEasterEggInfo
#define SystemData_RoomData_sMatchTeamName OFF_SystemData_RoomData_sMatchTeamName
#define SystemData_RoomData_iMatchTeamFaceId OFF_SystemData_RoomData_iMatchTeamFaceId

// Added SystemData_StopCheckMD5 Definition to resolve undefined identifier error
#define SystemData_StopCheckMD5 (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("StopCheckMD5"), 0)

//class SystemData
#define SystemData_m_uiID OFF_SystemData_m_uiID

monoList<uintptr_t> *GetBattlePlayerInfo() {
    return reinterpret_cast<monoList<uintptr_t> *(*)(void *)>(SystemData_GetBattlePlayerInfo)(nullptr);
}

void StopMD5Check(){
    return reinterpret_cast<void (__fastcall *)(void *)>(SystemData_StopCheckMD5)((void *)0);
}

//Unlock Skin -> Mencoba
//Class UIRankHero.ChangeShow
#define UIRankHero_ChangeShow_iSelfHero OFF_UIRankHero_ChangeShow_iSelfHero

//Class BattlePlayerInfo
#define BattlePlayerInfo_lUid OFF_BattlePlayerInfo_lUid
#define BattlePlayerInfo_uiSelHero OFF_BattlePlayerInfo_uiSelHero
#define BattlePlayerInfo_uiSkinId OFF_BattlePlayerInfo_uiSkinId

//Class CmdHeroSkin
#define CmdHeroSkin__ctor (uintptr_t) (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("CmdHeroSkin"), OBFUSCATE(".ctor"))

//Class CmdHeroStatue
#define CmdHeroStatue__ctor (uintptr_t) (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE("MTTDProto"), OBFUSCATE("CmdHeroStatue"), OBFUSCATE(".ctor"))

//Class SystemData,
#define SystemData_GetHeroSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("GetHeroSkin"), 2)
#define SystemData_GetMCLimitSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("GetMCLimitSkin"), 1)
#define SystemData_GetHeroHolyStatue (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("GetHeroHolyStatue"), 2)
#define SystemData_IsCanUseSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsCanUseSkin"), 1)
#define SystemData_IsHaveSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsHaveSkin"), 1)
#define SystemData_IsHaveSkinForever (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsHaveSkinForever"), 1)
#define SystemData_IsHaveStatue (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsHaveStatue"), 1)
#define SystemData_IsHaveStatueForever (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsHaveStatueForever"), 1)
#define SystemData_IsForbidStatue (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsForbidStatue"), 1)
#define SystemData_IsForbidSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsForbidSkin"), 1)
#define SystemData_IsForbidARSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsForbidARSkin"), 1)
#define SystemData_CheckReputationUnlockSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("CheckReputationUnlockSkin"), 1)
#define SystemData_GetStarSkinRank (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("GetStarSkinRank"),1)

#define SystemData_IsLimitActiveHero (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsLimitActiveHero"), 1)
#define SystemData_IsActivityForbidHeros (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsActivityForbidHeros"), 1)
#define SystemData_IsForbidHeroInChooseHero (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsForbidHeroInChooseHero"), 1)
#define SystemData_IsForbidHeros (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("IsForbidHeros"),1)

//Class UIChooseHero
#define UIChooseHero_SendSelectSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("ChooseHeroMgr"), OBFUSCATE("SendSelectSkin"), 2)
#define UIChooseHero_SaveSelectHeroSkinId (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("ChooseHeroMgr"), OBFUSCATE("SaveSelectHeroSkinId"), 2)
#define ChooseHeroMgr_BCustomRoomFreeSkill (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("ChooseHeroMgr"), OBFUSCATE("BCustomRoomFreeSkill"), 0)
#define ChooseHeroMgr_OnSetSelfBattlePlayerInfo (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("ChooseHeroMgr"), OBFUSCATE("OnSetSelfBattlePlayerInfo"), 1)
#define UIDataUtil_IsHeroInShop (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("UIDataUtil"), OBFUSCATE("IsHeroInShop"), 1)

//Class UIRankHero
#define UIRankHero_BatttleSelectSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("UIRankHero"), OBFUSCATE("BatttleSelectSkin"), 2)
#define UIRankHero_BatttleSelectSkin2 (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("UIChooseHero"), OBFUSCATE("BatttleSelectSkin"), 2)

#define UIRankHero_RefreshSkinDic (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("UIRankHero"), OBFUSCATE("RefreshSkinDic"), 3)
#define UIRankHero_RefreshHeroSkinShow (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("UIRankHero/RankingHeroShow"), OBFUSCATE("RefreshHeroSkinShow"), 3)

// UIRankHero BanPick Offsets
#define UIRankHero_banList OFF_UIRankHero_banList
#define UIRankHero_pickList OFF_UIRankHero_pickList
#define UIRankHero_banOrder OFF_UIRankHero_banOrder
#define UIRankHero_pickOrder OFF_UIRankHero_pickOrder
#define UIRankHero__startBanTime OFF_UIRankHero__startBanTime
#define UIRankHero__startSelectTime OFF_UIRankHero__startSelectTime
#define UIRankHero_iBanTimeSpan OFF_UIRankHero_iBanTimeSpan
#define UIRankHero_iPickTimeSpan OFF_UIRankHero_iPickTimeSpan

// Battle Stats
#define BattleStaticInit_GetTime (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("BattleStaticInit"), OBFUSCATE("GetTime"))

// BattleData & FightHeroInfo (For infobattle)
#define BattleData_heroInfoList OFF_BattleData_heroInfoList
#define FightHeroInfo_m_KillNum OFF_FightHeroInfo_m_KillNum
#define FightHeroInfo_m_DeadNum OFF_FightHeroInfo_m_DeadNum
#define FightHeroInfo_m_AssistNum OFF_FightHeroInfo_m_AssistNum
#define FightHeroInfo_m_Gold OFF_FightHeroInfo_m_Gold
#define FightHeroInfo_m_TotalGold OFF_FightHeroInfo_m_TotalGold
#define FightHeroInfo_m_PlayerName OFF_FightHeroInfo_m_PlayerName
#define FightHeroInfo_m_uGuid OFF_FightHeroInfo_m_uGuid
#define FightHeroInfo_m_CampType OFF_FightHeroInfo_m_CampType

//Class UIRankHero.ChangeShow
#define UIRankHero_ChangeShow_TrySendUseSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("UIRankHero/ChangeShow"), OBFUSCATE("TrySendUseSkin"), 2)
#define UIRankHero_ChangeShow_SendUseSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("UIRankHero/ChangeShow"), OBFUSCATE("SendUseSkin"), 2)


//Class BattleReceiveMessage
#define BattleReceiveMessage_SetPlayerData (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("BattleReceiveMessage"), OBFUSCATE("SetPlayerData"), 2)
#define BattleReceiveMessage_SetPlayerData_ (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("BattleReceiveMessage"), OBFUSCATE("SetPlayerData"), 1)
#define BattleReceiveMessage_AddPlayerInfo (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("BattleReceiveMessage"), OBFUSCATE("AddPlayerInfo"), 4)
#define BattleReceiveMessage_AddPlayerInfo_ (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("BattleReceiveMessage"), OBFUSCATE("AddPlayerInfo"), 2)
#define BattleReceiveMessage_SendBattleData (uintptr_t) Il2CppGetMethodOffset("Assembly-CSharp.dll", "", "BattleReceiveMessage", "SendBattleData", 4)
#define GameReceiveMessage_SendGameData (uintptr_t) Il2CppGetMethodOffset("Assembly-CSharp.dll", "", "GameReceiveMessage", "SendGameData", 3)
#define GameReceiveMessage_SendGameRawData (uintptr_t) Il2CppGetMethodOffset("Assembly-CSharp.dll", "", "GameReceiveMessage", "_SendGameRawData", 6)

//Class GameServerConfig
#define GameServerConfig_SendRawData (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("GameServerConfig"), OBFUSCATE("SendRawData"), 8)
#define GameServerConfig_SendData2 (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("GameServerConfig"), OBFUSCATE("SendData"), 6)
#define GameServerConfig_IsChannel_dfjz (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("GameServerConfig"), OBFUSCATE("IsChannel_dfjz"), 0)
#define SystemData_GetExpiredCardSkinLimitTime (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("GetExpiredCardSkinLimitTime"), 1)
#define SystemData_GetLeaderSkinBForbid (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("SystemData"), OBFUSCATE("GetLeaderSkinBForbid"), 1)
#define UIRankHero_BRankHeroCanUse (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("UIRankHero"), OBFUSCATE("BRankHeroCanUse"), 1)
#define StarMemberData_ContainSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("StarMemberData"), OBFUSCATE("ContainSkin"), 1)
#define UIChooseHero_CheckHeroDefaultSkin (uintptr_t) Il2CppGetMethodOffset(OBFUSCATE("Assembly-CSharp.dll"), OBFUSCATE(""), OBFUSCATE("UIChooseHero"), OBFUSCATE("CheckHeroDefaultSkin"),1)