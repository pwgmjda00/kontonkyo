"""Copy this tested project and dist to its additive GitHub Pages subdirectory.

This does not create commits, push, or change the existing root site's files.
Run npm run build first, then use a clean checkout of the configured repository.
"""
from pathlib import Path
import argparse
import shutil
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--checkout", required=True, type=Path)
args = parser.parse_args()
source = Path(__file__).resolve().parent.parent
checkout = args.checkout.resolve()
if not (checkout / ".git").exists():
    raise SystemExit("--checkout must point to a separate Git checkout")
if source == checkout or checkout in source.parents or source in checkout.parents:
    raise SystemExit("Use a separate publication checkout")
if subprocess.check_output(["git", "-C", str(checkout), "status", "--porcelain"], text=True).strip():
    raise SystemExit("Publication checkout has changes; preserve or commit them before syncing")
if not (source / "dist" / "index.html").is_file():
    raise SystemExit("No dist/index.html. Run npm ci and npm run build first")

target = checkout / "dopa-button"
target.mkdir(exist_ok=True)
ignore = shutil.ignore_patterns("node_modules", "dist", ".git", "coverage", "*.tsbuildinfo", ".env", ".env.*", ".npmrc")
for name in ("src", "public", "data", "tools", "tests", ".github"):
    path = source / name
    if path.is_dir():
        shutil.copytree(path, target / name, dirs_exist_ok=True, ignore=ignore)
for name in ("package.json", "package-lock.json", "index.html", "tsconfig.json", "vite.config.ts", "vitest.config.ts", ".gitignore", "README.md", "HANDOFF.md", "DEPLOYMENT.md"):
    if (source / name).is_file():
        shutil.copyfile(source / name, target / name)
play = target / "play"
if play.exists():
    # This exact path is the generated bundle created by this release process.
    shutil.rmtree(play)
shutil.copytree(source / "dist", play)
workflow = checkout / ".github" / "workflows" / "dopa-pages.yml"
workflow.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source / ".github" / "workflows" / "pages.yml", workflow)
print("Synced project source to dopa-button/ and tested bundle to dopa-button/play/.")
print("Existing root files were not modified. Review git diff before committing.")
