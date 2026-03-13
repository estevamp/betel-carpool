# Atualização do Fluxo de Autenticação

## Objetivo
Implementar um fluxo de autenticação que:
1. Busca profile pelo email (independente de ter user_id)
2. Verifica se tem congregation_id
3. Se não tiver congregation_id → mostra tela de acesso restrito
4. Se tiver congregation_id mas não user_id → cria user_id e continua normalmente

## Mudanças Implementadas

### 1. Frontend - AuthContext.tsx
- **Interface Profile**: Campo `user_id` agora aceita `null`
- **Nova lógica de autenticação**:
  - Busca profile pelo email primeiro (não pelo user_id)
  - Se não encontrar profile → usuário precisa ser convidado
  - Se encontrar profile sem congregation_id → define profile para mostrar tela restrita
  - Se encontrar profile com congregation_id mas sem user_id → vincula user_id automaticamente

### 2. Frontend - ProtectedRoute.tsx
- Detecta quando profile existe mas não tem congregation_id
- Mostra tela de "Acesso Restrito" com instruções para contatar administrador
- Só permite acesso ao conteúdo se profile tiver congregation_id

### 3. Backend - Migration RLS
**Arquivo**: `supabase/migrations/20260206000003_allow_profile_linking_with_congregation.sql`

A migration atualiza a política RLS para permitir que um usuário autenticado vincule seu `user_id` a um profile existente que:
- Tem o mesmo email do usuário
- Não tem user_id (ou tem user_id diferente)
- Pode ter ou não congregation_id

**Política UPDATE**:
```sql
USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
)
WITH CHECK (
    (user_id = auth.uid() AND LOWER(email) = LOWER(public.get_current_user_email()))
    OR public.is_super_admin()
    OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
)
```

## Como Aplicar

### Passo 1: Aplicar a Migration
Execute no Supabase Dashboard ou via CLI:
```bash
# Se estiver usando Supabase CLI local
npx supabase db push

# Ou aplique manualmente no Supabase Dashboard > SQL Editor
```

### Passo 2: Testar o Fluxo

#### Cenário 1: Profile sem congregation_id
1. Admin cria um profile com email mas sem congregation_id
2. Usuário faz login com esse email
3. Sistema mostra tela de "Acesso Restrito"
4. Usuário precisa contatar admin para ser vinculado a uma congregação

#### Cenário 2: Profile com congregation_id mas sem user_id
1. Admin cria um profile com email e congregation_id mas sem user_id
2. Usuário faz login com esse email
3. Sistema automaticamente vincula o user_id ao profile
4. Usuário acessa normalmente a congregação correta

#### Cenário 3: Profile completo
1. Profile já tem email, user_id e congregation_id
2. Usuário faz login
3. Acesso normal

#### Cenário 4: Sem profile
1. Usuário tenta fazer login mas não existe profile com seu email
2. Sistema não permite acesso
3. Usuário precisa ser convidado por um admin

## Logs de Debug

O sistema agora gera logs detalhados:
- `[AuthContext]` - Logs do processo de autenticação
- `[ProtectedRoute]` - Logs da verificação de acesso
- `[fetchProfile]` - Logs da função de refresh do profile

## Troubleshooting

### Erro: "new row violates row-level security policy"
**Causa**: A migration RLS não foi aplicada ou está desatualizada
**Solução**: Aplique a migration `20260206000003_allow_profile_linking_with_congregation.sql`

### Profile não é vinculado automaticamente
**Causa**: Função `get_current_user_email()` pode não estar retornando o email correto
**Solução**: Verifique se a função existe e está retornando o email do JWT:
```sql
SELECT public.get_current_user_email();
```

### Tela de acesso restrito não aparece
**Causa**: Profile pode não estar sendo carregado corretamente
**Solução**: Verifique os logs do console para ver se o profile está sendo encontrado

## Próximos Passos

1. ✅ Aplicar a migration no banco de dados
2. ✅ Testar todos os cenários descritos acima
3. ✅ Verificar logs no console para confirmar o fluxo
4. ✅ Ajustar mensagens de erro se necessário
