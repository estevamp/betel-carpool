@echo off
REM Script para fazer deploy de todas as Edge Functions do OneSignal
REM Execute com: deploy-onesignal-functions.bat

echo.
echo 🚀 Fazendo deploy das Edge Functions do OneSignal...
echo.

echo 📦 Deploying send-push-notification...
call supabase functions deploy send-push-notification
if %errorlevel% neq 0 (
    echo ❌ Failed to deploy send-push-notification
    exit /b 1
)
echo ✅ send-push-notification deployed successfully
echo.

echo 📦 Deploying send-broadcast-notification...
call supabase functions deploy send-broadcast-notification
if %errorlevel% neq 0 (
    echo ❌ Failed to deploy send-broadcast-notification
    exit /b 1
)
echo ✅ send-broadcast-notification deployed successfully
echo.

echo 📦 Deploying process-scheduled-notifications...
call supabase functions deploy process-scheduled-notifications
if %errorlevel% neq 0 (
    echo ❌ Failed to deploy process-scheduled-notifications
    exit /b 1
)
echo ✅ process-scheduled-notifications deployed successfully
echo.

echo.
echo 🎉 Deploy concluído!
echo.
echo 📋 Próximos passos:
echo 1. Teste o broadcast em /betelitas ^> Notificar Todos
echo 2. Verifique os logs: supabase functions logs send-broadcast-notification --follow
echo 3. Acesse /test-notifications para verificar o status de inscrição
echo.
echo 📚 Documentação completa: ONESIGNAL_DEBUG_GUIDE.md
echo.
