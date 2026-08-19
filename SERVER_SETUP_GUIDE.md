# Office Server Setup Guide — Decision Intelligence Dashboard

This is the step-by-step guide for getting the dashboard running on your
office server, with the **Refresh** button pulling live data from the
Excel file your other system produces.

---

## What you're deploying

- A dashboard (`index.html`) that runs entirely in the browser.
- A small Python server (`server.py`) that does two jobs: serves the
  dashboard's files, and reads your live Excel file from wherever you
  tell it to (`source_path.txt`) whenever you click **Refresh**.
- No database, no install beyond Python itself, no scheduler — the data
  only refreshes when you click the button.

---

## Prerequisites checklist

- [ ] **Windows server**, with **Python 3.x** installed.
  Check by opening Command Prompt and running:
  ```
  python --version
  ```
  If that fails with "not recognized," install Python from
  [python.org/downloads](https://python.org/downloads) — during install,
  tick **"Add python.exe to PATH"**.
- [ ] **Internet access from the server**, at least the first time it
  loads the page. The dashboard loads two things from the internet:
  the Inter font (Google Fonts — purely cosmetic, safe to lose) and the
  **SheetJS library** (`cdn.sheetjs.com` — this one matters: without it,
  the Refresh button and the Data Hub upload won't work at all). If this
  server has no internet access, tell me and I'll bundle that library
  locally so the whole thing works fully offline.
- [ ] You know the **exact path** where the other system writes its
  Excel output (or you're fine using the default test path for now and
  updating it later).

---

## Step 1 — Copy the files to the server

The minimum set of files needed is:

```
index.html
live_data.js
server.py
start_server.bat
source_path.txt
```

Copying the whole `D:\BT` folder also works and is simpler — the extra
files (pipeline scripts, the React app, sample spreadsheets, etc.) are
just harmless dev leftovers, not required to run.

Put it wherever you like on the server, e.g. `D:\DecisionIntelligence\`.

---

## Step 2 — Point it at your real Excel file

Open **`source_path.txt`** in Notepad and replace the single line with
the full path to the file your other system produces, for example:

```
C:\SupplyChainOutput\latest_demand.xlsx
```

It does **not** need to be inside the app's folder — it can be
anywhere on the server's disk. Save and close.

> You can change this line at any time without restarting the server —
> just save the file and click **Refresh** in the browser again.

---

## Step 3 — Test it manually first

1. Double-click **`start_server.bat`**.
   A console window should open and stay open, showing something like:
   ```
   Serving D:\DecisionIntelligence at http://127.0.0.1:8000/
   Live source file route: http://127.0.0.1:8000/source-data.xlsx
   Currently configured path: C:\SupplyChainOutput\latest_demand.xlsx
   ```
2. On that **same server**, open a browser and go to:
   ```
   http://localhost:8000/index.html
   ```
3. Click the **Refresh** button (top nav bar). You should see a green
   toast confirming the data loaded, and the store selector / charts
   should reflect your file's contents.
4. Leave this working before moving to auto-start — it's much easier to
   debug a path/format problem now than after it's hidden behind
   Windows Startup.

Close the console window (or Ctrl+C in it) to stop the server for now.

---

## Step 4 — Make it start automatically on boot

1. Press **Win + R**, type `shell:startup`, press Enter. This opens your
   Windows Startup folder.
2. Right-click **`start_server.bat`** → **Create shortcut**.
3. Drag that shortcut into the Startup folder window from step 1.
4. Restart the server (or log off and back on) to confirm it starts on
   its own — open `http://localhost:8000/index.html` again without
   manually running the `.bat` file.

No Windows Service, no Task Scheduler, no scheduler of any kind — this
is just "launch this program when the machine starts," same as any
program you'd normally put in your Startup folder.

---

## Day-to-day usage

- Open `http://localhost:8000/index.html` in a browser **on that
  server** whenever you want to view the dashboard. (It's bound to
  `127.0.0.1` on purpose — it will not be reachable from other PCs on
  the office network.)
- Click **Refresh** whenever you want to pull in whatever is currently
  in the Excel file at the configured path.
- You never need to restart the server for normal use — only if you
  edit `server.py` itself.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `'python' is not recognized...` when running the `.bat` | Python isn't installed or isn't on PATH. Reinstall from python.org with "Add to PATH" checked. |
| Refresh shows **"HTTP 404 — File not found at configured path"** | The path in `source_path.txt` is wrong, or the file hasn't been written yet. Double-check it against the real file location. |
| Refresh shows **"HTTP 423 — File is locked/in use"** | The other system currently has the file open while writing it. Wait a few seconds and click Refresh again. |
| Refresh shows **"HTTP 500 — Config file not found"** | `source_path.txt` is missing from the app folder. Recreate it next to `server.py`. |
| Browser console shows `XLSX is not defined` | No internet access to `cdn.sheetjs.com`. Let me know and I'll make the library local so it works offline. |
| Page loads but the Inter font looks off | No internet access to Google Fonts. Cosmetic only — safe to ignore. |
| Can't reach the dashboard from another PC in the office | Expected — it's intentionally locked to the server it runs on. Open it directly on that machine, or use Remote Desktop into it. |
| Need to stop the server | Close its console window, or Ctrl+C inside it. If it was started silently via the Startup shortcut, find `python.exe` (`server.py`) in Task Manager and end it there. |

---

## File reference

| File | Purpose |
|---|---|
| `index.html` | The dashboard itself. |
| `live_data.js` | Default data shown the moment the page loads, before you click Refresh. |
| `server.py` | The small server: serves the dashboard's files, plus the `/source-data.xlsx` route that reads `source_path.txt`. |
| `start_server.bat` | Double-click (or auto-start) entry point — just runs `python server.py`. |
| `source_path.txt` | One line: the full path to your live Excel file. Edit this whenever the source location changes. |
