# Guia de Debug - OneSignal Push Notifications

## Problema Identificado

As notificações são enviadas para o OneSignal com sucesso, mas não estão sendo recebidas pelos clientes. Este documento explica as possíveis causas e soluções.

## Mudanças Implementadas

### 1. Correção do Payload da API OneSignal

**Arquivos**:
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/send-broadcast-notification/index.ts`

**Problema**: O payload estava usando campos incorretos para a API do OneSignal.

**Solução**: Atualizado para usar o formato correto:

```typescript
const notificationPayload: any = {
  app_id: ONESIGNAL_APP_ID,
  headings: { en: title, pt: title },
  contents: { en: message, pt: message },
  channel_for_external_user_ids: "push",
  include_aliases: {
    external_id: [userId] // ou userIds para múltiplos usuários
  }
};
```

**Mudanças principais**:
- Removido `target_channel` (campo inválido)
- Adicionado `channel_for_external_user_ids: "push"`
- Mudado de `include_external_user_ids` para `include_aliases.external_id`
- Adicionado logging detalhado do payload

### 2. Melhorias no Debug do Frontend

**Arquivo**: `src/services/oneSignalService.ts`

**Adicionado**:
- Verificação se o usuário já está logado antes de chamar `login()` novamente
- Logging detalhado de Subscription ID, Push Token e External ID
- Informações de debug no console para facilitar troubleshooting

### 3. Suporte para Localhost

**Arquivos**: `index.html` e `src/hooks/useOneSignal.ts`

**Adicionado**:
- Suporte para testar notificações em localhost
- Flag `allowLocalhostAsSecureOrigin: true` no init do OneSignal
- Hostnames permitidos: `localhost` e `127.0.0.1`

### 4. Página de Teste

**Arquivo**: `src/pages/TestNotificationsPage.tsx`

**Criado**: Nova página para testar e debugar notificações com:
- Verificação de status de inscrição
- Solicitação de permissão
- Envio de notificações de teste
- Visualização de informações de debug
- Instruções passo a passo

**Acesso**: `/test-notifications`

## Como Testar

### 0. Deploy das Edge Functions Atualizadas

**IMPORTANTE**: Você precisa fazer o deploy das funções atualizadas:

```bash
# Deploy da função de notificação individual
supabase functions deploy send-push-notification

