"""Testa o contrato HTTP com um runner falso, sem instalar ou simular IA real."""
import http.client
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest

TOOL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('studio_server', TOOL / 'server.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.engine = Path(cls.temp.name)
        (cls.engine / 'run.py').write_text('''import argparse\nfrom pathlib import Path\np=argparse.ArgumentParser();p.add_argument("image");p.add_argument("--output-dir");p.add_argument("--model-save-format");p.add_argument("--mc-resolution");a=p.parse_args()\nout=Path(a.output_dir)/"0";out.mkdir(parents=True);(out/"mesh.glb").write_bytes(b"glTF"+b"x"*24)\n''')
        cls.server = module.StudioServer(('127.0.0.1', 0), cls.engine, sys.executable, [], 10)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.host = f'127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join(); cls.temp.cleanup()

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=15)
        conn.request(method, path, body=body, headers={'Host': self.host, **(headers or {})})
        response = conn.getresponse(); payload = response.read(); status = response.status
        conn.close(); return status, payload

    def test_status_e_arquivos_permitidos(self):
        status, body = self.request('GET', '/api/reconstruct/status')
        self.assertEqual(status, 200); self.assertTrue(json.loads(body)['configured'])
        self.assertEqual(self.request('GET', '/tools/img2glb-studio/')[0], 200)
        self.assertEqual(self.request('GET', '/js/vendor/three.module.js')[0], 200)
        self.assertEqual(self.request('GET', '/.git/HEAD')[0], 404)
        self.assertEqual(self.request('GET', '/tools/img2glb-studio/%2e%2e/%2e%2e/.git/HEAD')[0], 404)
        self.assertEqual(self.request('GET', '/api/reconstruct/status', headers={'Host': 'attacker.test'})[0], 403)

    def test_reconstrucao_e_validacao_de_origem(self):
        image = b'\x89PNG\r\n\x1a\n' + b'data'
        headers = {'Content-Type': 'image/png', 'Origin': f'http://{self.host}', 'Sec-Fetch-Site': 'same-origin'}
        status, body = self.request('POST', '/api/reconstruct', image, headers)
        self.assertEqual(status, 200); self.assertTrue(body.startswith(b'glTF'))
        self.assertEqual(self.request('POST', '/api/reconstruct', b'not an image', headers)[0], 400)
        self.assertEqual(self.request('POST', '/api/reconstruct', image, {**headers, 'Origin': 'https://evil.test'})[0], 403)
        self.assertEqual(self.request('POST', '/api/reconstruct', image, {**headers, 'Sec-Fetch-Site': 'cross-site'})[0], 403)
        self.assertEqual(self.request('POST', '/api/reconstruct', image, {'Content-Type': 'image/png'})[0], 403)
        referer_headers = {'Content-Type': 'image/png', 'Referer': f'http://{self.host}/tools/img2glb-studio/', 'Sec-Fetch-Site': 'same-origin'}
        self.assertEqual(self.request('POST', '/api/reconstruct', image, referer_headers)[0], 200)
        self.assertEqual(self.request('POST', '/api/reconstruct', image, {**referer_headers, 'Referer': 'https://evil.test/'})[0], 403)

    def test_sem_motor_nao_finge_geracao(self):
        previous = self.server.triposr
        try:
            self.server.triposr = None
            status, body = self.request('GET', '/api/reconstruct/status')
            self.assertFalse(json.loads(body)['configured'])
            status, _ = self.request('POST', '/api/reconstruct', b'\x89PNG\r\n\x1a\n', {'Content-Type': 'image/png', 'Origin': f'http://{self.host}'})
            self.assertEqual(status, 503)
        finally:
            self.server.triposr = previous


if __name__ == '__main__':
    unittest.main()
