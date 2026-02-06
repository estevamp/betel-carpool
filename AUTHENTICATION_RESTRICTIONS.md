# Restrições de Autenticação - Sistema Betel Carpool

## Visão Geral

Este documento descreve as restrições de autenticação implementadas no sistema para garantir que apenas usuários convidados possam acessar a aplicação.

## Fluxo de Autenticação

### 1. Convite de Usuário (Pré-requisito)

Antes de um usuário poder acessar o sistema, um administrador deve:

1. Acessar a página de Betelitas ou usar a função de convite
2. Criar um perfil para o novo usuário com:
   - Email
   - Nome completo
   - Congregação (obrigatório)
   - Outras informações opcionais

Isso cria um registro na tabela `profiles` com o email do usuário, mas sem `user_id` (ainda não vinculado a uma conta auth).

### 2. Tentativa de Login/Signup

Quando um usuário tenta fazer login:

#### Cenário A: Usuário Convidado (Com Perfil)
- ✅ O usuário tem um perfil pré-criado na tabela `profiles`
- ✅ Após autenticação, o `user_id` é vinculado ao perfil existente
- ✅ O usuário pode acessar o sistema normalmente

#### Cenário B: Usuário Não Convidado (Sem Perfil)
- ❌ O usuário NÃO tem um perfil na tabela `profiles`
- ❌ Após autenticação OAuth (Google/Apple), o sistema detecta a ausência de perfil
- ❌ O `ProtectedRoute` bloqueia o acesso e exibe mensagem de erro
- ❌ O usuário é instruído a contatar o coordenador de transportes

#### Cenário C: Usuário Com Perfil Mas Sem Congregação
- ⚠️ O usuário tem um perfil, mas `congregation_id` é NULL
- ⚠️ O `ProtectedRoute` bloqueia o acesso parcialmente
- ⚠️ Mensagem instrui o usuário a contatar o coordenador para completar o cadastro

## Implementação Técnica

### 1. Migration de Banco de Dados

**Arquivo:** `supabase/migrations/20260206000000_block_signup_without_profile.sql`

Cria a função `can_user_signup(email)` que verifica se existe um perfil para o email fornecido.

```sql
CREATE OR REPLACE FUNCTION public.can_user_signup(user_email TEXT)
RETURNS BOOLEAN
```

### 2. ProtectedRoute Component

**Arquivo:** `src/components/auth/ProtectedRoute.tsx`

Implementa três níveis de validação:

1. **Sem autenticação:** Redireciona para `/auth`
2. **Sem perfil:** Exibe tela de "Acesso Negado" (ícone vermelho)
3. **Sem congregação:** Exibe tela de "Acesso Restrito" (ícone amarelo)

### 3. AuthContext

**Arquivo:** `src/contexts/AuthContext.tsx`

- Busca o perfil do usuário após autenticação
- Tenta vincular perfis existentes por email
- Gerencia o estado de autenticação e perfil

## Mensagens de Erro

### Usuário Sem Perfil
```
Acesso Negado
Você não tem um perfil no sistema

Para acessar o sistema, você precisa ser convidado por um administrador.
Entre em contato com o coordenador de transportes da sua congregação 
para que ele crie um convite para você.
```

### Usuário Sem Congregação
```
Acesso Restrito
Você ainda não está vinculado a nenhuma congregação

Para acessar o sistema, você precisa ser vinculado a uma congregação.
Entre em contato com o coordenador de transportes da sua congregação 
para que ele complete seu cadastro.
```

## Visibilidade do Menu "Perfil"

O link para o perfil está visível para **todos os usuários autenticados** na seção inferior do sidebar:

- **Localização:** `src/components/layout/AppSidebar.tsx` (linha 138)
- **Acesso:** Todos os usuários podem ver e editar seu próprio perfil
- **Justificativa:** Permite que usuários visualizem suas informações pessoais

## Fluxo de Convite

### Para Administradores

1. Acesse a página de Betelitas
2. Clique em "Adicionar Betelita" ou "Convidar Usuário"
3. Preencha os dados:
   - Email (obrigatório)
   - Nome completo (obrigatório)
   - Congregação (obrigatório)
   - Sexo, motorista, isento (opcionais)
4. O sistema cria o perfil e envia convite por email (se aplicável)

### Para Usuários Convidados

1. Receba o email de convite (ou seja informado pelo coordenador)
2. Acesse o sistema via link do email ou diretamente
3. Faça login com:
   - Email/senha (se configurado)
   - Google OAuth
   - Apple OAuth
4. O sistema vincula automaticamente seu perfil existente
5. Acesso liberado ao sistema

## Segurança

### Proteções Implementadas

1. ✅ Usuários não convidados não podem acessar o sistema
2. ✅ Usuários sem congregação têm acesso restrito
3. ✅ Validação em múltiplas camadas (DB + Frontend)
4. ✅ Mensagens claras orientando o usuário

### Limitações Conhecidas

1. ⚠️ OAuth (Google/Apple) permite criação de `auth.users` antes da validação
   - **Mitigação:** O `ProtectedRoute` bloqueia acesso imediatamente após login
   - **Impacto:** Usuário não convidado pode criar conta auth, mas não acessa nada

2. ⚠️ Não há trigger direto no `auth.users` para bloquear signup
   - **Motivo:** Supabase não permite triggers customizados em `auth.users`
   - **Solução:** Validação acontece no primeiro acesso via `ProtectedRoute`

## Testes Recomendados

### Teste 1: Usuário Não Convidado
1. Tente fazer login com email não cadastrado
2. Verifique se aparece tela de "Acesso Negado"
3. Verifique se botão "Sair" funciona

### Teste 2: Usuário Convidado Sem Congregação
1. Admin cria perfil sem congregação
2. Usuário faz login
3. Verifique se aparece tela de "Acesso Restrito"

### Teste 3: Usuário Convidado Completo
1. Admin cria perfil com congregação
2. Usuário faz login
3. Verifique se acessa o sistema normalmente

### Teste 4: Vinculação Automática
1. Usuário faz login via Google antes de ser convidado (bloqueado)
2. Admin cria perfil com mesmo email
3. Usuário faz logout e login novamente
4. Verifique se perfil é vinculado automaticamente

## Manutenção

### Adicionar Nova Validação

Para adicionar novas validações de acesso, edite:
- `src/components/auth/ProtectedRoute.tsx`

### Modificar Mensagens

As mensagens estão hardcoded em:
- `src/components/auth/ProtectedRoute.tsx` (linhas 30-90)

### Alterar Lógica de Convite

A lógica de convite está em:
- `supabase/functions/invite-user/index.ts`
