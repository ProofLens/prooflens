from __future__ import annotations

import base64
import hashlib
import json
import sys
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))

from prooflens_interop import canonicalize  # noqa: E402

ORDER = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551


def b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


asset = b"prooflens golden fixture\n"
claim = {
    "version": "1.0",
    "claimId": "urn:uuid:1f4d4862-b36f-4ded-9cc9-4b08cb2f8b43",
    "issuedAt": "2026-08-13T12:00:00.000Z",
    "creatorKid": "https://registry.example.test/v1/keys/golden",
    "asset": {
        "filename": "golden.jpg",
        "mime": "image/jpeg",
        "bytes": len(asset),
        "sha256": hashlib.sha256(asset).hexdigest(),
    },
    "creator": {
        "displayName": "Golden Creator",
        "creditLine": "Photo: Golden Creator",
        "caption": "Cross-language vector",
    },
    "edits": [],
    "locators": {},
}
private_key = ec.derive_private_key(1, ec.SECP256R1())
public_key = private_key.public_key()
der = private_key.sign(canonicalize(claim), ec.ECDSA(hashes.SHA256(), deterministic_signing=True))
r, s = decode_dss_signature(der)
if s > ORDER // 2:
    s = ORDER - s
raw = r.to_bytes(32, "big") + s.to_bytes(32, "big")
numbers = public_key.public_numbers()
vector = {
    "assetBase64": base64.b64encode(asset).decode("ascii"),
    "canonicalClaim": canonicalize(claim).decode("utf-8"),
    "publicJwk": {
        "kty": "EC",
        "crv": "P-256",
        "x": b64url(numbers.x.to_bytes(32, "big")),
        "y": b64url(numbers.y.to_bytes(32, "big")),
        "alg": "ES256",
        "use": "sig",
        "key_ops": ["verify"],
        "ext": True,
    },
    "publicPem": public_key.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode("ascii"),
    "envelope": {
        "claim": claim,
        "signature": {"alg": "ES256", "kid": claim["creatorKid"], "value": b64url(raw)},
    },
}
print(json.dumps(vector, indent=2, ensure_ascii=False))
