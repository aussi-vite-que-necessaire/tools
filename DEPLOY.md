# Guide de Déploiement

Ce document explique comment configurer le déploiement automatique sur le VPS.

## 🔐 Secrets GitHub Requis

Dans les **Settings > Secrets and variables > Actions** de votre repository GitHub, vous devez configurer :

### Secrets (Secrets)
- `VPS_HOST` : L'adresse IP ou le hostname de votre VPS
- `VPS_USER` : Le nom d'utilisateur SSH pour se connecter au VPS
- `VPS_SSH_KEY` : La clé privée SSH pour l'authentification

### Variables (Variables)
- `PROJECT_NAME` : Le nom du projet (ex: `tools-api`)
- `MAIN_DOMAIN` : Le domaine principal (ex: `tools.example.com`)
- `API_URL` (optionnel) : L'URL complète de l'API (ex: `https://api.tools.example.com`)
  - Si non défini, sera construit automatiquement comme `https://api.$MAIN_DOMAIN`

## 🚀 Fonctionnement du Déploiement

Le workflow GitHub Actions (`CI & Deploy`) s'exécute automatiquement :

1. **Sur chaque Pull Request** : Seulement les tests sont exécutés
2. **Sur chaque push vers `main`** : 
   - Les tests sont exécutés
   - Si les tests passent, l'image Docker est construite et poussée vers GHCR
   - L'application est déployée sur le VPS

## 📋 Étapes du Déploiement

1. **Tests** : Linter, typecheck, tests unitaires et E2E
2. **Build Docker** : Construction de l'image et push vers `ghcr.io/$REPO/tools-api:latest`
3. **Déploiement VPS** :
   - Nettoyage du répertoire distant
   - Copie du `docker-compose.yml`
   - Génération du fichier `.env` avec les variables d'environnement
   - Pull de l'image depuis GHCR
   - Démarrage du service avec `docker compose up -d`
   - Vérification de la santé du service

## 🌐 Configuration Traefik

Le `docker-compose.yml` est configuré pour fonctionner avec Traefik. Les labels Traefik sont générés automatiquement avec le domaine configuré dans `DOMAIN_NAME`.

Pour activer Traefik, assurez-vous que :
- Le réseau `web_network` existe sur votre VPS
- Traefik est configuré pour écouter sur ce réseau
- Le domaine pointe vers votre VPS

## 🔍 Vérification du Déploiement

Après le déploiement, vous pouvez vérifier :

```bash
# Sur le VPS
cd ~/apps/$PROJECT_NAME
docker compose ps
docker compose logs tools-api
```

L'API devrait être accessible sur :
- `http://localhost:3000` (directement)
- `https://api.$MAIN_DOMAIN` (via Traefik si configuré)

## 🐛 Dépannage

### Le déploiement échoue
- Vérifiez que les secrets GitHub sont correctement configurés
- Vérifiez que le VPS est accessible via SSH
- Consultez les logs du workflow GitHub Actions

### Le service ne démarre pas
- Vérifiez les logs : `docker compose logs tools-api`
- Vérifiez que Chromium est bien installé dans le conteneur
- Vérifiez les variables d'environnement dans `.env`

### Traefik ne route pas le trafic
- Vérifiez que le réseau `web_network` existe
- Vérifiez que les labels Traefik sont corrects dans `docker compose ps`
- Vérifiez la configuration Traefik

