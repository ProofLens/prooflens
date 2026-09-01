from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

from .v1 import canonicalize, verify_envelope


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text("utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="prooflens-interop",
        description="ProofLens creator-envelope interoperability. C2PA signing/verification is not performed here.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    verify = sub.add_parser("verify-envelope", help="Verify a ProofLens creator envelope against an asset")
    verify.add_argument("--envelope", required=True)
    verify.add_argument("--asset", required=True)
    verify.add_argument("--public-pem", required=True)

    canon = sub.add_parser("canonicalize", help="RFC 8785 canonicalize a JSON value")
    canon.add_argument("--json", required=True)

    digest = sub.add_parser("hash-asset", help="SHA-256 and byte length for detached binding")
    digest.add_argument("--asset", required=True)

    args = parser.parse_args(argv)
    if args.command == "verify-envelope":
        envelope = _load_json(Path(args.envelope))
        asset = Path(args.asset).read_bytes()
        valid = verify_envelope(envelope, Path(args.public_pem).read_bytes(), asset)
        json.dump(
            {
                "proofLens": {"valid": valid, "layer": "creator-identity"},
                "c2pa": {
                    "evaluated": False,
                    "note": "Python interoperability verifies ProofLens creator envelopes only. Canonical C2PA signing remains Node-based and does not authenticate the human creator.",
                },
            },
            sys.stdout,
        )
        sys.stdout.write("\n")
        return 0 if valid else 1
    if args.command == "canonicalize":
        sys.stdout.write(canonicalize(_load_json(Path(args.json))).decode("utf-8"))
        sys.stdout.write("\n")
        return 0
    asset = Path(args.asset).read_bytes()
    json.dump({"sha256": hashlib.sha256(asset).hexdigest(), "bytes": len(asset)}, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
