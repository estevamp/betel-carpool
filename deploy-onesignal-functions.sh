#!/bin/bash

# Script para fazer deploy de todas as Edge Functions do OneSignal
# Execute com: bash deploy-onesignal-functions.sh

echo "🚀 Fazendo deploy das Edge Functions do OneSignal..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para deploy com feedback
deploy_function() {
    local func_name=$1
    echo -e "${YELLOW}📦 Deploying ${func_name}...${NC}"
    
    if supabase functions deploy "$func_name"; then
        echo -e "${GREEN}✅ ${func_name} deployed successfully${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ Failed to deploy ${func_name}${NC}"
        echo ""
        return 1
    fi
}

# Deploy das funções
deploy_function "send-push-notification"
deploy_function "send-broadcast-notification"
deploy_function "process-scheduled-notifications"

echo ""
echo -e "${GREEN}🎉 Deploy concluído!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "1. Teste o broadcast em /betelitas > Notificar Todos"
echo "2. Verifique os logs: supabase functions logs send-broadcast-notification --follow"
echo "3. Acesse /test-notifications para verificar o status de inscrição"
echo ""
echo "📚 Documentação completa: ONESIGNAL_DEBUG_GUIDE.md"
