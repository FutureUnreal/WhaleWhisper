$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Resolve-Path (Join-Path $scriptDir "..")

$venvPython = Join-Path $backendRoot ".venv\\Scripts\\python.exe"
if (Test-Path $venvPython) {
  $python = $venvPython
} else {
  $python = "python"
}

& $python -m PyInstaller --version | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "PyInstaller is not installed. Install it with: $python -m pip install pyinstaller"
}

$distDir = Join-Path $backendRoot "dist"
$buildDir = Join-Path $backendRoot "build"
$entrypoint = Join-Path $backendRoot "scripts\\run_backend.py"

& $python -m PyInstaller `
  --noconfirm `
  --onefile `
  --noconsole `
  --name "whalewhisper-backend" `
  --paths $backendRoot `
  --hidden-import "app.main" `
  --collect-submodules "app" `
  --distpath $distDir `
  --workpath $buildDir `
  --specpath $buildDir `
  $entrypoint
