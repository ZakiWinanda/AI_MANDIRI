@echo off
:: Dijalankan otomatis saat Windows startup
:: Ngrok tunnel background ke 9Router (localhost:20128)
set NGROK_DOMAIN=unimportantly-pseudoscalar-delpha.ngrok-free.dev
start /min "" ngrok http --domain=%NGROK_DOMAIN% 20128
