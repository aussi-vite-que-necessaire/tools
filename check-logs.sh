#!/bin/bash
echo "=== État des conteneurs ==="
docker compose ps

echo ""
echo "=== Derniers logs (100 lignes) ==="
docker compose logs --tail=100 tools-api

echo ""
echo "=== Logs en temps réel (Ctrl+C pour arrêter) ==="
echo "Appuyez sur Ctrl+C pour arrêter..."
docker compose logs -f tools-api
