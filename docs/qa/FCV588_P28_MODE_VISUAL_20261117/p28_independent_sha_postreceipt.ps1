# Independent P28 postapply PowerShell SHA readback. Write-once.
$ErrorActionPreference='Stop'
$root='C:\Work\MoPhongMayTrenTau'
$qa=Join-Path $root 'docs\qa\FCV588_P28_MODE_VISUAL_20261117'
$stage=Join-Path $root 'staging\fcv588-p28-mode-visual-20261117'
$fin=Join-Path $qa 'FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json'
$out=Join-Path $qa 'FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_20261117.json'
if(Test-Path -LiteralPath $out){throw 'P28 independent postreceipt already exists'}
function SHA([string]$path){
 if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "Missing $path"}
 return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
}
function Need([bool]$value,[string]$message){if(-not $value){throw ('P28 POSTREAD NO_GO '+$message)}}
$j=Get-Content -Raw -LiteralPath $fin|ConvertFrom-Json
Need ($j.status -eq 'P28_TEST_ONLY_CANONICAL_AND_SOURCE_BOUND_MODE_QA_PASS') 'wrong final status'
Need ($j.releaseApproval -eq 'HOLD' -and $j.phase6 -eq 'OPEN' -and $j.claims -eq '65/65 HOLD') 'claim/release drift'
Need (-not $j.hardwareValidated -and -not $j.OEMPixelOrHardwareValidated -and -not $j.historicalLCDPixelsReconstructed) 'OEM validation overclaim'
Need ((SHA (Join-Path $root $j.addedTestRelPath)) -eq $j.addedOneTestCanonicalSHA256) 'new canonical test SHA drift'
Need ((SHA (Join-Path $stage $j.addedTestRelPath)) -eq $j.addedOneTestCanonicalSHA256) 'new staged test SHA drift'
$runtime=0
foreach($p in $j.P27Runtime54UnchangedSHA256.PSObject.Properties){
 Need ((SHA (Join-Path $root $p.Name)) -eq $p.Value) "runtime canonical drift: $($p.Name)"
 Need ((SHA (Join-Path $stage $p.Name)) -eq $p.Value) "runtime staging drift: $($p.Name)"
 $runtime++
}
Need ($runtime -eq 54) 'runtime not 54'
$oem=0
foreach($p in $j.OEMReferenceOnly8SHA256.PSObject.Properties){
 Need ((SHA (Join-Path $root ('sources\FCV588_GiaoDienThucTeMay2016\'+$p.Name))) -eq $p.Value) "OEM photo drift $($p.Name)"
 $oem++
}
Need ($oem -eq 8) 'OEM8 missing'
Need ((SHA (Join-Path $root 'sources\manuals\FCV-588\FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf')) -eq $j.manualSHA256) 'manual changed'
$p27='docs\qa\FCV588_P27_EVENT_TIMELINE_20261117\'
Need ((SHA (Join-Path $root ($p27+'FCV588_P27_EVENT_TIMELINE_FINAL_INTEGRITY_20261117.json'))) -eq $j.parentP27FinalSHA256) 'P27 final changed'
Need ((SHA (Join-Path $root ($p27+'FCV588_P27_EVENT_TIMELINE_INDEPENDENT_SHA_POSTRECEIPT_20261117.json'))) -eq $j.parentP27IndependentPostSHA256) 'P27 post changed'
Need ((SHA (Join-Path $qa 'P28_TEST_ONLY_DRYRUN_V2_20261117.json')) -eq $j.preapplyDryrunSHA256) 'P28 dryrun changed'
Need ((SHA (Join-Path $qa 'P28_TEST_ONLY_GUARDED_APPLY_20261117.json')) -eq $j.guardedTestOnlyApplySHA256) 'P28 guarded apply changed'
Need ((SHA (Join-Path $qa 'P28_SYNTHETIC_FIXTURE_PROVENANCE_20261117.json')) -eq $j.fixtureProvenanceSHA256) 'provenance changed'
Need ((SHA (Join-Path $qa 'FCV588_P28_MODE_VISUAL_FINAL_REPORT_20261117.md')) -eq $j.finalReportSHA256) 'report changed'
$logs=0
foreach($p in $j.stageCanonicalTestEvidenceSHA256.PSObject.Properties){
 Need ((SHA (Join-Path $qa $p.Name)) -eq $p.Value) "test evidence SHA drift $($p.Name)"
 $logs++
}
Need ($logs -eq 6) 'not six Node/Python/focused logs'
$browserFiles=@(
 @{name='P28_STAGE_BROWSER_MODE_MATRIX_V2_20261117.json';base=$stage;key='stageD15';count=7},
 @{name='P28_STAGE_LIVE_LCD_MODES_V3_20261117.json';base=$stage;key='stageLiveLCD';count=3},
 @{name='P28_CANONICAL_BROWSER_MODE_MATRIX_V1_20261117.json';base=$root;key='canonicalD15';count=7},
 @{name='P28_CANONICAL_LIVE_LCD_MODES_V1_20261117.json';base=$root;key='canonicalLiveLCD';count=3}
)
$totalHttp=0;$screens=0;$cases=0
foreach($item in $browserFiles){
 $receipt=Get-Content -Raw (Join-Path $qa $item.name)|ConvertFrom-Json
 $pin=$j.stageCanonicalChromeEvidence.($item.key)
 Need ((SHA (Join-Path $qa $item.name)) -eq $pin.receiptSHA256) "browser receipt SHA drift $($item.name)"
 Need ($receipt.status -eq 'PASS' -and $receipt.errors.Count -eq 0 -and $receipt.qaPortClosed -and $receipt.ownedQAServerExited) "browser status not PASS $($item.name)"
 Need ($receipt.cases.Count -eq $item.count -and $pin.cases -eq $item.count) "browser cases changed $($item.name)"
 $cases+=$receipt.cases.Count
 foreach($p in $receipt.httpBodies.PSObject.Properties){
  $rel=if($p.Name -eq '/'){'web\index.html'}else{$p.Name.TrimStart('/').Replace('/','\')}
  Need ((SHA (Join-Path $item.base $rel)) -eq $p.Value) "actual HTTP-body SHA drift $($item.name) $($p.Name)"
  $totalHttp++
 }
 foreach($p in $receipt.screenshots.PSObject.Properties){
  Need ((SHA (Join-Path $qa $p.Name)) -eq $p.Value) "screenshot SHA drift $($p.Name)"
  $screens++
 }
}
Need ($cases -eq 20 -and $totalHttp -eq 208 -and $screens -eq 18) '20/208/18 browser evidence count'
$userServer=@(Get-NetTCPConnection -State Listen -LocalPort 4173 -ErrorAction SilentlyContinue|Where-Object {$_.LocalAddress -eq '127.0.0.1'})
Need ($userServer.Count -eq 1 -and $userServer[0].OwningProcess -eq 1204) 'protected 4173 process changed'
$ownedPorts=@(Get-NetTCPConnection -State Listen -LocalPort 4231,4233,4234,4235 -ErrorAction SilentlyContinue)
Need ($ownedPorts.Count -eq 0) 'owned QA port still active'
$result=[ordered]@{
 schema='FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_V1'
 createdUTC=[DateTimeOffset]::UtcNow.ToString('o')
 status='P28_INDEPENDENT_SHA_POSTAPPLY_PASS_TEST_ONLY'
 method='PowerShell Get-FileHash readback; independent of Python final writer'
 finalIntegritySHA256=(SHA $fin)
 finalReportSHA256=$j.finalReportSHA256
 stageCanonicalTestSHA256=$j.addedOneTestCanonicalSHA256
 parentP27FinalSHA256=$j.parentP27FinalSHA256
 parentP27PostSHA256=$j.parentP27IndependentPostSHA256
 P28DryrunSHA256=$j.preapplyDryrunSHA256
 P28GuardedApplySHA256=$j.guardedTestOnlyApplySHA256
 runtimeUntouchedSHA256Count=$runtime
 OEMReferenceOnlySHA256Count=$oem
 stageCanonicalTestReceiptCount=$logs
 syntheticFixtureCount=$j.fixtureCount
 chromeCases=$cases
 actualChromeHTTPSourceBodySHA256Count=$totalHttp
 screenshotsSHA256Count=$screens
 userServer4173PID=1204
 qaPortsClosed=@(4231,4233,4234,4235)
 hardwareValidated=$false
 firmware='UNKNOWN'
 phase6='OPEN'
 claims='65/65 HOLD'
 releaseApproval='HOLD'
}
$serialized=$result|ConvertTo-Json -Depth 12
$bytes=(New-Object System.Text.UTF8Encoding($false)).GetBytes($serialized+[Environment]::NewLine)
$stream=[System.IO.File]::Open($out,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write)
try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
Write-Output ('P28_INDEPENDENT_POSTRECEIPT_PASS SHA='+(SHA $out))
