#pragma once
#include <cstdint>
#include <vector>
#include <map>
#include <string>

// Raw fields from ShowFightDataTiny as requested
// Updated to include ALL fields including pointers to match "raw dump" requirement
struct BattleStats {
    uint32_t m_levelOnSixMin;
    uint32_t m_LevelOnTwelveMin;
    uintptr_t m_EmojiCarryList_Ptr;
    uintptr_t m_TDFighteData_Ptr;
    uintptr_t m_DeathInfoList_Ptr;
    uintptr_t m_DeathAttackInfoDict_Ptr;
    uintptr_t m_lNotLinkEffect_Ptr;
    uintptr_t m_dicKeyCancelDis_Ptr;
    uintptr_t m_KillerCount_Ptr;
    uintptr_t m_FighterDyData_Ptr;
    uint32_t m_KillNumCrossTower;
    uint32_t m_RevengeKillNum;
    uint32_t m_ExtremeBackHomeNum;
    uintptr_t m_selfBeAttackTIme_Ptr;
    uintptr_t m_heroNumAroundSelf_Ptr;
    uintptr_t m_EnemyhurtSelf_Ptr;
    uint32_t lastLockGuid;
    bool bLockGuidChanged;
    uint32_t m_BackHomeCount;
    uint32_t m_RecoverSuccessfullyCount;
    uintptr_t m_ReplaceHeroSkill_Ptr;
    uintptr_t m_arenaWinVoice_Ptr;
    uintptr_t m_arenaLoseVoice_Ptr;
    uint32_t m_BuyEquipCount;
    float m_BuyEquipTime;
    uintptr_t m_BannedList_Ptr;
    uintptr_t m_VoiceBannedList_Ptr;
    uintptr_t m_ForbidTalkList_Ptr;
    uintptr_t m_BuyEquipTimes_Ptr;
    uintptr_t m_GreatIDs_Ptr;
    uintptr_t m_FighterSplitEnergyBar_Ptr;
    uint32_t m_uSurvivalCount;
    uint32_t m_uPlayerCount;
    int32_t m_iCampAKill;
    int32_t m_iCampBKill;
    uint32_t m_CampAGold;
    uint32_t m_CampBGold;
    uint32_t m_CampAExp;
    uint32_t m_CampBExp;
    uint32_t m_CampAKillTower;
    uint32_t m_CampBKillTower;
    uint32_t m_CampAKillLingZhu;
    uint32_t m_CampBKillLingZhu;
    uint32_t m_CampAKillShenGui;
    uint32_t m_CampBKillShenGui;
    uint32_t m_CampAKillLingzhuOnSuperior;
    uint32_t m_CampBKillLingzhuOnSuperior;
    uint32_t m_CampASuperiorTime;
    uint32_t m_CampBSuperiorTime;
    uint32_t m_iFirstBldTime;
    uint32_t m_iFirstBldKiller;
};

BattleStats GetBattleStats();
