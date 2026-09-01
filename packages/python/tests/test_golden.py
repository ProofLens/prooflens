import base64
import copy
import json
import unittest
from pathlib import Path

from prooflens_interop import canonicalize, verify_envelope


class GoldenVectorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        vector_path = Path(__file__).parents[2] / "claim" / "vectors" / "prooflens-v1-es256.json"
        cls.vector = json.loads(vector_path.read_text("utf-8"))
        cls.asset = base64.b64decode(cls.vector["assetBase64"])
        cls.public_pem = cls.vector["publicPem"].encode("ascii")

    def test_typescript_node_python_vector(self) -> None:
        self.assertTrue(verify_envelope(self.vector["envelope"], self.public_pem, self.asset))
        self.assertEqual(canonicalize(self.vector["envelope"]["claim"]).decode("utf-8"), self.vector["canonicalClaim"])

    def test_rejects_asset_caption_algorithm_and_field_mutations(self) -> None:
        self.assertFalse(verify_envelope(self.vector["envelope"], self.public_pem, self.asset + b"altered"))
        caption = copy.deepcopy(self.vector["envelope"])
        caption["claim"]["creator"]["caption"] = "altered"
        self.assertFalse(verify_envelope(caption, self.public_pem, self.asset))
        algorithm = copy.deepcopy(self.vector["envelope"])
        algorithm["signature"]["alg"] = "none"
        self.assertFalse(verify_envelope(algorithm, self.public_pem, self.asset))
        noncanonical = copy.deepcopy(self.vector["envelope"])
        alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
        value = noncanonical["signature"]["value"]
        noncanonical["signature"]["value"] = value[:-1] + alphabet[alphabet.index(value[-1]) + 1]
        self.assertFalse(verify_envelope(noncanonical, self.public_pem, self.asset))
        field = copy.deepcopy(self.vector["envelope"])
        field["claim"]["unexpected"] = True
        self.assertFalse(verify_envelope(field, self.public_pem, self.asset))


if __name__ == "__main__":
    unittest.main()
