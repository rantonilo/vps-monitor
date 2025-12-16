package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/user"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

// --- CONFIGURATION ---
const (
	API_URL       = "http://localhost:8080"
	CONFIG_FILE   = "agent_config.json"
	TICKER_SECOND = 10 // On réduit à 10s pour les tests (plus réactif)
)

// --- STRUCTURES DE DONNÉES (PAYLOAD COMPLEXE) ---

type AgentConfig struct {
	ServerID  string `json:"server_id"`
	SecretKey string `json:"secret_key"`
}

type RegisterPayload struct {
	InstallToken string `json:"install_token"`
	Hostname     string `json:"hostname"`
	OS           string `json:"os"`
	Arch         string `json:"arch"`
	Username     string `json:"username"`
	IP           string `json:"ip"`
}

// FullMetricPayload : La structure complète envoyée au serveur
type FullMetricPayload struct {
	Timestamp int64 `json:"timestamp"`

	// Système
	Host struct {
		Uptime       uint64  `json:"uptime"`
		Procs        uint64  `json:"procs"`      // Nombre de processus
		Load1        float64 `json:"load_1"`     // Load Average 1min
		Load5        float64 `json:"load_5"`
		Load15       float64 `json:"load_15"`
		Temperatures []Sensor `json:"temperatures"` // Capteurs thermiques
	} `json:"host"`

	// Processeur
	CPU struct {
		GlobalUsage float64   `json:"global_usage"`
		Cores       int       `json:"cores"`
		PerCore     []float64 `json:"per_core"` // Usage par coeur
	} `json:"cpu"`

	// Mémoire
	Memory struct {
		Total       uint64  `json:"total"`
		Used        uint64  `json:"used"`
		UsedPercent float64 `json:"used_percent"`
		SwapTotal   uint64  `json:"swap_total"`
		SwapUsed    uint64  `json:"swap_used"`
	} `json:"memory"`

	// Stockage (Liste des partitions)
	Disks []DiskInfo `json:"disks"`

	// Réseau (Liste des interfaces)
	Network []NetInfo `json:"network"`
}

type DiskInfo struct {
	Path        string  `json:"path"`
	Device      string  `json:"device"`
	Fstype      string  `json:"fstype"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"used_percent"`
}

type NetInfo struct {
	Name        string `json:"name"`          // ex: eth0
	BytesSent   uint64 `json:"bytes_sent"`
	BytesRecv   uint64 `json:"bytes_recv"`
	PacketsSent uint64 `json:"packets_sent"`
	PacketsRecv uint64 `json:"packets_recv"`
	Errors      uint64 `json:"errors"`
}

type Sensor struct {
	Key         string  `json:"key"`
	Temperature float64 `json:"temperature"`
}

// --- FONCTIONS UTILITAIRES ---

