# AI Save State - MLBB Broadcasting System

**Last Updated:** 2026-01-13
**Status:** Phase 2 Complete - Zygisk Hooks & Frontend Fixes

## 1. Project Overview
Project ini telah di-refactor menjadi arsitektur "Unified Server". Frontend dan Backend kini berkomunikasi di Port 3000. Modul Zygisk telah ditingkatkan dengan sistem hook untuk akurasi data yang lebih baik.

## 2. Key Changes (Phase 2)
1.  **Zygisk Module Enhancement**:
    *   **Hook System:** Menambahkan `DobbyHook` pada `UIRankHero.Update` dan `LogicBattleManager.Update` untuk menangkap instance secara otomatis dan akurat.
    *   **Ban/Pick Monitoring:** Implementasi penuh ekstraksi data Ban/Pick list, order, dan timer draft.
    *   **Macro-based Offsets:** Refaktor `DynamicOffsets` menggunakan macro untuk skalabilitas (mudah menambah ratusan field baru).
    *   **Timer Logic:** Sinkronisasi timer in-game menggunakan hook pada update loop game.

2.  **Frontend Fixes**:
    *   **Port Correction:** Mengubah semua referensi hardcoded Port 3003 menjadi Port 3000 (Unified Server).
    *   **Path Correction:** Mengubah path asset dari relatif (`assets/`) menjadi absolut (`/assets/`) untuk memperbaiki "Blank Green Screen" pada route `/control`.
    *   **Crash Prevention:** Menambahkan `DEFAULT_APP_STATE` merging dan optional chaining pada `ControlPanel` untuk menangani data yang belum siap/null.

## 3. How to Run
1.  **Start System:**
    ```bash
    npm start
    ```
    *   Akses Dashboard: http://localhost:5173
    *   Akses Control Panel: http://localhost:5173/control

## 4. Next Steps
*   [ ] **Build & Deploy Zygisk:** Compile kode C++ terbaru dan pasang di HP target.
*   [ ] **Verify Ban/Pick UI:** Pastikan data Ban/Pick dari Zygisk muncul dengan benar di UI Overlay.
*   [ ] **Polishing Overlay:** Tambahkan animasi atau styling tambahan pada komponen Overlay sesuai kebutuhan broadcasting.

## 5. Files Modified
*   `Zygisk-mlbs-temp/app/src/main/jni/DynamicOffsets.h/cpp`
*   `Zygisk-mlbs-temp/app/src/main/jni/GameLogic.cpp`
*   `Zygisk-mlbs-temp/app/src/main/jni/GlobalState.h`
*   `Zygisk-mlbs-temp/app/src/main/jni/feature/BattleData.h`
*   `overlay-MLBB/App.tsx`
*   `overlay-MLBB/ControlPanel.tsx`
*   `overlay-MLBB/components/Overlay.tsx`
*   `overlay-MLBB/components/AdminPanel.tsx`
