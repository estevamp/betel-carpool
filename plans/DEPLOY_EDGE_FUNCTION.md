# Deploy da Edge Function - OneSignal Push Notifications

## Pré-requisitos

1. Supabase CLI instalado
2. Projeto Supabase configurado
3. OneSignal REST API Key (já configurada na função)

## Passos para Deploy

### 1. Instalar Supabase CLI (se ainda não tiver)

```bash
npm install -g supabase
```

### 2. Login no Supabase

```bash
supabase login
```

### 3. Link com seu projeto

```bash
supabase link --project-ref seu-project-ref
```

Para encontrar o `project-ref`:
- Acesse o dashboard do Supabase
- Vá em Settings > General
- Copie o "Reference ID"

### 4. Deploy da Edge Function

```bash
supabase functions deploy send-push-notification
```

### 5. Verificar o Deploy

Após o deploy, você verá uma URL como:
```
https://seu-project-ref.supabase.co/functions/v1/send-push-notification
```

### 6. Testar a Função

Você pode testar a função usando curl:

```bash
curl -X POST \
  'https://seu-project-ref.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer SEU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user-id-aqui",
    "title": "Teste de Notificação",
    "message": "Esta é uma notificação de teste",
    "url": "https://seu-app.com/desocupacao"
  }'
```

Para obter o `ACCESS_TOKEN`:
1. Faça login no seu app
2. Abra o DevTools > Console
3. Execute: `(await supabase.auth.getSession()).data.session.access_token`

## Configuração de Variáveis de Ambiente (Opcional)

Se você quiser mover a REST API Key para variáveis de ambiente:

### 1. Criar arquivo de secrets

```bash
echo "ONESIGNAL_REST_API_KEY=os_v2_app_zmsfclojljcthielewnf4ke6b2ua6pacgb2uhlfqyn7uaeecng7jp3c7hw4lpw63ztxaxlrvovcbqdftxkeagf4dk257vzpgukdhqly" | supabase secrets set --env-file -
```

### 2. Atualizar a função para usar a variável

Modifique `supabase/functions/send-push-notification/index.ts`:

```typescript
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
```

### 3. Re-deploy

```bash
supabase functions deploy send-push-notification
```

## Monitoramento

### Ver logs da função

```bash
supabase functions logs send-push-notification
```

### Ver logs em tempo real

```bash
supabase functions logs send-push-notification --follow
```

## Troubleshooting

### Erro: "Missing authorization header"

- Certifique-se de que está enviando o token de autenticação no header
- Verifique se o usuário está logado

### Erro: "Unauthorized"

- O token pode estar expirado
- Faça login novamente e obtenha um novo token

### Erro: "Failed to send notification"

- Verifique se a REST API Key está correta
- Verifique se o usuário tem um External User ID configurado no OneSignal
- Verifique os logs da função: `supabase functions logs send-push-notification`

### Erro: "CORS"

- A função já está configurada com CORS headers
- Se ainda tiver problemas, verifique se está fazendo a requisição do domínio correto

## Testando no App

1. Faça login no app
2. Vá para a página de Desocupação
3. Crie um carro (você será o motorista)
4. Adicione um passageiro
5. Você deve receber uma notificação push

## Verificar no OneSignal Dashboard

1. Acesse [OneSignal Dashboard](https://app.onesignal.com/)
2. Selecione seu app
3. Vá em **Delivery** > **Messages**
4. Você verá as notificações enviadas

## Comandos Úteis

```bash
# Listar todas as funções
supabase functions list

# Ver detalhes de uma função
supabase functions inspect send-push-notification

# Deletar uma função
supabase functions delete send-push-notification

# Executar localmente (para desenvolvimento)
supabase functions serve send-push-notification
```

## Desenvolvimento Local

Para testar localmente antes do deploy:

```bash
# Iniciar o servidor local
supabase start

# Servir a função localmente
supabase functions serve send-push-notification

# A função estará disponível em:
# http://localhost:54321/functions/v1/send-push-notification
```

## Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Teste a função manualmente com curl
2. ✅ Teste no app adicionando um passageiro
3. ✅ Verifique os logs para garantir que está funcionando
4. ✅ Configure notificações para outros eventos (viagens, ausências, etc.)
5. ✅ Implemente preferências de notificação no perfil do usuário

## Segurança

- ✅ A REST API Key está no servidor (não exposta no frontend)
- ✅ Autenticação via JWT do Supabase
- ✅ Apenas usuários autenticados podem enviar notificações
- ✅ CORS configurado corretamente

## Custos

- Edge Functions do Supabase: Gratuito até 500K invocações/mês
- OneSignal: Gratuito até 10K subscribers
