$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\\..\\..\\..")
$backendRoot = Join-Path $repoRoot "backend"
$tauriRoot = Join-Path $repoRoot "frontend\\apps\\desktop-tauri\\src-tauri"

$buildScript = Join-Path $backendRoot "scripts\\build-exe.ps1"
& $buildScript

$backendExe = Join-Path $backendRoot "dist\\whalewhisper-backend.exe"
if (-not (Test-Path $backendExe)) {
  throw "Backend exe not found at $backendExe"
}

$targetTriple = $env:TAURI_ENV_TARGET_TRIPLE
if (-not $targetTriple) {
  try {
    $rustcInfo = & rustc -vV 2>$null
    $hostLine = $rustcInfo | Where-Object { $_ -like "host:*" }
    if ($hostLine) {
      $targetTriple = $hostLine.Split(":")[1].Trim()
    }
  } catch {
    $targetTriple = $null
  }
}
if (-not $targetTriple) {
  $targetTriple = "x86_64-pc-windows-msvc"
}

$binDir = Join-Path $tauriRoot "bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
$sidecarName = "whalewhisper-backend-$targetTriple.exe"
Copy-Item $backendExe (Join-Path $binDir $sidecarName) -Force

$configSource = Join-Path $backendRoot "config"
$configTarget = Join-Path $tauriRoot "config"
New-Item -ItemType Directory -Force -Path $configTarget | Out-Null
Copy-Item (Join-Path $configSource "*") $configTarget -Recurse -Force
