import time
import requests
import obsws_python as obs
import sys
import socket
import concurrent.futures

# ==========================================
# KONFIGURASI OBS & SCENE
# ==========================================
OBS_HOST = 'localhost'
OBS_PORT = 4455
OBS_PASSWORD = 'Fathir2606'  # <--- GANTI PASSWORD DISINI

# Nama Transisi (Cek di bagian "Scene Transitions" di OBS)
TRANSITION_NAME = "Stinger"  # Pastikan nama ini SAMA PERSIS dengan di OBS

# Nama Scene
SCENE_DRAFT = "Draft (main)"
SCENE_LOADING = "loadingScreen"
SCENE_BATTLE = "Battle"
SCENE_ENDGAME = "EndGame"
SCENE_DISCONNECT = "nambah waktu"

# ==========================================
# KONFIGURASI API & JARINGAN
# ==========================================
API_PORT = 2626          
SCAN_TIMEOUT = 0.5       
MAX_THREADS = 50         
TIMER_DURATION = 24      

# Variable Global State
draft_timer_start = None
loading_scene_switched = False
last_battle_state = -1   
active_api_url = None

def connect_obs():
    try:
        client = obs.ReqClient(host=OBS_HOST, port=OBS_PORT, password=OBS_PASSWORD)
        print(f"[OBS] Berhasil terhubung ke OBS di port {OBS_PORT}")
        return client
    except Exception as e:
        print(f"[ERROR] Gagal connect ke OBS: {e}")
        return None

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def check_url(ip):
    url = f"http://{ip}:{API_PORT}/state"
    try:
        response = requests.get(url, timeout=SCAN_TIMEOUT)
        if response.status_code == 200:
            return url
    except:
        return None
    return None

def smart_network_scan():
    print(f"\n[NETWORK] Memulai Scanning Jaringan (Port {API_PORT})...")
    local_ip = get_local_ip()
    print(f"[NETWORK] IP Komputer: {local_ip}")
    
    potential_ips = ['127.0.0.1', 'localhost', local_ip]
    ip_parts = local_ip.split('.')
    if len(ip_parts) == 4:
        subnet = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}"
        potential_ips.append(f"{subnet}.1") 
        potential_ips.append(f"{subnet}.129") 
        for i in range(1, 255):
            target = f"{subnet}.{i}"
            if target not in potential_ips:
                potential_ips.append(target)

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = {executor.submit(check_url, ip): ip for ip in potential_ips}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                print(f"[SUKSES] API Ditemukan di: {result}")
                return result
                
    print("[GAGAL] Tidak ditemukan API. Retrying...")
    return None

def switch_scene(obs_client, scene_name):
    """
    Fungsi ganti scene dengan Transisi Stinger
    """
    try:
        if obs_client:
            # 1. Set Transisi ke Stinger dulu
            obs_client.set_current_scene_transition(TRANSITION_NAME)
            
            # 2. Pindah Scene
            obs_client.set_current_program_scene(scene_name)
            
            print(f"\n[OBS ACTION] Transisi '{TRANSITION_NAME}' -> Scene: {scene_name}")
        else:
            print(f"\n[SIMULASI] Transisi '{TRANSITION_NAME}' -> Scene: {scene_name}")
    except Exception as e:
        print(f"\n[ERROR OBS] Gagal ganti scene: {e}")

def main():
    global draft_timer_start, loading_scene_switched, last_battle_state, active_api_url
    
    obs_client = connect_obs()

    while True:
        try:
            # 1. SCANNING API
            if not active_api_url:
                active_api_url = smart_network_scan()
                if not active_api_url:
                    time.sleep(3)
                    continue

            # 2. GET DATA (Handling Disconnect)
            response = requests.get(active_api_url, timeout=1)
            
            if response.status_code != 200:
                print(f"[WARN] API Error Status: {response.status_code}")
                switch_scene(obs_client, SCENE_DISCONNECT)
                active_api_url = None
                continue

            data = response.json()
            battle_state = data.get("battleState", 0)
            players = data.get("players", [])

            # ==========================================
            # LOGIKA UTAMA
            # ==========================================

            # --- STATE 3: DRAFT PICK ---
            if battle_state == 3:
                # Transisi Awal Masuk Draft
                if last_battle_state != 3:
                    print(f"\n[GAME] Masuk Draft Pick (State 3).")
                    switch_scene(obs_client, SCENE_DRAFT)

                # Cek Hero
                all_heroes_selected = False
                if players:
                    all_heroes_selected = all(p.get("heroId", 0) != 0 for p in players)
                
                # Timer Loading
                if all_heroes_selected:
                    if draft_timer_start is None:
                        draft_timer_start = time.time()
                        print(f"[GAME] Semua Hero Terpilih. Timer {TIMER_DURATION}s dimulai...")

                    elapsed = time.time() - draft_timer_start
                    remaining = TIMER_DURATION - elapsed

                    if remaining > 0:
                        sys.stdout.write(f"\r>> Menunggu Loading Screen: {remaining:.1f} detik...   ")
                        sys.stdout.flush()
                    else:
                        if not loading_scene_switched:
                            print(f"\n[TIMER] Waktu Habis! Switch ke Loading.")
                            switch_scene(obs_client, SCENE_LOADING)
                            loading_scene_switched = True
                else:
                    if draft_timer_start is not None:
                        print("\n[INFO] Draft belum lengkap. Timer reset.")
                    draft_timer_start = None
                    loading_scene_switched = False

            # --- STATE 6: BATTLE ---
            elif battle_state == 6:
                if last_battle_state != 6:
                    print(f"\n[GAME] Masuk Gameplay (State 6).")
                    switch_scene(obs_client, SCENE_BATTLE)
                
                draft_timer_start = None
                loading_scene_switched = False

            # --- STATE 8: END GAME ---
            elif battle_state == 8:
                if last_battle_state != 8:
                    print(f"\n[GAME] Masuk End Game (State 8).")
                    switch_scene(obs_client, SCENE_ENDGAME)
                
                draft_timer_start = None
                loading_scene_switched = False

            # --- STATE LAIN / LOBBY ---
            else:
                if last_battle_state in [3, 6, 8] and battle_state not in [3, 6, 8]:
                    print("\n[INFO] Kembali ke Lobby. Reset State.")
                    draft_timer_start = None
                    loading_scene_switched = False

            last_battle_state = battle_state
            time.sleep(0.5)

        # === HANDLING DISCONNECT ===
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
            if active_api_url is not None:
                print(f"\n[WARN] KONEKSI TERPUTUS dari {active_api_url}!")
                print(f"[DISCONNECT] Switch ke -> {SCENE_DISCONNECT}")
                switch_scene(obs_client, SCENE_DISCONNECT)
            
            active_api_url = None
            
        except KeyboardInterrupt:
            print("\nKeluar...")
            break
        except Exception as e:
            print(f"\n[ERROR] {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
