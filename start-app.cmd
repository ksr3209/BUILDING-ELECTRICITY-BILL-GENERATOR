@echo off
cd /d "%~dp0"
echo Building Ledger: http://127.0.0.1:8765
echo Keep this window open while using the app. Press Ctrl+C to stop.
start "" "http://127.0.0.1:8765"
python -m http.server 8765 --bind 127.0.0.1
