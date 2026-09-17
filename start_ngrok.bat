@echo off
:: ============================================
:: NGROK STATIC TUNNEL ke 9Router (localhost:20128)
:: URL PERMANEN - tidak berubah saat restart!
:: ============================================

set NGROK_DOMAIN=unimportantly-pseudoscalar-delpha.ngrok-free.dev

echo Memulai ngrok dengan static domain: %NGROK_DOMAIN%
echo URL tetap: https://%NGROK_DOMAIN%
echo.
echo Tekan Ctrl+C untuk menghentikan
echo ============================================
ngrok http --domain=%NGROK_DOMAIN% 20128
