$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$tauriRoot = Join-Path $repoRoot "frontend\\apps\\desktop-tauri"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm is not installed or not on PATH."
}

& pnpm -C $tauriRoot build
