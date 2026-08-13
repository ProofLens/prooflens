# ProofLens Signer CLI — Day-2 (demo manifests + verify)
import argparse, os, json, hashlib, datetime, uuid, mimetypes, sys

APP = "prooflens-sign"
VERSION = "0.0.2-dev"

def sha256_bytes(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def read_dev_key_id():
    path = os.path.join(".prooflens", "dev_keys.json")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("key_id", "none")
        except Exception:
            return "none"
    return "none"

def cmd_init_keys(_):
    store = {
        "key_id": str(uuid.uuid4()),
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
        "note": "DEV KEYS for demo only. Not cryptographic."
    }
    os.makedirs(".prooflens", exist_ok=True)
    out = os.path.join(".prooflens", "dev_keys.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2)
    print(f"[ok] wrote {out}")

def cmd_sign(args):
    if not os.path.exists(args.input):
        raise SystemExit(f"[err] input not found: {args.input}")
    outdir = args.output or os.path.dirname(os.path.abspath(args.input)) or "."
    os.makedirs(outdir, exist_ok=True)

    mime, _ = mimetypes.guess_type(args.input)
    asset = {
        "filename": os.path.basename(args.input),
        "mime": mime or "application/octet-stream",
        "bytes": os.path.getsize(args.input),
        "sha256": sha256_bytes(args.input),
    }

    manifest = {
        "manifest_version": "demo-1",
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
        "tool": f"{APP} {VERSION}",
        "creator": args.creator or "unknown",
        # legacy fields for backwards demo compat
        "source_file": asset["filename"],
        "source_sha256": asset["sha256"],
        # structured asset block
        "asset": asset,
        "signing": {
            "type": "demo-self-signed",
            "key_id": read_dev_key_id(),
            "note": "Demo manifest (not cryptographic). Replace with real C2PA signing later."
        },
        "edits": [{"op": e.strip(), "ts": datetime.datetime.utcnow().isoformat() + "Z"}
                  for e in (args.edits or "").split(",") if e.strip()]
    }
    base = asset["filename"]
    out_manifest = os.path.join(outdir, base + ".manifest.json")
    with open(out_manifest, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[ok] wrote manifest: {out_manifest}")

    if args.copy:
        out_img = os.path.join(outdir, base)
        if os.path.abspath(out_img) != os.path.abspath(args.input):
            with open(args.input, "rb") as src, open(out_img, "wb") as dst:
                dst.write(src.read())
            print(f"[ok] copied image to: {out_img}")

def cmd_inspect(args):
    with open(args.manifest, "r", encoding="utf-8") as f:
        data = json.load(f)
    asset = data.get("asset", {})
    summary = {
        "creator": data.get("creator"),
        "created_at": data.get("created_at"),
        "tool": data.get("tool"),
        "filename": asset.get("filename", data.get("source_file")),
        "mime": asset.get("mime"),
        "bytes": asset.get("bytes"),
        "sha256": data.get("source_sha256") or asset.get("sha256"),
        "edits_count": len(data.get("edits", [])),
    }
    print("# Summary")
    for k, v in summary.items():
        print(f"- {k}: {v}")
    print("\n# Raw JSON\n" + json.dumps(data, indent=2))

def cmd_verify(args):
    if not os.path.exists(args.image):
        raise SystemExit(f"[err] image not found: {args.image}")
    if not os.path.exists(args.manifest):
        raise SystemExit(f"[err] manifest not found: {args.manifest}")
    with open(args.manifest, "r", encoding="utf-8") as f:
        data = json.load(f)
    expected = data.get("source_sha256") or data.get("asset", {}).get("sha256")
    actual = sha256_bytes(args.image)
    print(f"expected: {expected}")
    print(f"actual:   {actual}")
    if expected == actual:
        print("VERIFY: PASS")
        sys.exit(0)
    print("VERIFY: FAIL (image bytes differ)")
    sys.exit(2)



def cmd_verify_all(args):
    import glob, json, sys
    root = args.folder
    pattern = "**/*.manifest.json" if args.recursive else "*.manifest.json"
    manifests = glob.glob(os.path.join(root, pattern), recursive=args.recursive)
    if not manifests:
        print("[warn] no manifests found"); sys.exit(1)
    total=ok=fail=0
    for mpath in manifests:
        try:
            with open(mpath, "r", encoding="utf-8") as f:
                man = json.load(f)
            expected = man.get("source_sha256") or man.get("asset",{}).get("sha256")
            ipath = mpath.replace(".manifest.json","")  # same name as image
            if not os.path.exists(ipath):
                print(f"[MISS] image not found for {mpath}")
                fail+=1; total+=1; continue
            actual = sha256_bytes(ipath)
            if actual == expected:
                print(f"[PASS] {ipath}")
                ok+=1
            else:
                print(f"[FAIL] {ipath}")
                fail+=1
            total+=1
        except Exception as e:
            print(f"[ERR ] {mpath}: {e}")
            fail+=1; total+=1
    print(f"\nSUMMARY: total={total} pass={ok} fail={fail}")
    sys.exit(0 if fail==0 else 2)


def build_parser():
    p = argparse.ArgumentParser(prog=APP, description="ProofLens demo signer (detached manifests)")
    sub = p.add_subparsers(dest="cmd", required=True)

    s1 = sub.add_parser("init-keys", help="create local dev keys (demo)")
    s1.set_defaults(func=cmd_init_keys)

    s2 = sub.add_parser("sign", help="create a detached manifest for an image")
    s2.add_argument("input", help="path to image (jpg/png)")
    s2.add_argument("-o", "--output", help="output directory")
    s2.add_argument("--creator", help="creator name or org")
    s2.add_argument("--edits", help="comma-separated list of edit steps")
    s2.add_argument("--copy", action="store_true", help="also copy the image to output dir")
    s2.set_defaults(func=cmd_sign)

    s3 = sub.add_parser("inspect", help="pretty summary then raw json")
    s3.add_argument("manifest", help="path to manifest json")
    s3.set_defaults(func=cmd_inspect)

    s4 = sub.add_parser("verify", help="check that image bytes match manifest sha256")
    s4.add_argument("image", help="path to image file")
    s4.add_argument("manifest", help="path to manifest json")
    s4.set_defaults(func=cmd_verify)



    s5 = sub.add_parser("verify-all", help="verify all *.manifest.json in a folder")
    s5.add_argument("folder", help="folder to scan")
    s5.add_argument("-r", "--recursive", action="store_true", help="recurse into subfolders")
    s5.set_defaults(func=cmd_verify_all)

    return p

def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
