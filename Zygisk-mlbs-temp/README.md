# MLBS Zygisk Module

Modul Zygisk ini dirancang untuk mengekstrak data real-time dari Mobile Legends: Bang Bang (MLBB) untuk keperluan penyiaran (broadcasting) turnamen.

## Fitur Saat Ini
*   **Heartbeat/State Monitoring:** Memantau status permainan (Lobby, Draft, Loading, In-Game).
*   **Room Info:** Ekstraksi data pemain (Nama, Hero ID, Spell, Camp) saat di Lobby/Draft.
*   **Battle Stats:** Ekstraksi data statistik (Kill, Gold, Tower, Lord/Turtle) saat In-Game.
*   **Logic Player Stats:** Ekstraksi data mendalam dari `LogicPlayer` (Total Gold, Kill Streaks, dsb).
*   **Ban/Pick Monitoring (New):** Memantau daftar hero yang di-ban dan di-pick secara real-time.
*   **IPC Server:** Mengirimkan data via Unix Domain Socket (`mlbs_ipc`) yang kemudian diteruskan oleh ADB ke Unified Server.

## Arsitektur Data
1.  **Zygisk Module:** Menginjeksi kode C++ ke dalam proses MLBB.
2.  **Il2Cpp Resolver:** Mencari offset memori secara dinamis menggunakan `DynamicOffsets.cpp`.
3.  **Unix Socket:** Membuka socket di `/dev/socket/mlbs_ipc` (atau abstract namespace).
4.  **ADB Forward:** Komputer melakukan `adb forward tcp:12345 localabstract:mlbs_ipc`.
5.  **Unified Server:** Node.js server terhubung ke port 12345 dan menyebarkan data via Socket.IO ke Frontend.

## Pengembangan (Menambah Offset Baru)
Untuk menambah field memori baru:
1.  Tambahkan `DEFINE_OFFSET(NamaField)` di `DynamicOffsets.h`.
2.  Tambahkan `IMPL_OFFSET(NamaField)` di `DynamicOffsets.cpp`.
3.  Tambahkan baris inisialisasi di `InitDynamicOffsets()` menggunakan macro `INIT_OFFSET`.
4.  Gunakan macro `READ_FIELD` atau `READ_PTR` di `GameLogic.cpp` untuk membaca datanya.

## Prasyarat Build
*   Android NDK (r21e atau lebih baru)
*   Gradle
*   Akses Root pada perangkat target (untuk menginstal modul Magisk/Zygisk).