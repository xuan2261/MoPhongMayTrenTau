# Restore one or more historical FCV-588 stage directories from the immutable,
# SHA-addressed archive. No overwrite. Recreates only pinned local NTFS junctions.
param([string[]] $StageNames = @())
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$store = Join-Path $root 'staging\github-prep-20261122\HISTORICAL_STAGES_DEDUP_20261122.zip'
$sidecar = Join-Path $root 'staging\github-prep-20261122\HISTORICAL_STAGES_DEDUP_20261122.json'
$meta = Get-Content -LiteralPath $sidecar -Raw | ConvertFrom-Json
if ($meta.schema -ne 'FCV588HistoricalContentStoreV1') {
  throw 'Unsupported content store format.'
}
if ((Get-FileHash -LiteralPath $store -Algorithm SHA256).Hash.ToLowerInvariant() -ne
  $meta.archiveSHA256.ToLowerInvariant()) {
  throw 'Archived content store SHA-256 mismatch.'
}
$archive = [IO.Compression.ZipFile]::OpenRead($store)
try {
  $entry = $archive.GetEntry('manifest.json')
  if (!$entry) { throw 'Missing archived manifest.' }
  $stream = $entry.Open()
  try {
    $reader = [IO.StreamReader]::new($stream)
    try { $content = $reader.ReadToEnd() }
    finally { $reader.Dispose() }
  } finally { $stream.Dispose() }
  $h = [Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($content))
  if ([Convert]::ToHexString($h).ToLowerInvariant() -ne
    $meta.manifestSHA256.ToLowerInvariant()) {
    throw 'Archived manifest SHA-256 mismatch.'
  }
  $manifest = $content | ConvertFrom-Json
} finally { $archive.Dispose() }
$selected = if ($StageNames.Count) { $StageNames } else { @($manifest.stageRoots) }
foreach ($name in $selected) {
  if ($name -notin @($manifest.stageRoots)) { throw "Unknown stage: $name" }
  if (Test-Path -LiteralPath (Join-Path $root $name)) {
    throw "Refusing to overwrite existing stage: $name"
  }
}
$cliArgs = @()
$cliArgs += (Join-Path $PSScriptRoot 'historical_stage_coldstore.py')
$cliArgs += 'restore'
$cliArgs += '--destination'
$cliArgs += $root
foreach ($name in $selected) {
  $cliArgs += '--stage'
  $cliArgs += $name
}
& python @cliArgs
if ($LASTEXITCODE -ne 0) { throw 'SHA-verified historical file restoration failed.' }
$linksDone = 0
foreach ($link in $manifest.junctions) {
  $keep = $false
  foreach ($name in $selected) {
    if ($link.path.StartsWith($name + '/', [StringComparison]::Ordinal)) {
      $keep = $true
      break
    }
  }
  if (!$keep) { continue }
  if ($link.targetRelative -notin @('docs','plans','sources')) {
    throw "Invalid requested junction target: $($link.path)"
  }
  $target = Join-Path $root $link.targetRelative
  $path = Join-Path $root $link.path
  if (!(Test-Path -LiteralPath $target) -or (Test-Path -LiteralPath $path)) {
    throw "Junction restoration collision: $($link.path)"
  }
  New-Item -ItemType Junction -Path $path -Target $target -ErrorAction Stop | Out-Null
  $linksDone++
}
Write-Output "RESTORED_JUNCTIONS=$linksDone"
Write-Output 'Historical stage restored; main application runtime was not altered.'
