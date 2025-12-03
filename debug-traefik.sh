#!/bin/bash

echo "🔍 Diagnostic Traefik pour Tools API"
echo "======================================"
echo ""

echo "📋 Variables d'environnement dans .env :"
if [ -f .env ]; then
  cat .env | grep -E "(PROJECT_NAME|DOMAIN_NAME|API_URL)" || echo "❌ Variables non trouvées dans .env"
else
  echo "❌ Fichier .env non trouvé"
fi
echo ""

echo "🏷️  Labels Traefik appliqués au conteneur :"
docker inspect tools_tools-api 2>/dev/null | jq -r '.[0].Config.Labels | to_entries[] | select(.key | startswith("traefik")) | "\(.key)=\(.value)"' || docker inspect tools_tools-api 2>/dev/null | grep -A 20 '"Labels"' || echo "❌ Impossible de récupérer les labels"
echo ""

echo "🌐 Vérification du réseau web_network :"
docker network inspect web_network 2>/dev/null | jq -r '.[0].Containers | to_entries[] | "\(.value.Name) - \(.value.IPv4Address)"' || echo "⚠️  Réseau web_network non trouvé ou conteneur non connecté"
echo ""

echo "📊 État du conteneur :"
docker compose ps tools-api
echo ""

echo "💡 Pour redémarrer avec les nouvelles variables :"
echo "   docker compose down && docker compose up -d"

