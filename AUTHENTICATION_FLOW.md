# Fluxo de Autenticação e Convite de Usuários

## Visão Geral

O sistema Betel Carpool utiliza um fluxo de convite controlado onde **apenas administradores podem adicionar novos usuários**. Usuários finais não podem criar contas por conta própria.

## Fluxo Completo

### 1. Administrador Convida um Betelita

O administrador acessa a página de Betelitas e clica em "Convidar Usuário", preenchendo:
- Nome completo
- Email
- Sexo (opcional)
- Se é motorista (opcional)
- Se é isento (opcional)
- Congregação (opcional)

**O que acontece:**
1. A função `invite-user` é chamada
2. Um email de convite é enviado pelo Supabase Auth
3. Um **profile é criado na tabela `profiles`** com:
   - `user_id`: `NULL` (ainda não vinculado)
   - `email`: email do convidado
   - Outros dados fornecidos pelo admin
4. O betelita já aparece na lista de betelitas, mas sem acesso ao sistema

### 2. Betelita Recebe o Convite

O betelita recebe um email com um link mágico de convite. Este link pode ser:
- Clicado diretamente no email
- Copiado e colado no WhatsApp ou outro meio
- Compartilhado de qualquer forma

### 3. Primeiro Acesso via Link de Convite

Quando o betelita clica no link pela primeira vez:

**O que acontece:**
1. O Supabase Auth cria automaticamente um `auth.user` com o email
2. O usuário é autenticado automaticamente (não precisa criar senha ainda)
3. O `AuthContext` detecta que há um usuário autenticado mas sem profile vinculado
4. O sistema busca um profile existente com:
   - Mesmo email
   - `user_id` = `NULL`
5. Se encontrar, **vincula o profile ao user** atualizando `user_id`
6. O betelita agora tem acesso completo ao sistema

### 4. Acessos Subsequentes

Após o primeiro acesso, o betelita pode entrar de duas formas:

#### Opção A: Login com Email e Senha
- Na tela de login, digita email e senha
- Funciona normalmente

#### Opção B: Login Social (Google/Apple)
- Clica em "Entrar com Google" ou "Entrar com Apple"
- Se o email for o mesmo do convite, o sistema vincula automaticamente

## Estrutura de Dados

### Tabela `profiles`

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NULL,  -- Pode ser NULL antes do primeiro login
    full_name TEXT NOT NULL,
    email TEXT,  -- Usado para vincular ao user no primeiro login
    sex sex_type,
    is_driver BOOLEAN DEFAULT FALSE,
    is_exempt BOOLEAN DEFAULT FALSE,
    congregation_id UUID,
    -- ... outros campos
);
```

**Estados possíveis:**
- `user_id = NULL`: Betelita convidado mas ainda não aceitou o convite
- `user_id != NULL`: Betelita com acesso ativo ao sistema

## Vantagens deste Fluxo

1. **Controle Total**: Apenas admins podem adicionar pessoas
2. **Dados Pré-cadastrados**: O betelita já aparece no sistema antes de aceitar
3. **Vinculação Automática**: Não precisa preencher dados novamente
4. **Flexibilidade**: Link pode ser compartilhado por qualquer meio
5. **Segurança**: Apenas quem tem acesso ao email pode ativar a conta

## Arquivos Modificados

### Frontend
- [`src/pages/AuthPage.tsx`](src/pages/AuthPage.tsx) - Removida opção de criar conta
- [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) - Lógica de vinculação automática

### Backend
- [`supabase/functions/invite-user/index.ts`](supabase/functions/invite-user/index.ts) - Cria profile sem user_id
- [`supabase/migrations/20260202000000_allow_null_user_id_in_profiles.sql`](supabase/migrations/20260202000000_allow_null_user_id_in_profiles.sql) - Permite user_id NULL

## Casos Especiais

### Betelita já tem conta Google/Apple
Se o betelita já usa o email corporativo em uma conta Google/Apple:
1. Admin envia convite para o email
2. Betelita clica em "Entrar com Google/Apple" na tela de login
3. Sistema vincula automaticamente pelo email

### Email não corresponde
Se o betelita tentar fazer login com um email diferente do convite:
- Um novo profile será criado
- O profile original (convidado) permanecerá sem user_id
- Admin pode deletar o profile duplicado e reenviar convite

### Reenvio de Convite
Se o betelita perder o email:
1. Admin pode clicar em "Reenviar Convite" na lista de betelitas
2. Um novo email é enviado
3. O profile existente é mantido (não duplica)
