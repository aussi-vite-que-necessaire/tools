# Tools API

Micro-Monolithe backend API pour workflows n8n - Utilitaires de manipulation PDF et web scraping.

## 🚀 Stack Technique

- **Runtime:** Node.js 20+ ou 22
- **Framework:** Hono v4+ (léger et typé)
- **Validation & Doc:** `@hono/zod-openapi` (validation Zod + génération Swagger automatique)
- **Langage:** TypeScript (configuration stricte)
- **Tests:** Vitest (unitaires + E2E)
- **Libs métier:**
  - `puppeteer` (scraping et screenshots)
  - `pdf-lib` (manipulation, découpage et merge de PDF)

## 📁 Structure du Projet

```
/src
  /lib          # Logique métier pure (fonctions unitaires testables)
    /pdf.ts     # Logique de découpage/merge PDF
    /browser.ts # Logique Puppeteer (singleton browser, etc.)
  /routes       # Définitions de routes OpenAPI (Controllers)
    /pdf.routes.ts
    /scraper.routes.ts
  /index.ts     # Point d'entrée, config Hono, Swagger UI
/tests
  /unit         # Tests unitaires pour /src/lib
  /e2e          # Tests End-to-End qui tapent sur l'API lancée
```

## 🛠️ Installation

### Prérequis

- Node.js 20+ ou 22
- npm ou yarn

### Installation locale

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# L'API sera disponible sur http://localhost:3000
# Documentation Swagger UI: http://localhost:3000/doc
```

## 🐳 Déploiement avec Docker

### Build et lancement

```bash
# Build l'image Docker
docker build -t tools-api .

# Lancer avec docker-compose
docker-compose up -d

# Vérifier les logs
docker-compose logs -f tools-api
```

### Configuration Docker

Le Dockerfile est optimisé pour Puppeteer :
- Installe toutes les dépendances système nécessaires pour Chromium
- Configure les variables d'environnement pour utiliser le Chromium système
- Utilise un utilisateur non-root pour la sécurité
- Inclut un healthcheck

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port d'écoute du serveur | `3000` |
| `NODE_ENV` | Environnement Node.js | `production` |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | Skip le téléchargement de Chromium | `true` |
| `PUPPETEER_EXECUTABLE_PATH` | Chemin vers Chromium système | `/usr/bin/chromium` |
| `API_URL` | URL de base de l'API (pour Swagger) | `http://localhost:3000` |

## 📚 API Endpoints

### Scraper (`/api/scraper`)

#### POST `/api/scraper/screenshot`

Prend une capture d'écran d'une URL.

**Body:**
```json
{
  "url": "https://example.com",
  "fullPage": false,
  "width": 1920,
  "height": 1080
}
```

**Réponse:** Image PNG (buffer)

#### POST `/api/scraper/content`

Extrait le contenu HTML ou texte d'une page.

**Body:**
```json
{
  "url": "https://example.com",
  "format": "html"
}
```

**Réponse:**
```json
{
  "content": "<html>...</html>",
  "format": "html",
  "url": "https://example.com"
}
```

### PDF (`/api/pdf`)

#### POST `/api/pdf/split`

Découpe un PDF page par page et retourne un ZIP.

**Body:** `multipart/form-data` avec un champ `file` contenant le PDF

**Réponse:** Fichier ZIP contenant les pages individuelles (`page-1.pdf`, `page-2.pdf`, etc.)

#### POST `/api/pdf/merge`

Fusionne plusieurs PDFs en un seul.

**Body:** `multipart/form-data` avec un ou plusieurs fichiers PDF dans le champ `files`

**Réponse:** PDF fusionné

### Documentation

- **Swagger UI:** `GET /doc`
- **Swagger JSON:** `GET /doc/json`
- **Health Check:** `GET /health`

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Tests unitaires uniquement
npm run test:unit

# Tests E2E uniquement
npm run test:e2e

# Mode watch
npm run test:watch
```

### Stratégie de Tests

- **Tests Unitaires (`/tests/unit`):** Testent purement les fonctions de `src/lib` sans dépendances externes. Puppeteer est mocké pour les tests unitaires.
- **Tests E2E (`/tests/e2e`):** Testent les endpoints réels de l'API. Ces tests nécessitent que Puppeteer soit disponible (installé dans CI).

## 🔧 Scripts Disponibles

```bash
npm run dev          # Mode développement avec hot-reload
npm run build        # Compile TypeScript
npm run start        # Lance le serveur en production
npm run test         # Lance tous les tests
npm run test:unit    # Tests unitaires uniquement
npm run test:e2e     # Tests E2E uniquement
npm run lint         # Linter ESLint
npm run typecheck    # Vérification TypeScript sans compilation
```

## 🚢 Déploiement sur VPS avec Traefik + Portainer

### Via Portainer

1. Dans Portainer, créez une nouvelle stack
2. Collez le contenu de `docker-compose.yml`
3. Décommentez et configurez les labels Traefik selon votre domaine
4. Déployez la stack

### Labels Traefik (exemple)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.tools-api.rule=Host(`tools-api.yourdomain.com`)"
  - "traefik.http.routers.tools-api.entrypoints=websecure"
  - "traefik.http.routers.tools-api.tls.certresolver=letsencrypt"
  - "traefik.http.services.tools-api.loadbalancer.server.port=3000"
```

## 🔒 Sécurité

- Le conteneur Docker s'exécute avec un utilisateur non-root
- CORS est activé (configurable dans `src/index.ts`)
- Validation stricte des entrées via Zod
- Healthcheck pour monitoring

## 📝 Notes Importantes

### Puppeteer dans Docker

Le Dockerfile installe toutes les dépendances système nécessaires pour Chromium. Si vous rencontrez des problèmes :

1. Vérifiez que `PUPPETEER_EXECUTABLE_PATH` pointe vers `/usr/bin/chromium`
2. Assurez-vous que toutes les dépendances système sont installées
3. Vérifiez les logs Docker pour les erreurs Chromium

### Performance

- Le navigateur Puppeteer est réutilisé entre les requêtes (singleton)
- Les pages sont fermées après chaque utilisation pour éviter les fuites mémoire
- Pour de gros volumes, considérez un pool de navigateurs

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Committez vos changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📄 License

MIT
