# Guia de Implementação - Sistema Multi-Congregação

## Passo 1: Aplicar as Migrações

Execute as migrações na ordem correta usando o Supabase CLI:

```bash
# Certifique-se de estar no diretório do projeto
cd c:/src/betel-carpool

# Aplicar todas as migrações
supabase db push

# OU aplicar migrações individualmente (se necessário)
supabase migration up
```

### Ordem das Migrações

1. `20260201000003_add_congregations_table.sql` - Cria tabela de congregações
2. `20260201000004_add_super_admin_role.sql` - Adiciona role super_admin
3. `20260201000005_add_congregation_id_to_profiles.sql` - Adiciona congregation_id aos perfis
4. `20260201000006_add_congregation_administrators_table.sql` - Cria tabela de administradores
5. `20260201000007_add_congregation_id_to_data_tables.sql` - Adiciona congregation_id às tabelas de dados
6. `20260201000008_add_congregation_helper_functions.sql` - Cria funções helper
7. `20260201000009_update_rls_policies_for_congregations.sql` - Atualiza políticas RLS
8. `20260201000010_add_auto_congregation_triggers.sql` - Adiciona triggers automáticos

## Passo 2: Migrar Dados Existentes

Após aplicar as migrações, execute o seguinte script SQL no Supabase Dashboard (SQL Editor):

```sql
-- 1. Criar congregação padrão
INSERT INTO public.congregations (name) 
VALUES ('Congregação Principal')
RETURNING id;

-- Copie o ID retornado e substitua '<CONGREGATION_ID>' abaixo

-- 2. Atualizar perfis existentes (exceto Visitante)
UPDATE public.profiles 
SET congregation_id = '<CONGREGATION_ID>'
WHERE congregation_id IS NULL 
AND id != '00000000-0000-0000-0000-000000000001';

-- 3. Atualizar dados existentes
UPDATE public.trips 
SET congregation_id = '<CONGREGATION_ID>' 
WHERE congregation_id IS NULL;

UPDATE public.absences 
SET congregation_id = '<CONGREGATION_ID>' 
WHERE congregation_id IS NULL;

UPDATE public.ride_requests 
SET congregation_id = '<CONGREGATION_ID>' 
WHERE congregation_id IS NULL;

UPDATE public.evacuation_cars 
SET congregation_id = '<CONGREGATION_ID>' 
WHERE congregation_id IS NULL;

UPDATE public.transactions 
SET congregation_id = '<CONGREGATION_ID>' 
WHERE congregation_id IS NULL;

UPDATE public.transfers 
SET congregation_id = '<CONGREGATION_ID>' 
WHERE congregation_id IS NULL;

-- 4. Verificar se há dados sem congregação (opcional)
SELECT 'profiles' as table_name, COUNT(*) as count 
FROM public.profiles 
WHERE congregation_id IS NULL AND id != '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'trips', COUNT(*) FROM public.trips WHERE congregation_id IS NULL
UNION ALL
SELECT 'absences', COUNT(*) FROM public.absences WHERE congregation_id IS NULL
UNION ALL
SELECT 'ride_requests', COUNT(*) FROM public.ride_requests WHERE congregation_id IS NULL
UNION ALL
SELECT 'evacuation_cars', COUNT(*) FROM public.evacuation_cars WHERE congregation_id IS NULL
UNION ALL
SELECT 'transactions', COUNT(*) FROM public.transactions WHERE congregation_id IS NULL
UNION ALL
SELECT 'transfers', COUNT(*) FROM public.transfers WHERE congregation_id IS NULL;
```

## Passo 3: Criar Primeiro Super-Administrador

Execute no Supabase Dashboard (SQL Editor):

```sql
-- Substitua '<USER_ID>' pelo ID do usuário que será super-admin
-- Você pode encontrar o user_id na tabela auth.users

INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID>', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar se foi criado
SELECT u.email, ur.role 
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'super_admin';
```

## Passo 4: Testar Permissões

### Teste 1: Super-Admin pode ver todas as congregações

```sql
-- Execute como super-admin
SELECT * FROM public.congregations;
-- Deve retornar todas as congregações
```

### Teste 2: Usuário regular vê apenas sua congregação

```sql
-- Execute como usuário regular
SELECT * FROM public.profiles;
-- Deve retornar apenas perfis da mesma congregação
```

### Teste 3: Criar nova congregação (apenas super-admin)

