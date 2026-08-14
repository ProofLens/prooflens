import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[2]
VECTOR = json.loads((ROOT / "claim" / "vectors" / "prooflens-v1-es256.json").read_text("utf-8"))


class CliTest(unittest.TestCase):
    def test_cli_verifies_golden_vector_without_evaluating_c2pa(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            envelope = base / "envelope.json"
            pem = base / "public.pem"
            asset = base / "golden.bin"
            envelope.write_text(json.dumps(VECTOR["envelope"]), "utf-8")
            pem.write_text(VECTOR["publicPem"], "utf-8")
            asset.write_bytes(__import__("base64").b64decode(VECTOR["assetBase64"]))
            completed = subprocess.run(
                [sys.executable, "-m", "prooflens_interop", "verify-envelope", "--envelope", str(envelope), "--asset", str(asset), "--public-pem", str(pem)],
                check=False,
                capture_output=True,
                text=True,
                env={**__import__("os").environ, "PYTHONPATH": str(ROOT / "python" / "src")},
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            payload = json.loads(completed.stdout)
            self.assertTrue(payload["proofLens"]["valid"])
            self.assertFalse(payload["c2pa"]["evaluated"])
            self.assertIn("does not authenticate the human creator", payload["c2pa"]["note"])


if __name__ == "__main__":
    unittest.main()
