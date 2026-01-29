
# Plano dos Próximos Passos

## Visão Geral do Estado Atual

O projeto já possui:
- Sistema de autenticação funcionando
- Página de Viagens conectada ao banco de dados com CRUD completo
- Funcionalidade de motoristas gerenciando passageiros

Páginas ainda usando dados mockados (fictícios):
- Betelitas (lista de usuários)
- Ausência (registro de períodos de ausência)
- Procura de Vagas (solicitações de carona)
- Desocupação (plano de evacuação)
- Financeiro (relatórios e transferências)
- FAQ (perguntas frequentes)

---

## Próximos Passos Recomendados

### 1. Conectar a Página de Betelitas ao Banco de Dados
**Prioridade: Alta**

Esta página já possui a estrutura visual pronta, apenas precisa buscar dados reais da tabela `profiles`.

O que será implementado:
- Hook `useBetelitas` para buscar todos os perfis
- Integração com tabela `user_roles` para exibir quem é administrador
- Exibição de informações de cônjuge usando `spouse_id`
- Estados de carregamento (skeleton)
- Filtros funcionais (Todos, Motoristas, Admins)

---

### 2. Conectar a Página de Ausências ao Banco de Dados
**Prioridade: Alta**

A tabela `absences` já existe no banco de dados.

O que será implementado:
- Hook `useAbsences` com operações CRUD
- Dialog para criar nova ausência (datas e notas)
- Integração com perfis para mostrar nomes
- Botão de excluir funcional

---

### 3. Conectar a Página de Procura de Vagas
**Prioridade: Média**

A tabela `ride_requests` já existe para isso.

O que será implementado:
- Hook `useRideRequests` com operações CRUD
- Dialog para solicitar carona (data, notas)
- Botão "Criar Viagem" que redireciona para a página de viagens
- Marcar como atendida quando alguém criar uma viagem para o solicitante

---

### 4. Conectar a Página de Desocupação
**Prioridade: Média**

As tabelas `evacuation_cars` e `evacuation_passengers` já existem.

O que será implementado:
- Hooks para gerenciar carros de evacuação
- Adicionar/remover passageiros nos carros
- Estatísticas de pessoas alocadas

---

### 5. Conectar a Página de FAQ ao Banco de Dados
**Prioridade: Baixa**

A tabela `faq` já existe.

O que será implementado:
- Hook para buscar perguntas/respostas do banco
- Para administradores: funcionalidade de adicionar/editar/remover FAQs

---

### 6. Conectar a Página Financeiro
**Prioridade: Baixa** (depende de ter dados de viagens acumulados)

As tabelas `transactions` e `transfers` já existem.

O que será implementado:
- Cálculo automático de débitos/créditos baseado nas viagens
- Relatório mensal
- Lista de transferências pendentes
- Botão para marcar como pago

---

### 7. Adicionar Administrador ao Sistema
**Prioridade: Alta** (para ter acesso total às funcionalidades)

Será necessário:
- Inserir registro na tabela `user_roles` para seu usuário
- Isso habilitará funcionalidades exclusivas de admin

---

## Recomendação

Sugiro começarmos pelo **item 1 (Betelitas)** ou **item 7 (Adicionar você como admin)**.

Qual você prefere fazer primeiro?

