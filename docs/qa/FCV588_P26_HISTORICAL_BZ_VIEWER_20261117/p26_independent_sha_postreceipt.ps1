param([Parameter(Mandatory=$true)][string]$ExpectedFinalSHA256)
$ErrorActionPreference='Stop'
$root='C:\Work\MoPhongMayTrenTau'
$qa=Join-Path $root 'docs\qa\FCV588_P26_HISTORICAL_BZ_VIEWER_20261117'
$p25=Join-Path $root 'docs\qa\FCV588_P25_OFFLINE_ARCHIVE_UI_20261117'
$finalPath=Join-Path $qa 'FCV588_P26_HISTORICAL_BZ_VIEWER_FINAL_INTEGRITY_20261117.json'
$reportPath=Join-Path $qa 'FCV588_P26_HISTORICAL_BZ_VIEWER_REPORT_20261117.md'
$postPath=Join-Path $qa 'FCV588_P26_HISTORICAL_BZ_VIEWER_INDEPENDENT_SHA_POSTRECEIPT_20261117.json'
function GetSHA256([string]$path){(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()}
function AssertP26([bool]$value,[string]$label){if(-not $value){throw ('P26_INDEPENDENT_SHA_FAIL '+$label)}}
AssertP26 (-not (Test-Path -LiteralPath $postPath)) 'postreceipt must be write-once'
AssertP26 ((GetSHA256 $finalPath) -eq $ExpectedFinalSHA256.ToLowerInvariant()) 'final exact independently pinned SHA'
$f=Get-Content -LiteralPath $finalPath -Raw -Encoding UTF8 | ConvertFrom-Json
AssertP26 ($f.status -eq 'P26_BOUNDED_CANONICAL_POSTAPPLY_PASS_D15_SYNTHETIC_BZ_VIEWER') 'final status'
AssertP26 ((GetSHA256 $reportPath) -eq $f.finalReportSHA256) 'final report SHA'
AssertP26 ($f.releaseApproval -eq 'HOLD' -and $f.phase6 -eq 'OPEN' -and $f.claims -eq '65/65 HOLD' -and $f.hardwareValidated -eq $false) 'release remains HOLD'
AssertP26 ($f.historicalOEMPixelsReconstructed -eq $false -and $f.fingerprintAuthentication -eq $false -and $f.sidecarP04TestFixtureIsAuthenticHistory -eq $false) 'anti-OEM/provenance claim'
AssertP26 ((GetSHA256 (Join-Path $p25 'FCV588_P25_OFFLINE_ARCHIVE_UI_FINAL_INTEGRITY_20261117.json')) -eq $f.parentP25FinalSHA256) 'parent P25 final'
AssertP26 ((GetSHA256 (Join-Path $p25 'FCV588_P25_OFFLINE_ARCHIVE_UI_INDEPENDENT_POSTRECEIPT_20261117.json')) -eq $f.parentP25PostSHA256) 'parent P25 post'
AssertP26 ((GetSHA256 (Join-Path $qa 'P26_GUARDED_APPLY_DRYRUN_V2_20261117.json')) -eq $f.freshDryrunV2SHA256) 'fresh dryrun V2'
AssertP26 ((GetSHA256 (Join-Path $qa 'P26_GUARDED_APPLY_FINAL_GO_V3_20261117.json')) -eq $f.preapplyFinalGoSHA256) 'fresh preapply independent GO'
AssertP26 ((GetSHA256 (Join-Path $qa 'P26_CANONICAL_GUARDED_APPLY_20261117.json')) -eq $f.guardedCanonicalApplySHA256) 'guarded apply receipt'
AssertP26 ((GetSHA256 (Join-Path $qa 'P26_CANONICAL_PREIMAGE_3MODIFIED_20261117.zip')) -eq $f.preimageBackupZIPSHA256) 'three protected preimages ZIP'
$manual=Join-Path $root 'sources\manuals\FCV-588\FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf'
AssertP26 ((GetSHA256 $manual) -eq $f.manualSHA256) 'manufacturer reference manual unchanged'
$n53=0
foreach($entry in $f.canonicalRuntime53SHA256.PSObject.Properties){
  AssertP26 ((GetSHA256 (Join-Path $root $entry.Name)) -eq $entry.Value) ('canonical runtime '+$entry.Name)
  $n53++
}
AssertP26 ($n53 -eq 53) '53 current runtime files'
$n8=0
foreach($entry in $f.OEMReferenceOnly8SHA256.PSObject.Properties){
  $path=Join-Path $root ('sources\FCV588_GiaoDienThucTeMay2016\'+$entry.Name)
  AssertP26 ((GetSHA256 $path) -eq $entry.Value) ('OEM photo '+$entry.Name)
  $n8++
}
AssertP26 ($n8 -eq 8) '8 reference-only OEM photos'
$n5=0
foreach($entry in $f.P26AppliedFivePathsSHA256.PSObject.Properties){
  AssertP26 ((GetSHA256 (Join-Path $root $entry.Name)) -eq $entry.Value) ('P26 applied '+$entry.Name)
  $n5++
}
AssertP26 ($n5 -eq 5) 'exact five applied paths'
$ne=0
foreach($entry in $f.evidenceSHA256.PSObject.Properties){
  AssertP26 ((GetSHA256 (Join-Path $qa $entry.Name)) -eq $entry.Value) ('QA evidence '+$entry.Name)
  $ne++
}
AssertP26 ($ne -ge 30) 'comprehensive evidence SHA count'
foreach($file in @('P26_STAGE_FULL_NODE_V3_20261117.json','P26_CANONICAL_POSTAPPLY_FULL_NODE_20261117.json')){
  $node=Get-Content -LiteralPath (Join-Path $qa $file) -Raw -Encoding UTF8 | ConvertFrom-Json
  AssertP26 ($node.status -eq 'PASS' -and $node.exitCode -eq 0 -and $node.summary -contains '# pass 605' -and $node.summary -contains '# fail 0') ('node 605 '+$file)
}
foreach($file in @('P26_STAGE_PYTHON_V3_20261117.json','P26_CANONICAL_POSTAPPLY_PYTHON_20261117.json')){
  $python=Get-Content -LiteralPath (Join-Path $qa $file) -Raw -Encoding UTF8 | ConvertFrom-Json
  AssertP26 ($python.status -eq 'PASS' -and $python.exitCode -eq 0 -and $python.summary -contains 'OK') ('python13 '+$file)
}
foreach($file in @('P26_STAGE_BROWSER_V4_20261117.json','P26_CANONICAL_BROWSER_20261117.json')){
  $b=Get-Content -LiteralPath (Join-Path $qa $file) -Raw -Encoding UTF8 | ConvertFrom-Json
  AssertP26 ($b.status -eq 'PASS' -and $b.cases.Count -eq 9 -and $b.loadedSourceBodiesCount -eq 51 -and $b.errors.Count -eq 0 -and $b.qaPortClosed -eq $true) ('Chrome9 '+$file)
  foreach($c in $b.cases){AssertP26 ($c.liveModeTickEventAndLcdPixelsUnchanged -eq $true) ('live LCD unchanged '+$file)}
}
$chrome=Get-Content -LiteralPath (Join-Path $qa 'P26_CANONICAL_BROWSER_20261117.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$nb=0
foreach($entry in $chrome.httpBodies.PSObject.Properties){
  $rel=if($entry.Name -eq '/'){'web\index.html'}else{$entry.Name.TrimStart('/') -replace '/','\'}
  AssertP26 ((GetSHA256 (Join-Path $root $rel)) -eq $entry.Value) ('canonical HTTP response bytes '+$rel)
  $nb++
}
AssertP26 ($nb -eq 51) '51 actual browser-source byte hashes'
AssertP26 ($chrome.cases[3].fraction -eq 0.5 -and $chrome.cases[4].fraction -eq 0.75) 'explicit P04/P23 synthetic fractions'
AssertP26 ($chrome.cases[3].zoomPaneSHA256 -ne $chrome.cases[4].zoomPaneSHA256 -and $chrome.cases[3].normalPaneSHA256 -eq $chrome.cases[4].normalPaneSHA256) 'BZ difference with normal pane invariant'
AssertP26 ($chrome.cases[0].viewerSHA256 -eq $null -and $chrome.cases[1].viewerSHA256 -eq $null -and $chrome.cases[2].viewerSHA256 -eq $null) 'non-BZ, saved-BZ LF, POWER OFF do not render'
AssertP26 ($f.reviewers.worker36 -eq 'BOUNDED_POSTAPPLY_GO' -and $f.reviewers.worker38 -eq 'BOUNDED_POSTAPPLY_GO') 'two independent postapply reviewers'
$ports=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in @(4173,4226,4227,4228)})
AssertP26 (@($ports|Where-Object {$_.LocalAddress -eq '127.0.0.1' -and $_.LocalPort -eq 4173 -and $_.OwningProcess -eq 1204}).Count -eq 1) 'protected 4173 PID1204 listener'
AssertP26 (@($ports|Where-Object {$_.LocalPort -in @(4226,4227,4228)}).Count -eq 0) 'QA listeners closed'
$record=[ordered]@{
 schema='FCV588_P26_INDEPENDENT_SHA_POSTRECEIPT_V1'
 createdAt=(Get-Date).ToUniversalTime().ToString('o')
 status='PASS_INDEPENDENT_POWERSHELL_SHA_POSTRECEIPT_BOUNDED_P26'
 method='SEPARATE_LIVE_POWERSHELL_GET_FILE_HASH_AND_BROWSER_RESPONSE_BODY_SHA'
 finalSHA256=(GetSHA256 $finalPath)
 reportSHA256=(GetSHA256 $reportPath)
 parentP25FinalSHA256=$f.parentP25FinalSHA256
 parentP25PostSHA256=$f.parentP25PostSHA256
 guardedApplySHA256=$f.guardedCanonicalApplySHA256
 preimageBackupZIPSHA256=$f.preimageBackupZIPSHA256
 canonicalRuntime="53/53"
 OEMReferencePhotos="8/8"
 P26AppliedFiles="5/5"
 evidenceFiles=("$ne/$ne")
 canonicalChromeHttpBodies="51/51"
 stageFocused="9/9"
 stageNode="605/605"
 stagePython="13/13"
 stageChrome="9/9"
 canonicalFocused="9/9"
 canonicalNode="605/605"
 canonicalPython="13/13"
 canonicalChrome="9/9"
 independentReviews='worker36_worker38_BOUNDED_POSTAPPLY_GO'
 userServer='127.0.0.1:4173 PID1204'
 qaPortListeners=0
 syntheticOnly=$true
 exactOEMPixelsValidated=$false
 fingerprintAuthenticated=$false
 phase6='OPEN'
 releaseApproval='HOLD'
}
$bytes=[System.Text.UTF8Encoding]::new($false).GetBytes(($record | ConvertTo-Json -Depth 6)+[Environment]::NewLine)
$stream=[System.IO.FileStream]::new($postPath,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write,[System.IO.FileShare]::None)
try{$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
$readback=Get-Content -LiteralPath $postPath -Raw -Encoding UTF8 | ConvertFrom-Json
AssertP26 ($readback.status -eq $record.status -and $readback.finalSHA256 -eq (GetSHA256 $finalPath)) 'write-once PowerShell receipt readback'
'P26_INDEPENDENT_POST_STATUS='+$readback.status
'P26_INDEPENDENT_POST_SHA256='+(GetSHA256 $postPath)
'P26_COUNTS='+($n53.ToString()+'/'+$n8.ToString()+'/'+$n5.ToString()+'/'+$ne.ToString()+'/'+$nb.ToString())