func getPublicIP() string {
	resp, err := http.Get("https://api.ipify.org")
	if err != nil {
		log.Println("Erreur récupération IP publique:", err)
		return "unknown"
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return strings.TrimSpace(string(body))
}

// --- FONCTIONS DE COLLECTE ---

func collectFullMetrics() (FullMetricPayload, error) {
	var data FullMetricPayload
	data.Timestamp = time.Now().Unix()

	// 1. HOST & LOAD
	hInfo, _ := host.Info()
	lInfo, _ := load.Avg()
	data.Host.Uptime = hInfo.Uptime
	data.Host.Procs = hInfo.Procs
	data.Host.Load1 = lInfo.Load1
	data.Host.Load5 = lInfo.Load5
	data.Host.Load15 = lInfo.Load15

	// Températures (Attention: Peut être vide sur les VPS cloud)
	sensors, _ := host.SensorsTemperatures()
	for _, s := range sensors {
		data.Host.Temperatures = append(data.Host.Temperatures, Sensor{Key: s.SensorKey, Temperature: s.Temperature})
	}

	// 2. CPU
	cpuPercent, _ := cpu.Percent(0, false)       // Global
	cpuPerCore, _ := cpu.Percent(0, true)        // Par coeur
	data.CPU.GlobalUsage = cpuPercent[0]
	data.CPU.PerCore = cpuPerCore
	data.CPU.Cores = len(cpuPerCore)

	// 3. MEMOIRE
	vMem, _ := mem.VirtualMemory()
	sMem, _ := mem.SwapMemory()
	data.Memory.Total = vMem.Total
	data.Memory.Used = vMem.Used
	data.Memory.UsedPercent = vMem.UsedPercent
	data.Memory.SwapTotal = sMem.Total
	data.Memory.SwapUsed = sMem.Used

	// 4. DISQUES (Toutes les partitions)
	partitions, _ := disk.Partitions(false)
	for _, p := range partitions {
		// Filtre les systèmes de fichiers virtuels inutiles (snap, loop, docker overlay)
		if strings.HasPrefix(p.Device, "/dev/loop") || strings.Contains(p.Mountpoint, "/snap") || strings.Contains(p.Fstype, "squashfs") {
			continue
		}
		
		usage, err := disk.Usage(p.Mountpoint)
		if err == nil {
			data.Disks = append(data.Disks, DiskInfo{
				Path:        p.Mountpoint,
				Device:      p.Device,
				Fstype:      p.Fstype,
				Total:       usage.Total,
				Used:        usage.Used,
				UsedPercent: usage.UsedPercent,
			})
		}
	}

	// 5. RESEAU (Par interface)
	netIO, _ := net.IOCounters(true) // true = per interface
	for _, n := range netIO {
		// On ne garde que les interfaces actives (qui ont du trafic) ou on peut tout garder
		if n.BytesSent == 0 && n.BytesRecv == 0 {
			continue 
		}
		data.Network = append(data.Network, NetInfo{
			Name:        n.Name,
			BytesSent:   n.BytesSent,
			BytesRecv:   n.BytesRecv,
			PacketsSent: n.PacketsSent,
			PacketsRecv: n.PacketsRecv,
			Errors:      n.Errin + n.Errout,
		})
	}

	return data, nil
}

// --- (Le reste : SignPayload et RegisterAgent reste identique au code précédent) ---
// Je remets les fonctions clés pour que le fichier soit complet si copier-coller

func signPayload(data []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(data)
	return hex.EncodeToString(h.Sum(nil))
}

func registerAgent(token string) (*AgentConfig, error) {
	hostInfo, _ := host.Info()
	currentUser, _ := user.Current()
	ip := getPublicIP()
	payload := RegisterPayload{
		InstallToken: token,
		Hostname:     hostInfo.Hostname,
		OS:           hostInfo.Platform,
		Arch:         hostInfo.KernelArch,
		Username:     currentUser.Username,
		IP:           ip,
	}
	jsonData, _ := json.Marshal(payload)
	resp, err := http.Post(API_URL+"/api/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil { return nil, err }
	defer resp.Body.Close()
	if resp.StatusCode != 200 { return nil, fmt.Errorf("erreur code: %d", resp.StatusCode) }
	var config AgentConfig
	if err := json.NewDecoder(resp.Body).Decode(&config); err != nil { return nil, err }
	return &config, nil
}

func main() {
	// Flags
	installToken := flag.String("token", "", "Token d'installation")
	flag.Parse()

	var config AgentConfig

	// Verification Config
	if _, err := os.Stat(CONFIG_FILE); os.IsNotExist(err) {
		if *installToken == "" { log.Fatal("Erreur: --token requis pour la première installation") }
		fmt.Println("⏳ Enregistrement...")
		newConfig, err := registerAgent(*installToken)
		if err != nil { log.Fatal(err) }
		file, _ := json.MarshalIndent(newConfig, "", " ")
		_ = os.WriteFile(CONFIG_FILE, file, 0600)
		config = *newConfig
		fmt.Println("✅ Succès! ID:", config.ServerID)
	} else {
		file, _ := os.ReadFile(CONFIG_FILE)
		_ = json.Unmarshal(file, &config)
		fmt.Println("🚀 Agent redémarré. ID:", config.ServerID)
	}

	// Boucle
	ticker := time.NewTicker(TICKER_SECOND * time.Second)
	defer ticker.Stop()

	for ; true; <-ticker.C {
		// Collecte MAX DATA
		metrics, err := collectFullMetrics()
		if err != nil { log.Println("Erreur collecte:", err); continue }

		jsonData, _ := json.Marshal(metrics)
		signature := signPayload(jsonData, config.SecretKey)

		req, _ := http.NewRequest("POST", API_URL+"/api/metrics", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Server-ID", config.ServerID)
		req.Header.Set("X-Signature", signature)

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil { log.Println("⚠️ Erreur envoi:", err); continue }
		io.Copy(io.Discard, resp.Body) // Flush
		resp.Body.Close()

		if resp.StatusCode == 200 {
			fmt.Printf("📡 Envoyé: Load: %.2f | RAM: %.1f%% | Net: %d interfaces\n", 
				metrics.Host.Load1, metrics.Memory.UsedPercent, len(metrics.Network))
		} else {
			log.Printf("⚠️ Erreur serveur: %d", resp.StatusCode)
		}
	}
}