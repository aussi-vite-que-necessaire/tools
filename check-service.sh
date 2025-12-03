#!/bin/bash

echo "🔍 Diagnostic du service Tools API"
echo "===================================="
echo ""

echo "📦 État des conteneurs :"
docker compose ps
echo ""

echo "📋 Derniers logs (50 lignes) :"
docker compose logs --tail=50 tools-api
echo ""

echo "🌐 Test de l'endpoint health :"
curl -s http://localhost:3000/health || echo "❌ Le service ne répond pas sur le port 3000"
echo ""

echo "📚 Test de l'endpoint Swagger JSON :"
curl -s http://localhost:3000/doc/json | head -20 || echo "❌ Swagger JSON non accessible"
echo ""

echo "🔗 URLs disponibles :"
echo "  - Health: http://localhost:3000/health"
echo "  - Swagger UI: http://localhost:3000/doc"
echo "  - Swagger JSON: http://localhost:3000/doc/json"
echo "  - Root: http://localhost:3000/"
echo ""

echo "💡 Pour voir les logs en temps réel :"
echo "   docker compose logs -f tools-api"