# Deploy da função de broadcast (NOTIFICAR TODOS)
supabase functions deploy send-broadcast-notification
```

### 1. Verificar Inscrição do Usuário

1. Acesse `/test-notifications`
2. Clique em "Verificar Status"
3. Verifique no console e na tela:
   - `externalId`: Deve ser o UUID do usuário do Supabase
   - `pushSubscriptionId`: ID da inscrição no OneSignal
   - `pushToken`: Token do push notification
   - `optedIn`: Deve ser `true`

### 2. Verificar no Dashboard do OneSignal

1. Acesse [OneSignal Dashboard](https://app.onesignal.com/)
2. Vá em "Audience" > "All Users"
3. Procure pelo External User ID (UUID do Supabase)
4. Verifique se:
   - O usuário está subscrito
   - Tem um Push Subscription ID válido
   - O External ID está correto

### 3. Testar Envio de Notificação

1. Na página `/test-notifications`
2. Cole seu User ID no campo "ID do Usuário"
3. Personalize título e mensagem
4. Clique em "Enviar Notificação"
5. Verifique:
   - Console do navegador para erros
   - Logs da Edge Function no Supabase
   - Dashboard do OneSignal para status de entrega

### 4. Verificar Logs da Edge Function

Para notificações individuais:
```bash
supabase functions logs send-push-notification --follow
```

Para broadcast (Notificar Todos):
```bash
supabase functions logs send-broadcast-notification --follow
```

Procure por:
- "Sending broadcast notification to X users" - Mostra quantos usuários receberão
- "Payload:" - Mostra o payload enviado
- "OneSignal response:" - Mostra a resposta da API
- "recipients" - Deve ser maior que 0
- Erros da API do OneSignal

### 5. Testar Broadcast (Notificar Todos)

1. Vá para a página de Betelitas
2. Clique em "Notificar Todos"
3. Digite uma mensagem
4. Clique em "Enviar"
5. Verifique os logs:
   ```bash
   supabase functions logs send-broadcast-notification --follow
   ```
6. Procure por:
   - Número de usuários notificados
   - Campo `recipients` na resposta (deve ser > 0)
   - Erros, se houver

## Checklist de Troubleshooting

### ✅ Frontend

- [ ] OneSignal está inicializado corretamente
- [ ] Usuário concedeu permissão para notificações
- [ ] External ID está definido (user.id do Supabase)
- [ ] Push Subscription ID existe
- [ ] Service Worker está registrado (`/OneSignalSDKWorker.js`)
- [ ] Console não mostra erros do OneSignal

### ✅ Backend

- [ ] `ONESIGNAL_REST_API_KEY` está configurada no Supabase
- [ ] Edge Function está deployada
- [ ] Payload está no formato correto
- [ ] Logs mostram "Notification sent successfully"
- [ ] OneSignal API retorna `recipients > 0`

### ✅ OneSignal Dashboard

- [ ] App ID está correto: `cb24512d-c95a-4533-a08b-259a5e289e0e`
- [ ] Usuário aparece em "All Users"
- [ ] External ID está mapeado corretamente
- [ ] Status da notificação mostra "Delivered"

## Possíveis Causas do Problema

### 1. External ID não está mapeado

**Sintoma**: OneSignal retorna `recipients: 0`

**Solução**:
- Verificar se `OneSignal.login(userId)` foi chamado
- Confirmar que o userId é o mesmo usado no backend
- Verificar no dashboard se o External ID está presente

### 2. Usuário não está subscrito

**Sintoma**: Push Subscription ID é `null`

**Solução**:
- Solicitar permissão novamente
- Verificar se o navegador suporta push notifications
- Verificar se o site está em HTTPS (ou localhost)

### 3. Service Worker não está registrado

**Sintoma**: Notificações não aparecem mesmo com subscription válida

**Solução**:
- Verificar se `/OneSignalSDKWorker.js` está acessível
- Verificar no DevTools > Application > Service Workers
- Recarregar a página e verificar novamente

### 4. Formato do Payload incorreto

**Sintoma**: OneSignal API retorna erro 400

**Solução**:
- Verificar logs da Edge Function
- Confirmar que está usando `include_aliases.external_id`
- Verificar se `channel_for_external_user_ids` está presente

### 5. Permissões do navegador

**Sintoma**: Notificações não aparecem mesmo com tudo configurado

**Solução**:
- Verificar configurações de notificação do navegador
- Verificar se o site não está em modo "Não perturbe"
- Testar em outro navegador

## Comandos Úteis

### Deploy das Edge Functions

```bash
# Deploy individual
supabase functions deploy send-push-notification

# Deploy broadcast
supabase functions deploy send-broadcast-notification

# Deploy ambas
supabase functions deploy send-push-notification && supabase functions deploy send-broadcast-notification
```

### Ver Logs em Tempo Real

```bash
# Logs de notificação individual
supabase functions logs send-push-notification --follow

# Logs de broadcast
supabase functions logs send-broadcast-notification --follow
```

### Testar Edge Function Localmente

```bash
supabase functions serve send-push-notification
```

## Referências

- [OneSignal Web Push SDK](https://documentation.onesignal.com/docs/web-push-quickstart)
- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
- [OneSignal External User IDs](https://documentation.onesignal.com/docs/external-user-ids)

## Próximos Passos

1. **FAÇA O DEPLOY DAS FUNÇÕES ATUALIZADAS**:
   ```bash
   supabase functions deploy send-broadcast-notification
   ```

2. Acesse `/test-notifications` e verifique o status

3. Teste o broadcast:
   - Vá para Betelitas
   - Clique em "Notificar Todos"
   - Envie uma mensagem de teste

4. Verifique os logs:
   ```bash
   supabase functions logs send-broadcast-notification --follow
   ```

5. Procure por:
   - "Sending broadcast notification to X users"
   - "recipients" na resposta (deve ser > 0)
   - Erros da API do OneSignal

6. Se ainda não funcionar, compartilhe:
   - Screenshot das informações de debug da página `/test-notifications`
   - Logs completos da Edge Function
   - Screenshot do dashboard do OneSignal mostrando os usuários
   - Número de usuários na congregação vs número de recipients
