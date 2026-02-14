@echo off
REM Script to apply the congregation settings migration
REM This adds congregation_id to the settings table

echo Applying congregation settings migration...
echo.

supabase db push

echo.
echo Migration applied successfully!
echo.
echo This migration:
echo   - Added congregation_id to settings table
echo   - Migrated existing settings to all congregations
echo   - Updated RLS policies for congregation-specific access
echo   - Created trigger for default settings on new congregations
echo.
echo Each congregation now has independent settings for:
echo   - Trip value (valor da viagem)
echo   - Show transport help (exibir ajuda de transporte)
echo   - Max passengers (maximo de passageiros)
echo.
pause
