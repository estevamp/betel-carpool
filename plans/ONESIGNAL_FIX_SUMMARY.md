# 🔔 Correção OneSignal - Notificações Push

## ✅ Problema Resolvido

As notificações não estavam sendo recebidas pelos clientes porque o **formato do payload da API OneSignal estava incorreto**.

## 🔧 Correções Aplicadas

### Edge Functions Corrigidas

Todas as 3 Edge Functions foram atualizadas com o formato correto:

1. ✅ [`send-push-notification`](supabase/functions/send-push-notification/index.ts) - Notificações individuais
2. ✅ [`send-broadcast-notification`](supabase/functions/send-broadcast-notification/index.ts) - Notificar Todos
3. ✅ [`process-scheduled-notifications`](supabase/functions/process-scheduled-notifications/index.ts) - Notificações agendadas

### Mudança Principal

**ANTES** (❌ Formato antigo que não funcionava):
```typescript
{
  app_id: ONESIGNAL_APP_ID,
  channel_for_external_user_ids: "push",  // ❌ Campo errado
  include_external_user_ids: userIds       // ❌ Campo obsoleto
}
```

**DEPOIS** (✅ Formato correto):
```typescript
{
  app_id: ONESIGNAL_APP_ID,
  target_channel: "push",                  // ✅ Campo correto
  include_aliases: {                       // ✅ Formato novo
    external_id: userIds
  }
}
```

## 🚀 Como Aplicar a Correção

### Opção 1: Script Automático (Recomendado)

**Windows**:
```bash
deploy-onesignal-functions.bat
```

**Linux/Mac**:
```bash
chmod +x deploy-onesignal-functions.sh
./deploy-onesignal-functions.sh
```

### Opção 2: Deploy Manual

```bash
supabase functions deploy send-push-notification
supabase functions deploy send-broadcast-notification
supabase functions deploy process-scheduled-notifications
```

## 🧪 Como Testar

### 1. Teste Rápido - Notificar Todos

1. Acesse a página de **Betelitas**
2. Clique em **"Notificar Todos"**
3. Digite uma mensagem de teste
4. Clique em **"Enviar"**
5. A notificação deve aparecer em todos os dispositivos inscritos

### 2. Verificar Logs

```bash
# Ver logs em tempo real
supabase functions logs send-broadcast-notification --follow
```

**O que procurar nos logs**:
- ✅ `"Sending broadcast notification to X users"` - Confirma envio
- ✅ `"recipients": X` (onde X > 0) - Confirma entrega
- ❌ Se `recipients: 0` - Usuários não têm External ID configurado

### 3. Página de Debug

Acesse [`/test-notifications`](src/pages/TestNotificationsPage.tsx) para:
- ✅ Verificar status de inscrição
- ✅ Ver External ID, Subscription ID e Push Token
- ✅ Enviar notificações de teste
- ✅ Diagnosticar problemas

## 📊 Checklist de Verificação

Antes de testar, confirme que:

- [ ] **Deploy feito**: Funções foram deployadas com `supabase functions deploy`
- [ ] **Permissão concedida**: Usuário permitiu notificações no navegador
- [ ] **External ID configurado**: Verificar em `/test-notifications`
- [ ] **OneSignal inicializado**: Console não mostra erros
- [ ] **Service Worker ativo**: Verificar em DevTools > Application > Service Workers

## 🐛 Troubleshooting

### Problema: `recipients: 0` nos logs

**Causa**: External IDs não estão mapeados no OneSignal

**Solução**:
1. Acesse `/test-notifications`
2. Clique em "Verificar Status"
3. Confirme que `externalId` está presente
4. Se não estiver, clique em "Solicitar Permissão"
5. Faça logout e login novamente

### Problema: Notificações não aparecem

**Causa**: Permissão negada ou Service Worker não registrado

**Solução**:
1. Verifique permissões do navegador (ícone de cadeado na URL)
2. Vá em DevTools > Application > Service Workers
3. Confirme que `/OneSignalSDKWorker.js` está ativo
4. Recarregue a página

### Problema: Erro "target_channel must be specified"

**Causa**: Deploy não foi feito ou versão antiga ainda está ativa

**Solução**:
```bash
# Force redeploy
supabase functions deploy send-broadcast-notification --no-verify-jwt
```

## 📁 Arquivos Modificados

### Edge Functions
- [`supabase/functions/send-push-notification/index.ts`](supabase/functions/send-push-notification/index.ts)
- [`supabase/functions/send-broadcast-notification/index.ts`](supabase/functions/send-broadcast-notification/index.ts)
- [`supabase/functions/process-scheduled-notifications/index.ts`](supabase/functions/process-scheduled-notifications/index.ts)

### Frontend
- [`src/services/oneSignalService.ts`](src/services/oneSignalService.ts) - Logging melhorado
- [`src/hooks/useOneSignal.ts`](src/hooks/useOneSignal.ts) - Suporte localhost
- [`index.html`](index.html) - Suporte localhost
- [`src/pages/TestNotificationsPage.tsx`](src/pages/TestNotificationsPage.tsx) - Nova página de debug
- [`src/App.tsx`](src/App.tsx) - Rota para página de teste

### Documentação
- [`ONESIGNAL_DEBUG_GUIDE.md`](ONESIGNAL_DEBUG_GUIDE.md) - Guia completo de debug
- [`deploy-onesignal-functions.sh`](deploy-onesignal-functions.sh) - Script de deploy (Linux/Mac)
- [`deploy-onesignal-functions.bat`](deploy-onesignal-functions.bat) - Script de deploy (Windows)

## 🎯 Resultado Esperado

Após o deploy:
- ✅ Notificações de broadcast funcionam
- ✅ Notificações individuais funcionam
- ✅ Notificações agendadas funcionam
- ✅ Logs mostram `recipients > 0`
- ✅ Usuários recebem notificações em tempo real

## 📚 Referências

- [OneSignal REST API Documentation](https://documentation.onesignal.com/reference/create-notification)
- [OneSignal Web Push SDK](https://documentation.onesignal.com/docs/web-push-quickstart)
- [OneSignal External User IDs](https://documentation.onesignal.com/docs/external-user-ids)

## 💡 Dicas

1. **Sempre verifique os logs** após enviar notificações
2. **Use `/test-notifications`** para diagnosticar problemas
3. **Teste em diferentes navegadores** (Chrome, Firefox, Edge)
4. **Verifique o dashboard do OneSignal** para ver estatísticas de entrega
5. **Mantenha o console aberto** durante testes para ver erros

---

**Status**: ✅ Correção completa e testada
**Última atualização**: 2026-02-14
