# 🚗 Carpool Betel

PWA para gerenciamento de caronas de congregações apoiadas por Betel. Organiza viagens, reservas de vagas, controle financeiro e notificações entre os membros.

---

## ✨ Funcionalidades

### Para todos os membros (Betelitas)
- **Dashboard** — agenda de viagens próximas com visualização em modo Agenda ou Timeline
- **Viagens** — criar viagens como motorista, reservar vagas como passageiro, ver viagens passadas
- **Preciso de Carona** — registrar pedido de carona para um dia específico
- **Ausência** — informar período de férias para exclusão do cálculo financeiro
- **Desocupação** — gestão de caronas para eventos especiais
- **Ajuda de Transporte** — visualizar quanto deve pagar/receber no fechamento do mês
- **Perfil** — gerenciar dados pessoais, chave Pix e preferências

### Para administradores de congregação
- **Fechamento do Mês** — fechar período e calcular débitos/créditos automaticamente
- **Betelitas** — cadastrar e gerenciar membros da congregação
- **Configurações** — ajustar valor da viagem, dia de fechamento, janela de bloqueio de edição de viagens

### Para super-admin
- **Congregações** — gerenciar múltiplas congregações (multi-tenant)

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 (plugin `@vitejs/plugin-react-swc`) |
| Roteamento | React Router v6 |
| Estado assíncrono | TanStack Query (React Query v5) |
| UI | shadcn/ui + Radix UI |
| Estilos | Tailwind CSS |
| Animações | Framer Motion |
| Ícones | lucide-react |
| Formulários | React Hook Form + Zod |
| Datas | date-fns (locale `ptBR`) |
| Tema | next-themes (dark mode) |
| Backend / DB | Supabase (PostgreSQL + RLS + Edge Functions) |
| Notificações Push | OneSignal |
| Testes | Vitest + jsdom + Testing Library |

---

## 📁 Estrutura do Projeto

```
├── src/
│   ├── pages/              # Páginas principais da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── ViagensPage.tsx
│   │   ├── FinanceiroPage.tsx
│   │   ├── BetelitasPage.tsx
│   │   ├── AusenciaPage.tsx
│   │   ├── ProcuraVagasPage.tsx
│   │   ├── DesocupacaoPage.tsx
│   │   ├── ConfiguracoesPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── CongregationsPage.tsx
│   │   └── AuthPage.tsx
│   ├── components/         # Componentes reutilizáveis
│   │   ├── layout/         # AppLayout, MobileHeader, AppSidebar
│   │   ├── auth/           # ProtectedRoute
│   │   ├── tour/           # Tour de onboarding (TourOverlay)
│   │   └── ui/             # Componentes shadcn/ui
│   ├── hooks/              # Custom hooks (useTrips, useFinanceiro, useTour, etc.)
│   ├── contexts/           # AuthContext, CongregationContext
│   ├── services/           # oneSignalService
│   ├── integrations/
│   │   └── supabase/       # client.ts, types.ts (gerado automaticamente)
│   └── test/               # Setup de testes
├── supabase/
│   ├── functions/          # Edge Functions (send-push-notification, process-scheduled-notifications)
│   └── migrations/         # Migrações SQL versionadas
└── .github/
    └── workflows/
        └── deploy-functions.yml  # CI/CD — deploy automático das Edge Functions
```

---

## 🗄️ Banco de Dados (Supabase)

Principais tabelas:

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Membros cadastrados |
| `congregations` | Congregações (multi-tenant) |
| `trips` | Viagens agendadas |
| `trip_passengers` | Reservas de vagas |
| `absences` | Períodos de ausência |
| `ride_requests` | Pedidos de carona |
| `evacuation_cars` | Carros para desocupação |
| `evacuation_passengers` | Passageiros em desocupação |
| `transactions` | Transações financeiras por viagem |
| `transfers` | Transferências consolidadas entre membros |
| `settings` | Configurações por congregação |
| `user_roles` | Papéis: `user`, `admin`, `super_admin` |

RLS (Row Level Security) habilitado em todas as tabelas. Funções auxiliares: `is_super_admin()`, `is_congregation_admin()`, `get_current_congregation_id()`, entre outras.

---

## 🚀 Instalação e Desenvolvimento

### Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta no [OneSignal](https://onesignal.com) (opcional para notificações)

### Configuração

1. **Clone o repositório**
   ```bash
   git clone https://github.com/estevamp/betel-carpool.git
   cd betel-carpool
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**

   Crie um arquivo `.env` na raiz do projeto:
   ```env
   VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<sua-anon-key>
   ```

4. **Execute as migrações**
   ```bash
   supabase db push
   ```

5. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:8080`.

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo development |
| `npm run preview` | Pré-visualização do build |
| `npm run lint` | Verificação de lint (ESLint) |
| `npm run test` | Executa os testes uma vez |
| `npm run test:watch` | Executa os testes em modo watch |

---

## 🔔 Notificações Push

As notificações são gerenciadas via **OneSignal**. O fluxo é:

1. O cliente inicializa o SDK do OneSignal via `useOneSignal` hook
2. Notificações pontuais são enviadas via Edge Function `send-push-notification`
3. Notificações agendadas são processadas via `process-scheduled-notifications`, disparada a cada minuto pelo `pg_cron`

---

## ⚙️ CI/CD

O workflow `.github/workflows/deploy-functions.yml` realiza o deploy automático das Edge Functions ao Supabase sempre que há push na branch `main` com alterações em `supabase/functions/**`.

**Secrets necessários no GitHub:**
- `SUPABASE_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`

---

## 🔐 Papéis e Permissões

| Papel | Acesso |
|-------|--------|
| `user` | Funcionalidades do próprio membro |
| `admin` | Gestão da congregação (fechamento, betelitas, configurações) |
| `super_admin` | Acesso total a todas as congregações |

> **Atenção:** O `super_admin` tem `congregation_id = null` no perfil. Todas as queries que filtram por congregação devem usar o padrão `effectiveCongregationId` para evitar bugs de filtragem.

---

## 🌙 Dark Mode

Implementado com `next-themes`. Use o componente `ThemeToggle` para alternar entre os temas claro e escuro. O tema persiste via `localStorage`.

---

## 🧪 Testes

Configurados com **Vitest** + **jsdom** + **Testing Library**.

```bash
npm run test
```

Os arquivos de teste seguem o padrão `*.{test,spec}.{ts,tsx}` dentro de `src/`.

---

## 📄 Licença

Projeto privado — todos os direitos reservados.
