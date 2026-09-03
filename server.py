"""
Tiny static file server for the Decision Intelligence dashboard, plus
two custom routes that each serve a live Excel source file from ANY
absolute path on this server -- neither has to be inside this app's
folder at all.

  /source-data.xlsx           <- path in source_path.txt            (demand)
  /source-data-inventory.xlsx <- path in source_path_inventory.txt  (inventory)

Each path is read from its config file on every request, so you can
change where either one points without restarting this server -- just
edit the .txt file and click Refresh in the browser again.

Everything else (index.html, live_data.js, etc.) is served normally
from this folder, exactly like `python -m http.server` did before.

Run:   python server.py
Stop:  close this window / Ctrl+C
Bound to 127.0.0.1 only -- reachable only from a browser on this same
server, not from other PCs on the network.
"""
import http.server
from pathlib import Path

PORT = 8000
BIND = '127.0.0.1'
APP_DIR = Path(__file__).parent

ROUTES = {
    '/source-data.xlsx':           APP_DIR / 'source_path.txt',
    '/source-data-inventory.xlsx': APP_DIR / 'source_path_inventory.txt',
    '/source-data-sensing.xlsx':   APP_DIR / 'source_path_sensing.txt',
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def do_GET(self):
        route = self.path.split('?')[0]
        if route in ROUTES:
            self.serve_configured_file(ROUTES[route])
        else:
            super().do_GET()

    def serve_configured_file(self, config_file):
        if not config_file.is_file():
            self.send_plain_error(500, f'Config file not found: {config_file}. Create it with the full path to your Excel file on the first line.')
            return
        raw_path = config_file.read_text(encoding='utf-8').strip()
        # Windows "Copy as path" wraps the path in double quotes -- strip
        # them so pasting that straight into the config file just works.
        if len(raw_path) >= 2 and raw_path[0] == '"' and raw_path[-1] == '"':
            raw_path = raw_path[1:-1]
        if not raw_path:
            self.send_plain_error(500, f'{config_file.name} is empty -- put the full path to the Excel file in it.')
            return
        source_path = Path(raw_path)
        if not source_path.is_file():
            self.send_plain_error(404, f'File not found at configured path: {source_path}')
            return
        try:
            data = source_path.read_bytes()
        except PermissionError:
            self.send_plain_error(423, f'File is locked/in use, could not read: {source_path}')
            return
        except OSError as e:
            self.send_plain_error(500, f'Could not read file: {e}')
            return
        self.send_response(200)
        self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def send_plain_error(self, code, message):
        body = message.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer((BIND, PORT), Handler) as httpd:
        print(f'Serving {APP_DIR} at http://{BIND}:{PORT}/')
        for route, cfg in ROUTES.items():
            configured = cfg.read_text(encoding='utf-8').strip() if cfg.is_file() else f'({cfg.name} not found yet)'
            print(f'  {route}  <-  {configured}')
        httpd.serve_forever()
