# Profile Linking Debug - iOS Gmail Login Fix

## Problema Identificado
No iOS, ao fazer login com o botão Gmail, o aplicativo ficava preso na tela "Verificando Perfil" indefinidamente.

## Causa Raiz
O problema tinha múltiplas causas:

1. **AuthContext.tsx - Linhas 92-99 e 213-218**: Quando ocorria erro ao vincular o perfil (UPDATE), o código fazia `return` sem definir `isLoading = false`, deixando o app em estado de loading infinito.

2. **AuthContext.tsx - Falta de timeout de segurança**: Não havia mecanismo de fallback caso a busca do perfil demorasse muito ou falhasse silenciosamente.

3. **ProtectedRoute.tsx - Linhas 92-100**: Quando `!profile` mas `!isLoading`, mostrava "Verificando perfil..." sem timeout, criando um loop infinito se o perfil nunca fosse carregado.

4. **AuthPage.tsx - Linha 72-109**: Falta de logs detalhados para debug do fluxo OAuth no iOS.

## Soluções Implementadas

### 1. AuthContext.tsx - Garantir isLoading sempre seja definido
```typescript
// Linha 96-99: Agora define o profile mesmo em caso de erro
if (updateError) {
  console.error("[fetchProfile] Error linking profile to user:", updateError);
  // Set profile anyway so user can see restricted access message if needed
  setProfile(emailProfile as Profile);
  return;
}

// Linha 217-225: Sempre define isLoading = false em caso de erro
if (updateError) {
  console.error("[AuthContext] Error linking profile to user:", updateError);
  console.error("[AuthContext] Update error details:", JSON.stringify(updateError));
  // Set the profile anyway so user doesn't get stuck
  setProfile(emailProfile as Profile);
  setIsAdmin(false);
  setIsSuperAdmin(false);
  setIsLoading(false);
  return;
}
```

### 2. AuthContext.tsx - Timeout de Segurança (15 segundos)
```typescript
// Linha 137-138: Adiciona variável de timeout de segurança
let safetyTimeout: NodeJS.Timeout;

// Linha 275-283: Implementa timeout de 15 segundos
safetyTimeout = setTimeout(() => {
  if (isMounted && isLoading) {
    console.warn('[AuthContext] Safety timeout triggered - forcing isLoading to false after 15s');
    setIsLoading(false);
  }
}, 15000);

// Linha 303: Limpa o timeout no cleanup
clearTimeout(safetyTimeout);
```

### 3. ProtectedRoute.tsx - Timeout de Segurança (10 segundos)
```typescript
// Linha 16-17: Adiciona estado para forçar exibição de erro
const [forceShowNoProfile, setForceShowNoProfile] = useState(false);
const loadingStartTime = useRef<number | null>(null);

// Linha 33-40: Implementa timeout de 10 segundos
if (!isLoading && user && !profile && !forceShowNoProfile) {
  console.log(`[ProtectedRoute] User authenticated but no profile - starting safety timer`);
  safetyTimer = setTimeout(() => {
    console.warn(`[ProtectedRoute] Safety timer triggered - forcing no profile state after 10s`);
    setForceShowNoProfile(true);
  }, 10000);
}

// Linha 94-119: Mostra mensagem de erro após timeout
if (!profile && forceShowNoProfile) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil Não Encontrado</CardTitle>
        <CardDescription>Não foi possível carregar seu perfil</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Você precisa receber um convite de um administrador...</p>
        <Button onClick={signOut}>Sair</Button>
      </CardContent>
    </Card>
  );
}
```

