# Fix: RLS Policy Violation ao Adicionar Admin em Congregação

## Problema

Ao tentar adicionar um administrador a uma congregação, ocorria o seguinte erro:

```
Edge function returned 400: Error, {"error":"new row violates row-level security policy for table \"congregation_administrators\""}
```

## Causa Raiz

A edge function [`assign-congregation-admin`](supabase/functions/assign-congregation-admin/index.ts) estava usando o **SUPABASE_ANON_KEY** para fazer operações no banco de dados. Mesmo após validar que o usuário é um super_admin, o anon key ainda precisa passar pelas políticas RLS (Row-Level Security).

A política RLS em [`congregation_administrators`](supabase/migrations/20260201000006_add_congregation_administrators_table.sql:44-47) verifica se o usuário tem a role `super_admin` usando a função `has_role(auth.uid(), 'super_admin')`. No entanto, quando a edge function usa o anon key, o contexto de autenticação não é propagado corretamente para as verificações RLS, causando a violação da política.

## Solução

Alteramos a edge function para usar o **SUPABASE_SERVICE_ROLE_KEY** em vez do anon key. O service role key bypassa as políticas RLS, o que é seguro neste caso porque:

1. A função já valida que o usuário é um super_admin antes de fazer qualquer operação
2. A função já valida que o perfil existe e tem um user_id vinculado
3. O service role key é usado apenas após todas as verificações de autorização

## Mudanças Implementadas

### Arquivo: [`supabase/functions/assign-congregation-admin/index.ts`](supabase/functions/assign-congregation-admin/index.ts)

**Antes:**
```typescript
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  { global: { headers: { Authorization: authHeader } } }
);
```

**Depois:**
```typescript
// Create admin client with service role key to bypass RLS after authorization
const adminClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

Todas as operações subsequentes agora usam `adminClient` em vez de `supabaseClient`:
- Verificação de role do usuário
- Busca de dados do perfil
- Inserção na tabela `user_roles`
- Inserção na tabela `congregation_administrators`

## Como Deployar

Execute o seguinte comando para fazer deploy da edge function corrigida:

```bash
npx supabase functions deploy assign-congregation-admin
```

## Verificação

Após o deploy, teste adicionando um administrador a uma congregação:

1. Faça login como super_admin
2. Vá para a página de Congregações
3. Selecione uma congregação
4. Tente adicionar um administrador que já fez login pelo menos uma vez
5. A operação deve ser concluída com sucesso

## Padrão Similar

Esta mesma abordagem é usada em outras edge functions que precisam fazer operações privilegiadas após validação de autorização:

- [`delete-profile`](supabase/functions/delete-profile/index.ts:36-45) - Usa service role key após validar que o usuário é admin/super_admin
- [`remove-congregation-admin`](supabase/functions/remove-congregation-admin/index.ts) - Deve seguir o mesmo padrão

## Segurança

✅ **Seguro**: A função valida a autorização ANTES de usar o service role key
✅ **Seguro**: Todas as verificações de permissão são feitas explicitamente no código
✅ **Seguro**: O service role key nunca é exposto ao cliente
✅ **Seguro**: A função valida que o perfil tem user_id antes de atribuir role de admin

## Data da Correção

2026-02-11
