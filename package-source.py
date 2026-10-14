"""Create a reproducible source archive without local dependencies or secrets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

root = Path(__file__).resolve().parent
output = root / "team-intern-source.zip"
skip = {"node_modules", ".git", ".next", ".vinext", ".wrangler", "dist", "out", "coverage", "outputs", "work", "generated-assets", "__pycache__"}
with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if relative.parts[:3] == ('app', 'backend', 'data'):
            continue
        if any(part in skip for part in relative.parts) or path.is_symlink() or not path.is_file():
            continue
        if path.name.startswith(".env") or path.name in {".DS_Store", "next-env.d.ts"} or path.suffix in {".zip", ".log", ".tsbuildinfo", ".pem", ".pyc", ".sqlite3", ".sqlite3-wal", ".sqlite3-shm"}:
            continue
        if relative.parts[0] != "app" and path.name not in {"README.md", "package-source.py"}:
            continue
        info = ZipInfo("team-intern/" + relative.as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
print(f"{output}: {output.stat().st_size:,} bytes")
