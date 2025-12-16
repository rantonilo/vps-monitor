package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

// DB Mock
var mockDB = map[string]string{
	"server_123": "cle_secrete_super_secure_456",
}

func main() {
	// Endpoint d'enregistrement
	http.HandleFunc("/api/register", func(w http.ResponseWriter, r *http.Request) {
		// Simule une création de compte réussie
		log.Println("📝 Nouvelle machine enregistrée !")
		json.NewEncoder(w).Encode(map[string]string{
			"server_id":  "server_123",
			"secret_key": "cle_secrete_super_secure_456",
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