```sql
-- Execute como super-admin
INSERT INTO public.congregations (name) 
VALUES ('Nova Congregação');
-- Deve funcionar

-- Execute como usuário regular
INSERT INTO public.congregations (name) 
VALUES ('Outra Congregação');
-- Deve falhar com erro de permissão
```

## Passo 5: Próximas Implementações

### Backend (Supabase Edge Functions)

Criar as seguintes Edge Functions:

1. **`create-congregation`** - Criar nova congregação
2. **`assign-congregation-admin`** - Designar administrador para congregação
3. **`remove-congregation-admin`** - Remover administrador de congregação
4. **`transfer-user-congregation`** - Transferir usuário entre congregações

### Frontend (React/TypeScript)

Criar as seguintes páginas/componentes:

1. **SuperAdminDashboard** - Dashboard principal do super-admin
2. **CongregationsPage** - Listar e gerenciar congregações
3. **CongregationAdminsPage** - Gerenciar administradores de congregações
4. **CongregationSelector** - Componente para super-admin selecionar congregação

### Hooks Personalizados

Criar os seguintes hooks:

1. **`useCongregations`** - Gerenciar congregações
2. **`useCongregationAdmins`** - Gerenciar administradores
3. **`useCurrentCongregation`** - Obter congregação atual do usuário
4. **`useIsSuperAdmin`** - Verificar se usuário é super-admin

## Passo 6: Atualizar Componentes Existentes

### Componentes que precisam ser atualizados:

1. **`BetelitasPage`** - Filtrar betelitas por congregação
2. **`ViagensPage`** - Filtrar viagens por congregação
3. **`AusenciaPage`** - Filtrar ausências por congregação
4. **`ProcuraVagasPage`** - Filtrar pedidos por congregação
5. **`DesocupacaoPage`** - Filtrar carros de evacuação por congregação
6. **`FinanceiroPage`** - Filtrar transações por congregação

### Exemplo de Atualização (BetelitasPage):

```typescript
// Antes
const { data: betelitas } = useBetelitas();

// Depois
const { data: currentUser } = useProfiles();
const { data: betelitas } = useBetelitas({
  congregation_id: currentUser?.congregation_id
});
```

## Passo 7: Adicionar Seletor de Congregação para Super-Admin

No `AppLayout` ou `AppSidebar`, adicionar um seletor de congregação que só aparece para super-admins:

```typescript
const { data: user } = useProfiles();
const isSuperAdmin = useIsSuperAdmin();
const [selectedCongregation, setSelectedCongregation] = useState<string | null>(null);

{isSuperAdmin && (
  <CongregationSelector
    value={selectedCongregation}
    onChange={setSelectedCongregation}
  />
)}
```

## Verificação Final

Após implementar tudo, verifique:

- [ ] Super-admin pode criar congregações
- [ ] Super-admin pode designar administradores
- [ ] Super-admin pode ver dados de todas as congregações
- [ ] Administradores veem apenas dados de sua congregação
- [ ] Usuários regulares veem apenas dados de sua congregação
- [ ] Novos registros são automaticamente associados à congregação do usuário
- [ ] Não há vazamento de dados entre congregações

## Rollback (Se Necessário)

Se precisar reverter as mudanças:

```bash
# Reverter última migração
supabase migration down

# Reverter múltiplas migrações
supabase migration down --count 8
```

## Suporte e Troubleshooting

### Problema: Usuários não conseguem ver dados após migração

**Solução:** Verifique se todos os perfis e dados foram associados a uma congregação:

```sql
SELECT COUNT(*) FROM public.profiles WHERE congregation_id IS NULL;
SELECT COUNT(*) FROM public.trips WHERE congregation_id IS NULL;
```

### Problema: Super-admin não consegue criar congregações

**Solução:** Verifique se o usuário tem a role `super_admin`:

```sql
SELECT * FROM public.user_roles WHERE user_id = '<USER_ID>';
```

### Problema: Políticas RLS bloqueando acesso

**Solução:** Verifique as políticas RLS e funções helper:

```sql
-- Testar função
SELECT public.is_super_admin();
SELECT public.get_current_congregation_id();
```

## Contato

Para dúvidas ou problemas, consulte o arquivo [`ARCHITECTURE_MULTI_CONGREGATION.md`](ARCHITECTURE_MULTI_CONGREGATION.md).
