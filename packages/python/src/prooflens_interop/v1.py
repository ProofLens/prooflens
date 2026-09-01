from __future__ import annotations

import base64
import hashlib
import json
import re
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature

_SHA256 = re.compile(r"^[a-f0-9]{64}$")
_BASE64URL = re.compile(r"^[A-Za-z0-9_-]+$")
_UUID_URN = re.compile(r"^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
_P256_ORDER = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551


def _validate_json(value: Any, path: str = "$") -> None:
    if value is None or isinstance(value, bool):
        return
    if isinstance(value, str):
        try:
            value.encode("utf-8")
        except UnicodeEncodeError as error:
            raise ValueError(f"{path} contains an unpaired surrogate") from error
        return
    if isinstance(value, int) and not isinstance(value, bool):
        if abs(value) > 9_007_199_254_740_991:
            raise ValueError(f"{path} is outside the interoperable integer range")
        return
    if isinstance(value, list):
        for index, entry in enumerate(value):
            _validate_json(entry, f"{path}[{index}]")
        return
    if isinstance(value, dict):
        for key, entry in value.items():
            if not isinstance(key, str):
                raise ValueError(f"{path} contains a non-string key")
            _validate_json(key, f"{path} key")
            _validate_json(entry, f"{path}.{key}")
        return
    raise ValueError(f"{path} contains unsupported JSON data")


def canonicalize(value: Any) -> bytes:
    """RFC 8785 bytes for the integer/string/boolean ProofLens v1 data model."""
    _validate_json(value)
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _exact_keys(value: dict[str, Any], expected: set[str], label: str) -> None:
    if set(value) != expected:
        raise ValueError(f"{label} contains missing or unexpected fields")


def _object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def _unbase64url(value: Any) -> bytes:
    if not isinstance(value, str) or not _BASE64URL.fullmatch(value) or len(value) % 4 == 1:
        raise ValueError("signature.value must be base64url")
    decoded = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    canonical = base64.urlsafe_b64encode(decoded).rstrip(b"=").decode("ascii")
    if canonical != value:
        raise ValueError("signature.value must use canonical base64url")
    return decoded


def _validate_claim(value: Any) -> dict[str, Any]:
    claim = _object(value, "claim")
    _exact_keys(claim, {"version", "claimId", "issuedAt", "creatorKid", "asset", "creator", "edits", "locators"}, "claim")
    if claim["version"] != "1.0" or not isinstance(claim["claimId"], str) or not _UUID_URN.fullmatch(claim["claimId"]):
        raise ValueError("Invalid ProofLens claim version or id")
    if not isinstance(claim["issuedAt"], str) or not isinstance(claim["creatorKid"], str) or not claim["creatorKid"].startswith("https://"):
        raise ValueError("Invalid ProofLens claim timestamp or creator kid")
    asset = _object(claim["asset"], "claim.asset")
    _exact_keys(asset, {"filename", "mime", "bytes", "sha256"}, "claim.asset")
    if asset["mime"] not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValueError("Unsupported asset MIME")
    if not isinstance(asset["bytes"], int) or isinstance(asset["bytes"], bool) or asset["bytes"] < 0:
        raise ValueError("Invalid asset size")
    if not isinstance(asset["sha256"], str) or not _SHA256.fullmatch(asset["sha256"]):
        raise ValueError("Invalid asset digest")
    creator = _object(claim["creator"], "claim.creator")
    _exact_keys(creator, {"displayName", "creditLine", "caption"}, "claim.creator")
    if not all(isinstance(creator[field], str) for field in creator):
        raise ValueError("Invalid creator fields")
    if not isinstance(claim["edits"], list) or not isinstance(claim["locators"], dict):
        raise ValueError("Invalid edits or locators")
    _validate_json(claim)
    return claim


def verify_envelope(envelope_value: Any, public_pem: bytes, asset: bytes | None = None) -> bool:
    try:
        envelope = _object(envelope_value, "envelope")
        _exact_keys(envelope, {"claim", "signature"}, "envelope")
        claim = _validate_claim(envelope["claim"])
        signature = _object(envelope["signature"], "signature")
        _exact_keys(signature, {"alg", "kid", "value"}, "signature")
        if signature["alg"] != "ES256" or signature["kid"] != claim["creatorKid"]:
            return False
        raw = _unbase64url(signature["value"])
        if len(raw) != 64:
            return False
        r = int.from_bytes(raw[:32], "big")
        s = int.from_bytes(raw[32:], "big")
        if not (0 < r < _P256_ORDER and 0 < s <= _P256_ORDER // 2):
            return False
        if asset is not None:
            if claim["asset"]["sha256"] != hashlib.sha256(asset).hexdigest() or claim["asset"]["bytes"] != len(asset):
                return False
        key = serialization.load_pem_public_key(public_pem)
        if not isinstance(key, ec.EllipticCurvePublicKey) or not isinstance(key.curve, ec.SECP256R1):
            return False
        key.verify(encode_dss_signature(r, s), canonicalize(claim), ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, KeyError, TypeError, ValueError):
        return False
