# Restore selected historical Electron unpacked applications, after disk cleanup.
# Validates pinned ZIP SHA and all restored files. Never overwrites directories.
param(
  [switch]$P29,
  [switch]$P30P31
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$qa = Join-Path $root 'staging\github-prep-20261122'
if (!$P29 -and !$P30P31) { $P29 = $true; $P30P31 = $true }

if ($P29) {
  $zip = Join-Path $root 'docs\qa\FCV588_ELECTRON_POC_20261121\P29_FCV588_ELECTRON_PORTABLE_WIN_X64_20261121.zip'
  $target = Join-Path $root 'staging\fcv588-electron-poc-20261121\dist'
  if (Test-Path -LiteralPath $target) { throw 'P29 dist already exists; refusing overwrite.' }
  if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne
    'BB179F82B5DAAB38E4434C0BF8C6148FDF5D99BBE8540FD1CBD16946BDA7B061') {
    throw 'P29 original portable ZIP SHA mismatch.'
  }
  $a = [IO.Compression.ZipFile]::OpenRead($zip)
  try {
    foreach ($e in $a.Entries) {
      if (!$e.FullName.StartsWith('FCV588-Synthetic-POC-win32-x64/', [StringComparison]::Ordinal) -or
        $e.FullName.Contains('..') -or $e.FullName.Contains('\')) {
        throw "Invalid P29 archived path: $($e.FullName)"
      }
    }
  } finally { $a.Dispose() }
  [IO.Compression.ZipFile]::ExtractToDirectory($zip, $target)
  $a = [IO.Compression.ZipFile]::OpenRead($zip)
  try {
    $verified = 0
    foreach ($e in $a.Entries) {
      if (!$e.Name) { continue }
      $restored = Join-Path $target ($e.FullName.Replace('/', '\'))
      $h = [Security.Cryptography.SHA256]::Create()
      try {
        $s = $e.Open()
        try { $expected = [Convert]::ToHexString($h.ComputeHash($s)) }
        finally { $s.Dispose() }
      } finally { $h.Dispose() }
      if ((Get-FileHash -LiteralPath $restored -Algorithm SHA256).Hash -ne $expected) {
        throw "P29 restore mismatch: $($e.FullName)"
      }
      $verified++
    }
    if ($verified -ne 73) { throw "P29 restore count mismatch: $verified" }
  } finally { $a.Dispose() }
  Write-Output 'P29_RESTORED_SHA=73/73'
}

if ($P30P31) {
  $zip = Join-Path $qa 'ELECTRON_UNPACKED_P30_P31_ARCHIVE_20261122.zip'
  $manifest = Join-Path $qa 'ELECTRON_UNPACKED_P30_P31_ARCHIVE_20261122.json'
  $expectedSHA = '74C607FFA6CC693E645EEEED9F466EA59400D9E8FBA4CFC063B2D18D417D6987'
  if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne $expectedSHA) {
    throw 'P30/P31 archive SHA mismatch.'
  }
  $m = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
  if ($m.fileCount -ne 293 -or $m.archiveSha256 -ne $expectedSHA) {
    throw 'P30/P31 manifest mismatch.'
  }
  foreach ($dir in $m.dirs) {
    if (Test-Path -LiteralPath (Join-Path $root $dir.stageDirectory)) {
      throw "Refusing to overwrite unpacked directory: $($dir.stageDirectory)"
    }
  }
  $a = [IO.Compression.ZipFile]::OpenRead($zip)
  try {
    if ($a.Entries.Count -ne 293) { throw 'P30/P31 ZIP file count changed.' }
    foreach ($e in $a.Entries) {
      if (!$e.FullName.StartsWith('staging/fcv588-', [StringComparison]::Ordinal) -or
        $e.FullName.Contains('..') -or $e.FullName.Contains('\')) {
        throw "Unsafe P30/P31 archived path: $($e.FullName)"
      }
    }
  } finally { $a.Dispose() }
  [IO.Compression.ZipFile]::ExtractToDirectory($zip, $root)
  $verified = 0
  foreach ($f in $m.files) {
    $actual = (Get-FileHash -LiteralPath (Join-Path $root $f.path) -Algorithm SHA256).Hash
    if ($actual.ToLowerInvariant() -ne $f.sha256) {
      throw "P30/P31 restored SHA mismatch: $($f.path)"
    }
    $verified++
  }
  if ($verified -ne 293) { throw 'P30/P31 restore count mismatch.' }
  Write-Output 'P30_P31_RESTORED_SHA=293/293'
}
