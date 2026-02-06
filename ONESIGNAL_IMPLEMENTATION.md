# OneSignal Web Push Notifications - Implementação

## Visão Geral

Este documento descreve a implementação do OneSignal para notificações push web no sistema Carpool Betel. O sistema envia notificações push quando um novo passageiro é adicionado ao carro de um motorista no plano de evacuação.

## Arquivos Criados/Modificados

### 1. `index.html`
- Adicionado o SDK do OneSignal no `<head>`
- Configurado com `appId` e `safari_web_id`
- Habilitado o botão de notificação padrão

### 2. `src/services/oneSignalService.ts`
Serviço singleton para gerenciar todas as interações com OneSignal:
- **initialize()**: Inicializa o OneSignal
- **requestPermission()**: Solicita permissão do usuário para notificações
- **isSubscribed()**: Verifica se o usuário está inscrito
- **getPlayerId()**: Obtém o ID do usuário no OneSignal
- **setExternalUserId()**: Define o ID externo do usuário (ID do Supabase)
- **addTags()**: Adiciona tags para segmentação de usuários
- **notifyPassengerAdded()**: Envia notificação quando passageiro é adicionado

### 3. `src/hooks/useOneSignal.ts`
Hook React para inicializar OneSignal automaticamente:
- Inicializa OneSignal quando o usuário faz login
- Define o ID externo do usuário
- Adiciona tags de segmentação (congregation_id, user_role, full_name)

### 4. `src/hooks/useEvacuation.ts`
Modificado para enviar notificações push:
- Importa `oneSignalService`
- Chama `notifyPassengerAdded()` após adicionar passageiro com sucesso
- Busca informações do motorista e passageiro para a notificação

### 5. `src/App.tsx`
Modificado para inicializar OneSignal:
- Importa e usa o hook `useOneSignal`
- Garante que OneSignal seja inicializado quando o app carrega

### 6. `public/OneSignalSDKWorker.js`
Arquivo do service worker do OneSignal (já copiado para a pasta public)

## Como Funciona

### Fluxo de Inicialização

1. **Carregamento da Página**: O SDK do OneSignal é carregado via `<script>` no `index.html`
2. **Login do Usuário**: Quando o usuário faz login, o hook `useOneSignal` é ativado
3. **Identificação**: O sistema define o ID do usuário no OneSignal usando `setExternalUserId()`
4. **Tags**: Adiciona tags para segmentação (congregação, role, nome)
5. **Permissão**: O botão de notificação aparece para o usuário solicitar permissão

### Fluxo de Notificação

1. **Ação**: Um usuário adiciona um passageiro a um carro
2. **Mutação**: O hook `useEvacuation` executa `addPassengerMutation`
3. **Dados**: Busca informações do motorista e passageiro
4. **Notificação**: Chama `oneSignalService.notifyPassengerAdded()`
5. **Envio**: A notificação é preparada (atualmente apenas logada no console)

## Configuração do Backend (Necessário)

⚠️ **IMPORTANTE**: Para enviar notificações reais, você precisa implementar um endpoint no backend.

### Opção 1: Supabase Edge Function

Crie uma função edge no Supabase:

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ONESIGNAL_APP_ID = "cb24512d-c95a-4533-a08b-259a5e289e0e";
const ONESIGNAL_REST_API_KEY = "YOUR_REST_API_KEY"; // Obter do OneSignal Dashboard

serve(async (req) => {
  try {
    const { userId, title, message, url, data } = await req.json();

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        headings: { en: title },
        contents: { en: message },
        url: url,
        data: data,
      }),
    });

    const result = await response.json();
    
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### Opção 2: Atualizar oneSignalService.ts

Modifique o método `sendNotificationToUser` em `src/services/oneSignalService.ts`:

```typescript
async sendNotificationToUser(
  userId: string,
  options: OneSignalNotificationOptions
): Promise<void> {
  try {
    const response = await fetch('/api/send-push-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: options.title,
        message: options.message,
        url: options.url,
        data: options.data,
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send notification');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}
```

## Obter REST API Key do OneSignal

1. Acesse o [OneSignal Dashboard](https://app.onesignal.com/)
2. Selecione seu app
3. Vá em **Settings** > **Keys & IDs**
4. Copie a **REST API Key**
5. Adicione ao seu arquivo `.env`:
   ```
   ONESIGNAL_REST_API_KEY=your_rest_api_key_here
   ```

## Testando

### 1. Testar Inicialização

Abra o console do navegador e verifique:
```
OneSignal: Push notifications are supported
OneSignal: External user ID set: [user-id]
OneSignal: Tags added: { congregation_id: '...', user_role: '...', full_name: '...' }
```

### 2. Testar Permissão

- Clique no botão de notificação do OneSignal (canto inferior direito)
- Aceite as permissões quando solicitado
- Verifique no console se a permissão foi concedida

### 3. Testar Notificação

1. Faça login como um usuário
2. Vá para a página de Desocupação
3. Crie um carro (você será o motorista)
4. Adicione um passageiro ao seu carro
5. Verifique o console para ver a tentativa de envio da notificação

### 4. Testar no OneSignal Dashboard

1. Acesse o OneSignal Dashboard
2. Vá em **Audience** > **All Users**
3. Verifique se os usuários aparecem com External User IDs
4. Teste enviando uma notificação manual

## Segmentação de Usuários

O sistema adiciona as seguintes tags aos usuários:

- **congregation_id**: ID da congregação do usuário
- **user_role**: Role do usuário (betelita, admin, super_admin)
- **full_name**: Nome completo do usuário

Você pode usar essas tags no OneSignal Dashboard para enviar notificações segmentadas.

## Recursos Adicionais

### Enviar Notificação para Múltiplos Usuários

```typescript
await oneSignalService.sendNotificationToUsers(
  ['user-id-1', 'user-id-2', 'user-id-3'],
  {
    title: 'Título da Notificação',
    message: 'Mensagem da notificação',
    url: '/pagina-destino',
  }
);
```

### Verificar Status de Inscrição

```typescript
const isSubscribed = await oneSignalService.isSubscribed();
if (!isSubscribed) {
  await oneSignalService.requestPermission();
}
```

### Adicionar Tags Personalizadas

```typescript
await oneSignalService.addTags({
  custom_tag: 'valor',
  another_tag: 'outro_valor',
});
```

## Troubleshooting

### Notificações não aparecem

1. Verifique se o usuário deu permissão
2. Verifique se o service worker está registrado (DevTools > Application > Service Workers)
3. Verifique se o backend está enviando as notificações corretamente
4. Verifique os logs no OneSignal Dashboard

### Service Worker não carrega

1. Verifique se `OneSignalSDKWorker.js` está na pasta `public/`
2. Verifique se não há erros no console
3. Limpe o cache do navegador e recarregue

### Usuário não aparece no Dashboard

1. Verifique se `setExternalUserId()` está sendo chamado
2. Verifique se o usuário aceitou as permissões
3. Aguarde alguns minutos para sincronização

## Próximos Passos

1. ✅ Implementar endpoint backend para enviar notificações
2. ✅ Adicionar notificações para outros eventos (viagens, ausências, etc.)
3. ✅ Implementar notificações agendadas
4. ✅ Adicionar preferências de notificação no perfil do usuário
5. ✅ Implementar notificações em grupo (por congregação)

## Documentação Oficial

- [OneSignal Web Push Documentation](https://documentation.onesignal.com/docs/web-push-quickstart)
- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
- [OneSignal React Integration](https://documentation.onesignal.com/docs/react-native-sdk-setup)
