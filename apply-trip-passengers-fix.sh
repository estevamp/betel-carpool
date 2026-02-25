#!/bin/bash
echo "Aplicando correção para remoção de passageiros..."
npx supabase db push
echo ""
echo "Migração aplicada com sucesso!"
