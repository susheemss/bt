@echo off
REM ─────────────────────────────────────────────────────────────
REM  Starts the Decision Intelligence dashboard (server.py — a small
REM  static file server plus one custom route that reads the Excel
REM  source file from wherever source_path.txt points, anywhere on
REM  this server's disk).
REM
REM  Bound to 127.0.0.1 (localhost) only — reachable ONLY from a
REM  browser opened on this same server, not from any other PC on
REM  the office network.
REM
REM  Before starting: edit source_path.txt to the full path of your
REM  Excel file on this server (it does not need to be in this folder).
REM
REM  To view the dashboard: open http://localhost:8000/index.html
REM  in a browser on this server.
REM ─────────────────────────────────────────────────────────────
cd /d "%~dp0"
python server.py
