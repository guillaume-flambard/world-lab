from __future__ import annotations

import json
import mimetypes
import os
import signal
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from world import World


ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
DATA = Path(os.environ.get("WORLD_DATA_DIR", ROOT / "data"))
PORT = int(os.environ.get("PORT", "8000"))
world = World(DATA)


class Handler(BaseHTTPRequestHandler):
    server_version = "WorldLab/0.1"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            state = world.snapshot()
            self.json_response({"ok": state["status"] == "running", "tick": state["tick"], "status": state["status"]})
            return
        if parsed.path == "/api/state":
            self.json_response(world.snapshot())
            return
        if parsed.path == "/api/events":
            query = parse_qs(parsed.query)
            try:
                limit = int(query.get("limit", ["60"])[0])
            except ValueError:
                limit = 60
            self.json_response({"events": world.recent_events(limit)})
            return
        if parsed.path.startswith("/api/being/"):
            being_id = parsed.path.removeprefix("/api/being/")
            being = world.snapshot()["beings"].get(being_id)
            if being is None:
                self.json_response({"error": "unknown being"}, HTTPStatus.NOT_FOUND)
            else:
                self.json_response({"id": being_id, **being})
            return
        path = "index.html" if parsed.path == "/" else parsed.path.lstrip("/")
        target = (STATIC / path).resolve()
        if STATIC.resolve() not in target.parents and target != STATIC.resolve():
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content = target.read_bytes()
        mime = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{mime}; charset=utf-8" if mime.startswith("text/") or mime == "application/javascript" else mime)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def json_response(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string: str, *args: object) -> None:
        print(f"{self.address_string()} {format_string % args}", flush=True)


def main() -> None:
    simulation = threading.Thread(target=world.run, name="world-life", daemon=True)
    simulation.start()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)

    def stop(_signum: int, _frame: object) -> None:
        world.stop()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    print(f"World Lab listening on {PORT}", flush=True)
    try:
        server.serve_forever()
    finally:
        world.stop()
        server.server_close()


if __name__ == "__main__":
    main()

