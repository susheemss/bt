"""
Tiny static file server for the Decision Intelligence dashboard, plus
one custom route that serves the live Excel source file from ANY
absolute path on this server -- it does not have to be inside this
app's folder at all.

The path is read from source_path.txt (one line, plain absolute path,
e.g. C:\\SomeOtherFolder\\output.xlsx) on every request to
/source-data.xlsx, so you can change where it points without
restarting this server -- just edit source_path.txt and click Refresh
in the browser again.

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
CONFIG_FILE = APP_DIR / 'source_path.txt'
SOURCE_ROUTE = '/source-data.xlsx'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def do_GET(self):
        if self.path.split('?')[0] == SOURCE_ROUTE:
            self.serve_source_file()
        else:
            super().do_GET()

    def serve_source_file(self):
        if not CONFIG_FILE.is_file():
            self.send_plain_error(500, f'Config file not found: {CONFIG_FILE}. Create it with the full path to your Excel file on the first line.')
            return
        raw_path = CONFIG_FILE.read_text(encoding='utf-8').strip()
        # Windows "Copy as path" wraps the path in double quotes -- strip
        # them so pasting that straight into the config file just works.
        if len(raw_path) >= 2 and raw_path[0] == '"' and raw_path[-1] == '"':
            raw_path = raw_path[1:-1]
        if not raw_path:
            self.send_plain_error(500, f'{CONFIG_FILE.name} is empty -- put the full path to the Excel file in it.')
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
    configured = CONFIG_FILE.read_text(encoding='utf-8').strip() if CONFIG_FILE.is_file() else '(source_path.txt not found yet)'
    with http.server.ThreadingHTTPServer((BIND, PORT), Handler) as httpd:
        print(f'Serving {APP_DIR} at http://{BIND}:{PORT}/')
        print(f'Live source file route: http://{BIND}:{PORT}{SOURCE_ROUTE}')
        print(f'Currently configured path: {configured}')
        httpd.serve_forever()