### 4. AuthPage.tsx - Logs Detalhados para Debug
```typescript
// Linha 73-74: Log de início do OAuth
console.log(`[AuthPage] Starting ${provider} sign in...`);

// Linha 80-81: Log do resultado OAuth
console.log(`[AuthPage] OAuth result:`, { redirected: result.redirected, hasError: !!result.error });

// Linha 84-85: Log de redirecionamento
console.log(`[AuthPage] User being redirected to ${provider} login...`);

// Linha 89: Log de erro OAuth
console.error(`[AuthPage] OAuth error:`, result.error);

// Linha 94-95: Log de sucesso OAuth
console.log(`[AuthPage] OAuth success, waiting for auth state change...`);

// Linha 102-103: Log de erro com stack trace
console.error(`[AuthPage] ${provider} auth error:`, error);
console.error(`[AuthPage] Error details:`, error instanceof Error ? error.stack : 'No stack trace');
```

### 5. AuthContext.tsx - Logs Melhorados
```typescript
// Linha 144: Log mais claro
console.error("[AuthContext] User has no email");

// Linha 168-169: Log de erro com detalhes JSON
console.error("[AuthContext] Error details:", JSON.stringify(emailProfileError));

// Linha 170: Log de retry com contador
console.log(`[AuthContext] Retrying profile fetch in 2 seconds (attempt ${attempt}/3)...`);

// Linha 175: Log de mudança de estado
console.log("[AuthContext] Setting isLoading to false after error");

// Linha 254-255: Log de erro com stack trace
console.error("[AuthContext] Unhandled error in fetchProfileWithRetry:", error);
console.error("[AuthContext] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
```

## Fluxo de Proteção Implementado

1. **Primeira Camada (AuthContext)**: 
   - Sempre define `isLoading = false` em todos os caminhos de erro
   - Timeout de 15 segundos força `isLoading = false` se necessário

2. **Segunda Camada (ProtectedRoute)**:
   - Timeout de 10 segundos detecta quando usuário está autenticado mas sem perfil
   - Mostra mensagem de erro clara ao invés de loading infinito

3. **Terceira Camada (Logs)**:
   - Logs detalhados em todos os pontos críticos
   - Stack traces completos para debug de erros
   - Timestamps e contadores de tentativas

## Testes Recomendados

1. **Teste no iOS com Gmail**:
   - Login com conta que tem perfil e congregação ✓
   - Login com conta que tem perfil mas sem congregação ✓
   - Login com conta sem perfil (não convidada) ✓
   - Login com erro de rede/timeout ✓

2. **Verificar Logs**:
   - Abrir console do navegador no iOS
   - Verificar se todos os logs aparecem corretamente
   - Confirmar que timeouts são acionados quando necessário

3. **Testar Timeouts**:
   - Simular delay na resposta do banco de dados
   - Verificar se timeout de 15s no AuthContext funciona
   - Verificar se timeout de 10s no ProtectedRoute funciona

## Arquivos Modificados

1. [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx)
   - Linhas 96-99: Erro de vinculação define profile
   - Linhas 137-138: Adiciona safetyTimeout
   - Linhas 144-175: Logs melhorados e isLoading garantido
   - Linhas 217-225: Erro de vinculação define isLoading = false
   - Linhas 254-255: Logs de erro com stack trace
   - Linhas 275-283: Implementa timeout de segurança de 15s
   - Linha 303: Limpa safetyTimeout

2. [`src/pages/AuthPage.tsx`](src/pages/AuthPage.tsx)
   - Linhas 73-109: Logs detalhados em todo fluxo OAuth

3. [`src/components/auth/ProtectedRoute.tsx`](src/components/auth/ProtectedRoute.tsx)
   - Linhas 16-17: Estado forceShowNoProfile e loadingStartTime
   - Linhas 20-60: Tracking de loading e timeout de 10s
   - Linhas 94-119: Mensagem de erro após timeout

## Notas Importantes

- Os timeouts são progressivos: 15s no AuthContext, depois 10s no ProtectedRoute
- Logs incluem prefixos `[AuthContext]`, `[AuthPage]`, `[ProtectedRoute]` para facilitar debug
- Erros sempre incluem JSON.stringify() ou stack trace quando disponível
- Profile é definido mesmo em caso de erro para permitir mensagens de acesso restrito
