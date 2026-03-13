# Configurações Independentes por Congregação

## Resumo

Implementação de configurações independentes para cada congregação, permitindo que cada admin configure valores específicos para sua congregação sem afetar as demais.

## Mudanças Implementadas

### 1. Banco de Dados

#### Migração: [`20260214230000_add_congregation_to_settings.sql`](supabase/migrations/20260214230000_add_congregation_to_settings.sql)

**Alterações na tabela `settings`:**
- ✅ Adicionado campo `congregation_id` (obrigatório)
- ✅ Removida constraint `UNIQUE(key)` 
- ✅ Adicionada constraint `UNIQUE(key, congregation_id)`
- ✅ Migração automática de dados existentes para todas as congregações
- ✅ Índice criado para melhor performance

**RLS Policies atualizadas:**
- Usuários veem apenas configurações da própria congregação
- Admins podem editar apenas configurações da própria congregação
- Super-admins têm acesso a todas as congregações

**Trigger automático:**
- Quando uma nova congregação é criada, as configurações padrão são inseridas automaticamente

### 2. Frontend

#### Arquivo: [`src/pages/ConfiguracoesPage.tsx`](src/pages/ConfiguracoesPage.tsx)

**Integração com contexto de congregação:**
- Usa `selectedCongregationId` do [`CongregationContext`](src/contexts/CongregationContext.tsx)
- Super-admins veem configurações da congregação selecionada no topo
- Admins regulares veem apenas configurações da própria congregação

**Novos estados gerenciados:**
```typescript
const [tripValue, setTripValue] = useState("15.00");
const [showTransportHelp, setShowTransportHelp] = useState(true);
const [maxPassengers, setMaxPassengers] = useState("4");
```

**Query atualizada:**
- Carrega configurações filtradas por `congregation_id`
- Recarrega automaticamente ao trocar de congregação

**Indicadores visuais:**
- Mostra nome da congregação sendo configurada
- Alerta quando super-admin não tem congregação selecionada
- Campos desabilitados quando não há congregação selecionada

**Proteções:**
- Botão "Salvar" desabilitado sem congregação selecionada
- Reset automático de valores ao trocar de congregação

## Configurações Independentes por Congregação

Cada congregação agora pode configurar independentemente:

### 1. **Notificações Automáticas**
- ✅ Mensagem personalizada
- ✅ Dias da semana para envio
- ✅ Horário de envio
- ✅ Ativar/desativar

### 2. **Ajuda de Transporte**
- ✅ Valor por viagem (ida e volta)
- ✅ Exibir/ocultar módulo financeiro

### 3. **Sistema**
- ✅ Máximo de passageiros por viagem

## Como Usar

### Para Admins Regulares:
1. Acesse a página de Configurações
2. Configure os valores para sua congregação
3. Clique em "Salvar Alterações"

### Para Super-Admins:
1. Selecione a congregação no seletor do topo da página
2. Configure os valores para aquela congregação
3. Troque de congregação para configurar outra
4. Cada congregação mantém suas próprias configurações

## Aplicar Migração

### Windows:
```bash
apply-congregation-settings-migration.bat
```

### Linux/Mac:
```bash
chmod +x apply-congregation-settings-migration.sh
./apply-congregation-settings-migration.sh
```

Ou manualmente:
```bash
supabase db push
```

## Arquitetura

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    CongregationContext                       │
│                  (selectedCongregationId)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   ConfiguracoesPage                          │
│  effectiveCongregationId = isSuperAdmin                      │
│    ? selectedCongregationId                                  │
│    : profile.congregation_id                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Query                              │
│  SELECT * FROM settings                                      │
│  WHERE congregation_id = effectiveCongregationId             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RLS Policies                              │
│  - Filtra por congregation_id do usuário                     │
│  - Super-admins veem todas                                   │
└─────────────────────────────────────────────────────────────┘
```

### Isolamento de Dados

Cada congregação tem seus próprios registros na tabela `settings`:

```sql
-- Congregação A
(key: 'trip_value', value: '15.00', congregation_id: 'uuid-A')
(key: 'max_passengers', value: '4', congregation_id: 'uuid-A')

-- Congregação B  
(key: 'trip_value', value: '20.00', congregation_id: 'uuid-B')
(key: 'max_passengers', value: '5', congregation_id: 'uuid-B')
```

## Benefícios

1. **Autonomia**: Cada congregação configura seus próprios valores
2. **Isolamento**: Mudanças em uma congregação não afetam outras
3. **Flexibilidade**: Super-admins podem gerenciar todas as congregações
4. **Segurança**: RLS garante acesso apenas aos dados permitidos
5. **Escalabilidade**: Fácil adicionar novas configurações no futuro

## Próximos Passos

Para adicionar novas configurações por congregação:

1. Adicione o estado no componente:
```typescript
const [newSetting, setNewSetting] = useState("default");
```

2. Carregue no `useEffect`:
```typescript
const setting = settings.find(s => s.key === "new_setting");
if (setting) setNewSetting(setting.value);
```

3. Salve na mutation:
```typescript
await upsertSetting("new_setting", newSetting, "string");
```

4. Adicione o campo no formulário com `disabled={!effectiveCongregationId}`

## Compatibilidade

- ✅ Mantém compatibilidade com código existente
- ✅ Migração automática de dados
- ✅ Trigger para novas congregações
- ✅ RLS policies atualizadas
