#!/usr/bin/env python3
"""Servidor local opcional para reconstrução por IA com o TripoSR oficial.

A inferência é executada apenas quando solicitada, com arquivo temporário e
sem shell. A saída da IA é uma malha estática, separada do rig procedural.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
TOOL = Path(__file__).resolve().parent
MAX_IMAGE = 12 * 1024 * 1024
MAX_GLB = 80 * 1024 * 1024


class StudioServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, triposr, python, allowed_hosts, timeout=900):
        super().__init__(address, StudioHandler)
        self.triposr = Path(triposr).expanduser().resolve() if triposr else None
        self.python = Path(python).expanduser().resolve() if python else None
        self.allowed_hosts = {x.lower() for x in allowed_hosts}
        self.timeout = timeout
        self.job_lock = threading.Lock()

    def configured(self):
        return bool(self.triposr and (self.triposr / 'run.py').is_file()
                    and self.python and self.python.is_file() and os.access(self.python, os.X_OK))


class StudioHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def valid_host(self):
        host = self.headers.get('Host', '').lower()
        port = self.server.server_port
        return host in {f'localhost:{port}', f'127.0.0.1:{port}'} | self.server.allowed_hosts

    def same_origin(self):
        host = self.headers.get('Host', '').lower()
        origin_header = self.headers.get('Origin', '')
        site = self.headers.get('Sec-Fetch-Site', '')
        # Chromium pode omitir Origin em fetch same-origin. Só aceitamos o
        # Referer como fallback com Sec-Fetch-Site explicitamente same-origin.
        source = urlsplit(origin_header or self.headers.get('Referer', ''))
        if not origin_header and site != 'same-origin':
            return False
        if origin_header and (source.path not in ('', '/') or source.query or source.fragment):
            return False
        return (source.scheme in ('http', 'https') and source.netloc.lower() == host
                and site in ('', 'same-origin', 'none'))

    def respond_json(self, code, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if not self.valid_host():
            self.send_error(403, 'Host não permitido')
            return
        path = unquote(urlsplit(self.path).path)
        if path == '/api/reconstruct/status':
            self.respond_json(200, {'configured': self.server.configured(), 'engine': 'TripoSR',
                                    'animated': False})
            return
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/tools/img2glb-studio/')
            self.end_headers()
            return
        # A biblioteca compartilhada é a única parte do jogo servida pelo backend.
        allowed_three = {'/js/vendor/three.module.js', '/js/vendor/three.core.js'}
        if path in allowed_three:
            return super().do_GET()
        if not path.startswith('/tools/img2glb-studio/'):
            self.send_error(404)
            return
        suffix = path[len('/tools/img2glb-studio/'):]
        if not suffix:
            self.path = '/tools/img2glb-studio/index.html'
            return super().do_GET()
        target = (TOOL / suffix).resolve()
        if (not target.is_relative_to(TOOL) or any(p.startswith('.') for p in Path(suffix).parts)
                or not target.is_file() or target.suffix.lower() not in {'.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg'}):
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        # Evita uma rota alternativa sem as mesmas verificações do GET.
        self.send_error(405)

    def do_POST(self):
        if not self.valid_host() or not self.same_origin():
            self.respond_json(403, {'error': 'Origem não permitida.'})
            return
        if urlsplit(self.path).path != '/api/reconstruct':
            self.respond_json(404, {'error': 'Rota não encontrada.'})
            return
        if not self.server.configured():
            self.respond_json(503, {'error': 'Configure o TripoSR e o Python do ambiente. Consulte o README.'})
            return
        mime = self.headers.get_content_type()
        try:
            length = int(self.headers.get('Content-Length', ''))
        except ValueError:
            length = 0
        if mime not in ('image/png', 'image/jpeg') or not 0 < length <= MAX_IMAGE:
            self.respond_json(400, {'error': 'Envie um PNG ou JPG de até 12 MiB.'})
            return
        if not self.server.job_lock.acquire(blocking=False):
            self.respond_json(409, {'error': 'Já existe uma reconstrução em andamento.'})
            return
        lock_held = True
        try:
            self.connection.settimeout(30)
            image = self.rfile.read(length)
            self.connection.settimeout(None)
            magic = image.startswith(b'\x89PNG\r\n\x1a\n') if mime == 'image/png' else image.startswith(b'\xff\xd8\xff')
            if len(image) != length or not magic:
                self.respond_json(400, {'error': 'Imagem inválida ou incompleta.'})
                return
            with tempfile.TemporaryDirectory(prefix='img2glb-') as temp:
                temp = Path(temp)
                source = temp / ('input.png' if mime == 'image/png' else 'input.jpg')
                source.write_bytes(image)
                out = temp / 'output'
                command = [str(self.server.python), str(self.server.triposr / 'run.py'), str(source),
                           '--output-dir', str(out), '--model-save-format', 'glb', '--mc-resolution', '192']
                try:
                    with (temp / 'engine.log').open('wb') as log:
                        completed = subprocess.run(command, cwd=self.server.triposr, stdin=subprocess.DEVNULL,
                                                   stdout=log, stderr=subprocess.STDOUT, timeout=self.server.timeout,
                                                   check=False)
                except subprocess.TimeoutExpired:
                    self.respond_json(504, {'error': 'A reconstrução excedeu o tempo limite.'})
                    return
                except OSError:
                    self.respond_json(500, {'error': 'Não foi possível iniciar o TripoSR. Confira o ambiente local.'})
                    return
                result = out / '0' / 'mesh.glb'
                if completed.returncode or not result.is_file():
                    try:
                        tail = (temp / 'engine.log').read_text(encoding='utf-8', errors='replace')[-6000:]
                        print(f'TripoSR falhou:\n{tail}', file=sys.stderr, flush=True)
                    except OSError:
                        pass
                    self.respond_json(500, {'error': 'O TripoSR falhou. Confira dependências, GPU, pesos e acesso à rede no terminal.'})
                    return
                if result.stat().st_size > MAX_GLB or result.stat().st_size < 20:
                    self.respond_json(500, {'error': 'O GLB gerado é inválido ou excede 80 MiB.'})
                    return
                data = result.read_bytes()
                if not data.startswith(b'glTF'):
                    self.respond_json(500, {'error': 'O resultado do TripoSR não é um GLB válido.'})
                    return
                self.server.job_lock.release(); lock_held = False
                self.send_response(200)
                self.send_header('Content-Type', 'model/gltf-binary')
                self.send_header('Content-Length', str(len(data)))
                self.send_header('Cache-Control', 'no-store')
                self.send_header('X-Content-Type-Options', 'nosniff')
                self.end_headers()
                self.wfile.write(data)
        finally:
            if lock_held:
                self.server.job_lock.release()


def main():
    parser = argparse.ArgumentParser(description='Img2GLB Studio + TripoSR local')
    parser.add_argument('--host', default='127.0.0.1', help='Bind local por padrão. Não exponha na internet pública.')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--triposr', default=os.environ.get('TRIPOSR_DIR'), help='Diretório do checkout oficial do TripoSR')
    parser.add_argument('--python', default=os.environ.get('TRIPOSR_PYTHON', sys.executable), help='Python do ambiente com dependências do TripoSR')
    parser.add_argument('--allow-host', action='append', default=[], help='Host:porta adicional confiável para proxy local; use somente em rede protegida')
    parser.add_argument('--timeout', type=int, default=900, help='Tempo máximo de inferência em segundos')
    args = parser.parse_args()
    with StudioServer((args.host, args.port), args.triposr, args.python, args.allow_host, args.timeout) as server:
        print(f'Img2GLB Studio em http://{args.host}:{server.server_port}/ — TripoSR configurado: {server.configured()}', flush=True)
        server.serve_forever()


if __name__ == '__main__':
    main()
