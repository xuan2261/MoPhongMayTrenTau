# P29 independent PowerShell byte readback after Python final receipt.
# Read-only checks; writes only a new receipt using FileMode.CreateNew.
$ErrorActionPreference='Stop'
$r='C:\Work\MoPhongMayTrenTau'
$q=Join-Path $r 'docs\qa\FCV588_ELECTRON_POC_20261121'
$s=Join-Path $r 'staging\fcv588-electron-poc-20261121'
$fin=Join-Path $q 'FCV588_P29_ELECTRON_POC_FINAL_INTEGRITY_20261121.json'
$out=Join-Path $q 'FCV588_P29_ELECTRON_POC_INDEPENDENT_SHA_POSTRECEIPT_20261121.json'
if(Test-Path -LiteralPath $out){throw 'P29 postreceipt already exists'}
function SHA([string]$name){
 if(-not(Test-Path -LiteralPath $name -PathType Leaf)){throw ('Missing file '+$name)}
 return (Get-FileHash -LiteralPath $name -Algorithm SHA256).Hash.ToLowerInvariant()
}
function Need([bool]$ok,[string]$msg){if(-not $ok){throw ('P29 INDEPENDENT NO_GO '+$msg)}}
$j=Get-Content -Raw -LiteralPath $fin|ConvertFrom-Json
Need ($j.status -eq 'P29_STAGING_PORTABLE_POC_BOUNDED_PASS_NOT_RELEASE') 'final status'
Need ((SHA $fin) -eq '3af7f84251e8c838d8db188f521f9b7592eced42a3cd21090e8e878dfccf420c') 'final SHA drift'
Need ($j.releaseApproval -eq 'HOLD' -and $j.claims -eq '65/65 HOLD' -and $j.phase6 -eq 'OPEN' -and -not $j.hardwareValidated) 'unsafe release claim'
Need (-not $j.airgappedFirstInstallValidated -and -not $j.installerBuilt -and $j.unsigned -and -not $j.electronFusesHardened) 'missing HOLD caveat'
$parent='docs\qa\FCV588_P28_MODE_VISUAL_20261117\'
Need ((SHA (Join-Path $r ($parent+'FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json'))) -eq $j.parentP28FinalSHA256) 'P28 final drift'
Need ((SHA (Join-Path $r ($parent+'FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_20261117.json'))) -eq $j.parentP28IndependentPostSHA256) 'P28 post drift'
$baseline=Get-Content -Raw (Join-Path $r ($parent+'FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json'))|ConvertFrom-Json
$runtime=0
foreach($p in $baseline.P27Runtime54UnchangedSHA256.PSObject.Properties){
 Need ((SHA (Join-Path $r $p.Name)) -eq $p.Value) ('P28 runtime '+$p.Name)
 $runtime++
}
Need ($runtime -eq 54) 'runtime54 count'
$oem=0
foreach($p in $baseline.OEMReferenceOnly8SHA256.PSObject.Properties){
 Need ((SHA (Join-Path $r ('sources\FCV588_GiaoDienThucTeMay2016\'+$p.Name))) -eq $p.Value) ('OEM '+$p.Name)
 $oem++
}
Need ($oem -eq 8) 'OEM8 count'
Need ((SHA (Join-Path $r 'sources\manuals\FCV-588\FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf')) -eq $baseline.manualSHA256) 'manual'
$exe=Join-Path $s 'dist\FCV588-Synthetic-POC-win32-x64\FCV588-Synthetic-POC.exe'
$asar=Join-Path $s 'dist\FCV588-Synthetic-POC-win32-x64\resources\app.asar'
$zip=Join-Path $q 'P29_FCV588_ELECTRON_PORTABLE_WIN_X64_20261121.zip'
Need ((SHA $exe) -eq $j.packagedExeSHA256 -and $j.packagedExeSHA256 -eq '40d554e62de4dec79458a5e8ad73b7c2e709641b576f1ec35056cada6a887bc3') 'EXE bytes'
Need ((SHA $asar) -eq $j.packagedAsarSHA256 -and $j.packagedAsarSHA256 -eq 'c764efae9eeb2f5ca06f60daa6ae92fef44b4e13fd2195a39c55f6ac8c307726') 'ASAR bytes'
Need ((SHA $zip) -eq $j.portableZIPSHA256 -and $j.portableZIPSHA256 -eq 'bb179f82b5daab38e4434c0bf8c6148fdf5d99bbe8540fd1cbd16946bda7b061') 'ZIP bytes'
Need ((Get-Item -LiteralPath $zip).Length -eq $j.portableZIPBytes) 'ZIP size'
$sourceAudit=Join-Path $q 'P29_ASAR_SOURCE_AUDIT_V3_20261121.json'
Need ((SHA $sourceAudit) -eq $j.ASARSourceAuditSHA256) 'source audit SHA'
$a=Get-Content -Raw -LiteralPath $sourceAudit|ConvertFrom-Json
Need ($a.asarPackagedFiles -eq 58 -and $a.approvedWebSrcFiles -eq 56 -and $a.forbiddenOEMReferenceFiles -eq 0 -and $a.foreignNodePackagesOrTests -eq 0) 'ASAR file scope'
$e2ePath=Join-Path $q 'P29_PACKAGED_E2E_V5_20261121.json'
Need ((SHA $e2ePath) -eq $j.packagedE2EReceiptSHA256) 'E2E SHA'
$e2e=Get-Content -Raw -LiteralPath $e2ePath|ConvertFrom-Json
Need ($e2e.status -eq 'PASS' -and $e2e.cases.Count -eq 25 -and $e2e.errors.Count -eq 0) 'E2E 25/25'
Need ((@($e2e.reloadedTransportURLs|Where-Object {$_ -notlike 'app://fcv588/*'})).Count -eq 0) 'external page resource'
Need ((SHA (Join-Path $q 'P29_SETTINGS_EXPORTED_V5_20261121.json')) -eq $j.savedSettingsTransferSHA256) 'settings export SHA'
foreach($p in $e2e.screenshots.PSObject.Properties){Need ((SHA (Join-Path $q $p.Name)) -eq $p.Value) 'E2E screenshot'}
foreach($p in $j.stagedRegressionTestsSHA256.PSObject.Properties){Need ((SHA (Join-Path $q $p.Name)) -eq $p.Value) 'staged test log'}
Need ((SHA (Join-Path $q 'README_P29_ELECTRON_POC_20261121.md')) -eq $j.readmeSHA256) 'README'
Need ((SHA (Join-Path $q 'P29_LEGACY_BROWSER_SETTINGS_EXPORT_20261121.js')) -eq $j.legacyBrowserSettingsExportHelperSHA256) 'migration helper'
Need ((SHA (Join-Path $q 'FCV588_P29_ELECTRON_POC_FINAL_REPORT_20261121.md')) -eq $j.finalReportSHA256) 'final report'
foreach($p in $j.failedAttemptsPreservedSHA256.PSObject.Properties){Need ((SHA (Join-Path $q $p.Name)) -eq $p.Value) 'preserved failed log'}
$zipSmoke=Join-Path $q 'P29_EXTRACTED_ZIP_NATIVE_SMOKE_V1_20261121.txt'
Need ((SHA $zipSmoke) -eq '6ac34e9e1537ad77c3c2657701e50ff0acf38f6d6b24a09e1113dadba019f9ce') 'extracted ZIP smoke receipt'
Need (-not(Test-Path (Join-Path $q '_p29_owned_zip_smoke_v1'))) 'owned unzip residue'
$sign=Get-AuthenticodeSignature -LiteralPath $exe
Need ($sign.Status -eq 'NotSigned') 'signature claim'
$listeners=@(Get-NetTCPConnection -State Listen -LocalPort 4173 -ErrorAction SilentlyContinue|Where-Object {$_.LocalAddress -eq '127.0.0.1'})
Need ($listeners.Count -eq 1 -and $listeners[0].OwningProcess -eq 1204) 'protected user server4173 changed'
$ownedProcesses=@(Get-CimInstance Win32_Process -Filter "name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue)
Need ($ownedProcesses.Count -eq 0) 'test Electron left running'
$receipt=[ordered]@{
 schema='FCV588_P29_ELECTRON_POC_INDEPENDENT_POSTRECEIPT_V1'
 status='P29_INDEPENDENT_SHA_READBACK_PASS_POC_ONLY'
 createdUTC=[DateTimeOffset]::UtcNow.ToString('o')
 method='Read-only PowerShell Get-FileHash and system readback'
 finalIntegritySHA256=(SHA $fin)
 parentP28FinalSHA256=$j.parentP28FinalSHA256
 parentP28PostSHA256=$j.parentP28IndependentPostSHA256
 runtime54Unchanged=$runtime
 OEMReferenceOnly8Unchanged=$oem
 packagedExeSHA256=(SHA $exe)
 packagedAsarSHA256=(SHA $asar)
 portableZIPSHA256=(SHA $zip)
 portableZIPBytes=$j.portableZIPBytes
 ASARFileCount=$a.asarPackagedFiles
 E2EPassCount=$e2e.cases.Count
 ZIPExtractionSmokeSHA256=(SHA $zipSmoke)
 userServer4173PID=1204
 remainingOwnedPocProcesses=0
 codeSignature='NotSigned'
 airgappedVMInstallValidated=$false
 installerBuilt=$false
 electronFusesHardened=$false
 hardwareValidated=$false
 releaseApproval='HOLD'
}
$json=$receipt|ConvertTo-Json -Depth 9
$bytes=(New-Object System.Text.UTF8Encoding($false)).GetBytes($json+[Environment]::NewLine)
$stream=[System.IO.File]::Open($out,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write)
try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
Write-Output ('P29_INDEPENDENT_POC_POSTRECEIPT_PASS SHA='+ (SHA $out))
