# P27 PowerShell read-only independent SHA readback; output one write-once JSON.
# Separate implementation from Python staging/apply/final scripts.
$ErrorActionPreference = 'Stop'
$root = 'C:\Work\MoPhongMayTrenTau'
$qa = Join-Path $root 'docs\qa\FCV588_P27_EVENT_TIMELINE_20261117'
$stage = Join-Path $root 'staging\fcv588-p27-event-timeline-20261117'
$finalPath = Join-Path $qa 'FCV588_P27_EVENT_TIMELINE_FINAL_INTEGRITY_20261117.json'
$out = Join-Path $qa 'FCV588_P27_EVENT_TIMELINE_INDEPENDENT_SHA_POSTRECEIPT_20261117.json'
if (Test-Path -LiteralPath $out) { throw 'P27 independent postreceipt is write-once' }
function Hex([string]$path) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing file: $path" }
  return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
}
function Need([bool]$value,[string]$why) { if (-not $value) { throw "P27 POSTRECEIPT NO_GO: $why" } }
$f = Get-Content -Raw -LiteralPath $finalPath | ConvertFrom-Json
Need ($f.status -eq 'P27_CANONICAL_BOUNDED_PASS_D15_EVENT_TIMELINE') 'wrong final status'
Need ($f.releaseApproval -eq 'HOLD' -and $f.phase6 -eq 'OPEN' -and $f.claims -eq '65/65 HOLD') 'release/claims drift'
Need (-not $f.hardwareValidated -and -not $f.historicalOEMPixels -and -not $f.fingerprintCryptographicAuthentication) 'false provenance claim'
$runtime=0
foreach($p in $f.canonicalRuntime54SHA256.PSObject.Properties){
  Need ((Hex (Join-Path $root $p.Name)) -eq $p.Value) "runtime SHA drift: $($p.Name)"
  $runtime++
}
Need ($runtime -eq 54) 'runtime count not 54'
$applied=0
foreach($p in $f.P27AppliedSixPathsSHA256.PSObject.Properties){
  Need ((Hex (Join-Path $root $p.Name)) -eq $p.Value) "applied canonical SHA drift: $($p.Name)"
  Need ((Hex (Join-Path $stage $p.Name)) -eq $p.Value) "applied stage SHA drift: $($p.Name)"
  $applied++
}
Need ($applied -eq 6) 'applied count not 6'
$oem=0
foreach($p in $f.originalOEMReferenceOnly8SHA256.PSObject.Properties){
  Need ((Hex (Join-Path $root ('sources\FCV588_GiaoDienThucTeMay2016\'+$p.Name))) -eq $p.Value) "OEM SHA drift: $($p.Name)"
  $oem++
}
Need ($oem -eq 8) 'OEM count not eight'
Need ((Hex (Join-Path $root 'sources\manuals\FCV-588\FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf')) -eq $f.manualSHA256) 'manual SHA drift'
$parent='docs\qa\FCV588_P26_HISTORICAL_BZ_VIEWER_20261117\'
Need ((Hex (Join-Path $root ($parent+'FCV588_P26_HISTORICAL_BZ_VIEWER_FINAL_INTEGRITY_20261117.json'))) -eq $f.parentP26FinalSHA256) 'P26 final SHA drift'
Need ((Hex (Join-Path $root ($parent+'FCV588_P26_HISTORICAL_BZ_VIEWER_INDEPENDENT_SHA_POSTRECEIPT_20261117.json'))) -eq $f.parentP26IndependentPostreceiptSHA256) 'P26 postreceipt SHA drift'
Need ((Hex (Join-Path $qa 'P27_FRESH_GUARDED_DRYRUN_20261117.json')) -eq $f.dryrunSHA256) 'dryrun SHA drift'
Need ((Hex (Join-Path $qa 'P27_GUARDED_CANONICAL_APPLY_20261117.json')) -eq $f.guardedApplySHA256) 'guarded apply SHA drift'
Need ((Hex (Join-Path $qa 'P27_CANONICAL_PREIMAGE_FOUR_PATHS_20261117.zip')) -eq $f.preimageBackupZIPSHA256) 'backup SHA drift'
Need ((Hex (Join-Path $qa 'FCV588_P27_EVENT_TIMELINE_FINAL_REPORT_20261117.md')) -eq $f.finalReportSHA256) 'report SHA drift'
$logs=0
foreach($p in $f.stageAndCanonicalTestSHA256.PSObject.Properties){
  Need ((Hex (Join-Path $qa $p.Name)) -eq $p.Value) "test log SHA drift: $($p.Name)"
  $logs++
}
Need ($logs -eq 6) 'test receipt count not 6'
$screens=0
$httpBodies=0
foreach($item in @(@{key='stageChrome';source=$stage;filename='P27_STAGE_BROWSER_V12_20261117.json'},
                   @{key='canonicalChrome';source=$root;filename='P27_CANONICAL_BROWSER_V1_20261117.json'})){
  $proof=$f.($item.key)
  Need ((Hex (Join-Path $qa $item.filename)) -eq $proof.receiptSHA256) "$($item.key) receipt SHA drift"
  Need ($proof.cases -eq 10 -and $proof.actualHTTPBodySHA256Count -eq 52 -and $proof.qaPortClosed) "$($item.key) QA status mismatch"
  $browser=Get-Content -Raw (Join-Path $qa $item.filename)|ConvertFrom-Json
  Need ($browser.status -eq 'PASS' -and $browser.errors.Count -eq 0) "$($item.key) browser errors"
  foreach($r in $browser.httpBodies.PSObject.Properties){
    $rel=if($r.Name -eq '/'){'web/index.html'}else{$r.Name.TrimStart('/').Replace('/','\')}
    Need ((Hex (Join-Path $item.source $rel)) -eq $r.Value) "$($item.key) actual HTTP source SHA drift $($r.Name)"
    $httpBodies++
  }
  foreach($png in $browser.screenshots.PSObject.Properties){
    Need ((Hex (Join-Path $qa $png.Name)) -eq $png.Value) "$($item.key) screenshot SHA drift"
    $screens++
  }
}
Need ($httpBodies -eq 104 -and $screens -eq 4) 'HTTP/screenshot cardinality not 104/4'
$server=Get-NetTCPConnection -State Listen -LocalPort 4173 -ErrorAction Stop | Where-Object {$_.LocalAddress -eq '127.0.0.1'}
Need (@($server).Count -eq 1 -and @($server)[0].OwningProcess -eq 1204) 'protected user server changed PID'
$qaports=@(Get-NetTCPConnection -State Listen -LocalPort 4228,4229 -ErrorAction SilentlyContinue)
Need ($qaports.Count -eq 0) 'P27 QA port still listening'
$receipt=[ordered]@{
  schema='FCV588_P27_EVENT_TIMELINE_INDEPENDENT_SHA_POSTRECEIPT_V1'
  createdUTC=[DateTimeOffset]::UtcNow.ToString('o')
  status='P27_INDEPENDENT_SHA_READBACK_PASS'
  method='PowerShell Get-FileHash SHA256, fresh readback separate from Python final writer'
  finalIntegritySHA256=(Hex $finalPath)
  finalReportSHA256=$f.finalReportSHA256
  dryrunSHA256=$f.dryrunSHA256
  guardedApplySHA256=$f.guardedApplySHA256
  preimageBackupSHA256=$f.preimageBackupZIPSHA256
  runtimeSHA256Count=$runtime
  appliedStageCanonicalMatchCount=$applied
  OEMReferenceOnlySHA256Count=$oem
  pythonNodeFocusedReceiptHashCount=$logs
  actualChromeHTTPBodySHA256Count=$httpBodies
  browserScreenshotSHA256Count=$screens
  P26FinalSHA256=$f.parentP26FinalSHA256
  P26IndependentPostSHA256=$f.parentP26IndependentPostreceiptSHA256
  userServer4173PID=1204
  qaPortsClosed=@(4228,4229)
  phase6='OPEN'
  claims='65/65 HOLD'
  firmware='UNKNOWN'
  releaseApproval='HOLD'
}
$content=$receipt | ConvertTo-Json -Depth 12
$utf8=New-Object System.Text.UTF8Encoding($false)
$fs=[System.IO.File]::Open($out,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write)
try {
  $buf=$utf8.GetBytes($content + [Environment]::NewLine)
  $fs.Write($buf,0,$buf.Length)
} finally {$fs.Dispose()}
Write-Output ('INDEPENDENT_POSTRECEIPT_PASS SHA='+ (Hex $out))
