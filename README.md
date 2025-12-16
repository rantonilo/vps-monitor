# 🛰️ VPS-Monitor : Sonde de Télémétrie Native (Go)

**VPS-Monitor** est un agent de monitoring système ultra-léger et sécurisé écrit en Go. Conçu spécifiquement pour l'écosystème Linux, il permet de surveiller l'état de santé complet de vos serveurs avec une empreinte mémoire minimale (< 10 Mo de RAM).

---

## ✨ Fonctionnalités Clés

- **⚡ Performance Native** : Développé en Go, compilé en binaire statique sans aucune dépendance externe.
- **📊 Collecte de Données "Deep-Level"** :
    - **CPU** : Charge globale, statistiques par cœur et Load Average (1m, 5m, 15m).
    - **Mémoire** : RAM réelle, Swap, et taux d'utilisation précis.
    - **Stockage** : Monitoring dynamique de toutes les partitions montées.
    - **Réseau** : Trafic (Octets/Paquets) entrant et sortant pour chaque interface.
    - **Santé Système** : Températures des capteurs (si hardware supporté), Uptime et nombre de processus.
- **🛡️ Sécurité de Grade Entreprise** :
    - **Authentification HMAC-SHA256** : Chaque envoi de données est signé avec une clé secrète unique.
    - **Système de Handshake** : Enregistrement sécurisé lors de la première installation via un token unique.
    - **Fichiers de Configuration Sécurisés** : Permissions restreintes (chmod 0600) pour protéger les clés secrètes.

---

## 🏗️ Architecture du Projet

Le projet sépare strictement l'agent (client) du serveur (backend) pour une scalabilité maximale.



```text
.
├── agent/      # La sonde binaire à installer sur les serveurs clients
│   └── main.go
├── server/     # L'API centrale (Backend) de réception et vérification
│   └── server.go
└── go.mod      # Gestion des dépendances (Go Modules)
