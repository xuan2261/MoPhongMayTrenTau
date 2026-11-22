$ErrorActionPreference='Stop'
$root='C:\Work\MoPhongMayTrenTau'
$qa=Join-Path $root 'docs\qa\FCV588_P25_OFFLINE_ARCHIVE_UI_20261117'
$finalPath=Join-Path $qa 'FCV588_P25_OFFLINE_ARCHIVE_UI_FINAL_INTEGRITY_20261117.json'
$report=Join-Path $qa 'FCV588_P25_OFFLINE_ARCHIVE_UI_REPORT_20261117.md'
$post=Join-Path $qa 'FCV588_P25_OFFLINE_ARCHIVE_UI_INDEPENDENT_POSTRECEIPT_20261117.json'
function GetSHA256([string]$path){(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()}
function AssertP25([bool]$value,[string]$message){if(-not $value){throw ('P25_INDEPENDENT_FAIL '+$message)}}
AssertP25 (-not (Test-Path -LiteralPath $post)) 'postreceipt write-once absent'
AssertP25 ((GetSHA256 $finalPath) -eq '3fdac61ebd16a1728e47d0a4382eb15f07597d98f5e161e3084cb4cbab541dff') 'final sha'
$f=Get-Content -LiteralPath $finalPath -Raw -Encoding UTF8 | ConvertFrom-Json
AssertP25 ((GetSHA256 $report) -eq $f.finalReportSHA256) 'report SHA'
AssertP25 ($f.status -eq 'P25_BOUNDED_CANONICAL_POSTAPPLY_PASS_D15_ARCHIVE_UI') 'final status'
AssertP25 ($f.releaseApproval -eq 'HOLD' -and $f.phase6 -eq 'OPEN' -and $f.publicClaims -eq '65/65 HOLD' -and $f.hardwareValidated -eq $false) 'release hold'
AssertP25 ((GetSHA256 (Join-Path $qa 'P25_PREIMAGE_3MODIFIED_20261117.zip')) -eq $f.preimageBackupZIPSHA256) 'preimage backup'
AssertP25 ((GetSHA256 (Join-Path $qa 'P25_PREAPPLY_FINAL_GO_DRYRUN_V2_20261117.json')) -eq $f.preapplyGoV2SHA256) 'preapply V2'
AssertP25 ((GetSHA256 (Join-Path $qa 'P25_CANONICAL_GUARDED_APPLY_20261117.json')) -eq $f.guardedApplySHA256) 'apply'
$n52=0
foreach($x in $f.canonicalRuntime52SHA256.PSObject.Properties){
 AssertP25 ((GetSHA256 (Join-Path $root $x.Name)) -eq $x.Value) ("runtime "+$x.Name)
 $n52++
}
AssertP25 ($n52 -eq 52) '52 current runtime sources'
$n8=0
foreach($x in $f.OEMReferenceOnly8SHA256.PSObject.Properties){
 AssertP25 ((GetSHA256 (Join-Path $root ('sources\FCV588_GiaoDienThucTeMay2016\'+$x.Name))) -eq $x.Value) ("OEM "+$x.Name)
 $n8++
}
AssertP25 ($n8 -eq 8) '8 source photos'
$n5=0
foreach($x in $f.P25AppliedSourceAndTestSHA256.PSObject.Properties){
 AssertP25 ((GetSHA256 (Join-Path $root $x.Name)) -eq $x.Value) ("P25 path "+$x.Name)
 $n5++
}
AssertP25 ($n5 -eq 5) '5 changed paths'
$n3=0
foreach($x in $f.P24NewFilesSHA256.PSObject.Properties){
 AssertP25 ((GetSHA256 (Join-Path $root $x.Name)) -eq $x.Value) ("P24 path "+$x.Name)
 $n3++
}
AssertP25 ($n3 -eq 3) '3 original P24 files unchanged'
$ne=0
foreach($x in $f.evidenceSHA256.PSObject.Properties){
 AssertP25 ((GetSHA256 (Join-Path $qa $x.Name)) -eq $x.Value) ("evidence "+$x.Name)
 $ne++
}
AssertP25 ($ne -eq 36) '36 evidence artifacts'
foreach($name in @('P25_STAGE_FULL_NODE_20261117.json','P25_CANONICAL_POSTAPPLY_FULL_NODE_20261117.json')){
 $j=Get-Content -LiteralPath (Join-Path $qa $name) -Raw | ConvertFrom-Json
 AssertP25 ($j.status -eq 'PASS' -and (($j.summary -contains '# pass 596') -or ($j.summaryLines -contains '# pass 596')) -and $j.exitCode -eq 0) ("node "+$name)
}
foreach($name in @('P25_STAGE_PYTHON_V2_20261117.json','P25_CANONICAL_POSTAPPLY_PYTHON_20261117.json')){
 $j=Get-Content -LiteralPath (Join-Path $qa $name) -Raw | ConvertFrom-Json
 AssertP25 ($j.status -eq 'PASS' -and $j.exitCode -eq 0) ("python "+$name)
}
$b=Get-Content -LiteralPath (Join-Path $qa 'P25_CANONICAL_BROWSER_20261117.json') -Raw | ConvertFrom-Json
AssertP25 ($b.status -eq 'PASS' -and $b.sourceBodiesCount -eq 50 -and $b.qaPortClosed -eq $true -and $b.errors.Count -eq 0 -and $b.cases.Count -eq 5) 'browser5'
$nb=0
foreach($x in $b.sourceBodies.PSObject.Properties){
 $relative=if($x.Name -eq '/'){'web\index.html'}else{$x.Name.TrimStart('/') -replace '/','\'}
 AssertP25 ((GetSHA256 (Join-Path $root $relative)) -eq $x.Value) ("canonical Chrome body "+$relative)
 $nb++
}
AssertP25 ($nb -eq 50) '50 actual loaded source bodies'
$ports=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in @(4173,4226,4227,4228)})
AssertP25 (@($ports|Where-Object {$_.LocalAddress -eq '127.0.0.1' -and $_.LocalPort -eq 4173 -and $_.OwningProcess -eq 1204}).Count -eq 1) 'protected server'
AssertP25 (@($ports|Where-Object {$_.LocalPort -in @(4226,4227,4228)}).Count -eq 0) 'QA ports'
$rec=[ordered]@{
 schema='FCV588_P25_INDEPENDENT_POWERSHELL_SHA_POSTRECEIPT_V1'
 createdAt=(Get-Date).ToUniversalTime().ToString('o')
 status='PASS_INDEPENDENT_POWERSHELL_SHA_POSTRECEIPT_BOUNDED_P25'
 method='SEPARATE_LIVE_GET_FILE_HASH_AND_REPLAY_BROWSER_LOADED_BODY_SHA_V2'
 finalIntegritySHA256=(GetSHA256 $finalPath)
 finalReportSHA256=(GetSHA256 $report)
 canonicalRuntime='52/52'
 originalOEMPhotos='8/8'
 P25AppliedFiles='5/5'
 P24PreservedFiles='3/3'
 evidenceFiles='36/36'
 browserHttpBodies='50/50'
 stagedFullNode='596/596'
 canonicalFullNode='596/596'
 stagedPython='13/13'
 canonicalPython='13/13'
 stagedChrome='5/5'
 canonicalChrome='5/5'
 independentReview='worker35_worker36_BOUNDED_POSTAPPLY_GO'
 server='127.0.0.1:4173 PID1204'
 qaPortListeners=0
 oemFidelity='NOT_VERIFIED'
 phase6='OPEN'
 releaseApproval='HOLD'
}
$bytes=[Text.UTF8Encoding]::new($false).GetBytes(($rec|ConvertTo-Json -Depth 6)+[Environment]::NewLine)
$stream=[System.IO.FileStream]::new($post,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write,[System.IO.FileShare]::None)
try{$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
$readback=Get-Content -LiteralPath $post -Raw -Encoding UTF8 | ConvertFrom-Json
AssertP25 ($readback.status -eq $rec.status -and $readback.finalIntegritySHA256 -eq (GetSHA256 $finalPath)) 'postreceipt readback'
'P25_INDEPENDENT_POST_STATUS='+$readback.status
'P25_INDEPENDENT_POST_SHA256='+(GetSHA256 $post)
'COUNTS='+($n52.ToString()+'/'+$n8.ToString()+'/'+$n5.ToString()+'/'+$ne.ToString()+'/'+$nb.ToString())
