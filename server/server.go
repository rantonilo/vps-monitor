package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
)

// DB Mock
var mockDB = make(map[string]string)

func generateSecret() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 32)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return string(b)
}

func main() {
	// Endpoint d'enregistrement
	http.HandleFunc("/api/register", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		var payload map[string]interface{}
		if err := json.Unmarshal(body, &payload); err != nil {
			http.Error(w, "Invalid JSON", 400)
			return
		}
		hostname, ok1 := payload["hostname"].(string)
		username, ok2 := payload["username"].(string)
		ip, ok3 := payload["ip"].(string)
		if !ok1 || !ok2 || !ok3 {
			http.Error(w, "Missing fields", 400)
			return
		}
		serverID := fmt.Sprintf("server_%s_%s_%s", hostname, username, ip)
		secretKey := generateSecret()
		mockDB[serverID] = secretKey
		log.Printf("📝 Nouvelle machine enregistrée: %s (User: %s, IP: %s, ID: %s)", hostname, username, ip, serverID)
		json.NewEncoder(w).Encode(map[string]string{
			"server_id":  serverID,
			"secret_key": secretKey,
		})
	})

	// Endpoint des métriques
	http.HandleFunc("/api/metrics", func(w http.ResponseWriter, r *http.Request) {
		serverID := r.Header.Get("X-Server-ID")
		clientSignature := r.Header.Get("X-Signature")

		secret, ok := mockDB[serverID]
		if !ok {
			http.Error(w, "Unauthorized", 403)
			return
		}

		body, _ := io.ReadAll(r.Body)

		// Vérification HMAC
		h := hmac.New(sha256.New, []byte(secret))
		h.Write(body)
		if hex.EncodeToString(h.Sum(nil)) != clientSignature {
			log.Println("❌ Signature invalide !")
			http.Error(w, "Bad Signature", 401)
			return
		}

		// --- AFFICHAGE POUR DEBUG ---
		// On décode dans une map générique pour voir toute la structure
		var debugData map[string]interface{}
		if err := json.Unmarshal(body, &debugData); err != nil {
			log.Println("Erreur JSON:", err)
			return
		}

		// Pretty Print du JSON reçu pour voir tous les détails dans la console
		prettyJSON, _ := json.MarshalIndent(debugData, "", "  ")
		
		fmt.Println("\n------------------------------------------------")
		fmt.Printf("📥 REÇU DE %s :\n", serverID)
		fmt.Println(string(prettyJSON))
		fmt.Println("------------------------------------------------")

		w.WriteHeader(http.StatusOK)
	})

	fmt.Println("🔥 Serveur 'Max Data' démarré sur :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}