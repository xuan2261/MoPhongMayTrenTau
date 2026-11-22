$ErrorActionPreference='Stop'
$root='C:\Work\MoPhongMayTrenTau'
$qa=Join-Path $root 'docs\qa\FCV588_ELECTRON_P32_RELEASE_READINESS_20261121'
$out=Join-Path $qa 'P32_P30_VS_P31_WINDOWS_CPU_PRIVATE_MEMORY_V1_20261121.json'
if(Test-Path $out){throw 'IMMUTABLE_BENCHMARK_RECEIPT_ALREADY_EXISTS'}
$exe=@{
  P30=Join-Path $root 'staging\fcv588-electron-installer-p30-20261121\dist-p30-v2\win-unpacked\FCV588-Synthetic-POC.exe'
  P31=Join-Path $root 'staging\fcv588-native-accessibility-p31-20261121\dist-p31\win-unpacked\FCV588-Synthetic-POC.exe'
}
$expected=@{
  P30='8db6a2dbe8b6f419a9a21acc5e3fab281585257bde313b940f0a0afd6bacf6c9'
  P31='79512e2b520a590e19cd1893c19b0a6fd1c79abb56efcd9c5e83e7613a4fa5fd'
}
foreach($key in @('P30','P31')){if((Get-FileHash $exe[$key]).Hash.ToLower() -ne $expected[$key]){throw ('APP_SHA_DRIFT '+$key)}}
if(@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue).Count){throw 'EXISTING_APP_PROCESS'}
$profile=@{
  P30=Join-Path $qa 'benchmark-profile-P30'
  P31=Join-Path $qa 'benchmark-profile-P31'
}
foreach($p in $profile.Values){if(Test-Path $p){throw 'PROFILE_ALREADY_EXISTS'}}
if((Get-PSDrive C).Free -lt 1GB){throw 'DISK_SPACE_BELOW_1GB'}
$runs=@()
$order=@('P30','P31','P31','P30','P30','P31')
$result=[ordered]@{
  schema='FCV588_P32_WINDOWS_P30_P31_RESOURCE_COMPARISON_V1'
  status='IN_PROGRESS'
  host='REAL_WINDOWS_NOT_VM'
  method='serial paired ABBA-like ordering, 3 pairs, 5s warmup + 5s per run, 1s polling, same power-off idle synthetic world'
  metricCpu='Sum CPU seconds for exact executable path across Electron child processes divided by sampled wall seconds (percent of one logical core)'
  metricMemory='Sum PrivateMemorySize64 across exact executable path; median sample MiB; per-process private bytes avoids double-counting shared working set'
  sampleSeconds=5
  warmupSeconds=5
  repetitionsPerVariant=3
  comparisonScope='Idle POWER OFF synthetic app only, not loaded LCD / Narrator spoken output'
  cores=[Environment]::ProcessorCount
  runs=@()
  releaseApproval='HOLD'
  physicalAirgapVerified=$false
}
function Get-AppSnapshot([string]$path) {
  $all=@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue | Where-Object {$_.ExecutablePath -eq $path})
  $cpu=0.0; $private=0.0; $working=0.0
  foreach($p in $all){
    try{
      $obj=Get-Process -Id $p.ProcessId -ErrorAction Stop
      $cpu+=$obj.TotalProcessorTime.TotalSeconds
      $private+=$obj.PrivateMemorySize64
      $working+=$obj.WorkingSet64
    }catch{}
  }
  return [pscustomobject]@{cpuSec=$cpu;privateMiB=$private/1MB;workingSetMiB=$working/1MB;count=$all.Count;pids=@($all|ForEach-Object {$_.ProcessId})}
}
function Median([double[]]$values){
  $s=@($values|Sort-Object)
  if(!$s.Count){throw 'NO_SAMPLES'}
  if($s.Count%2){return [double]$s[[int][Math]::Floor($s.Count/2)]}
  return ([double]$s[$s.Count/2-1]+[double]$s[$s.Count/2])/2
}
try {
  for($i=0;$i -lt $order.Count;$i++){
    $arm=$order[$i]
    if(@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue).Count){throw 'PREEXISTING_FCV588_PROCESS_DURING_BENCH'}
    if((Get-PSDrive C).Free -lt 1GB){throw 'DISK_SPACE_BELOW_1GB_DURING_BENCH'}
    $env:FCV588_POC_PROFILE_DIR=$profile[$arm]
    $proc=$null
    try{
      $proc=Start-Process -FilePath $exe[$arm] -PassThru -WindowStyle Normal
      Start-Sleep -Seconds 5
      $before=Get-AppSnapshot $exe[$arm]
      if(($before.pids -notcontains $proc.Id) -or $before.count -lt 3){throw ('APP_DID_NOT_LAUNCH '+$arm)}
      $t0=[Diagnostics.Stopwatch]::StartNew()
      $memory=@([double]$before.privateMiB)
      $working=@([double]$before.workingSetMiB)
      $counts=@($before.count)
      for($j=0;$j -lt 5;$j++){
        Start-Sleep -Seconds 1
        $sample=Get-AppSnapshot $exe[$arm]
        $memory+=([double]$sample.privateMiB)
        $working+=([double]$sample.workingSetMiB)
        $counts+=$sample.count
      }
      $t0.Stop()
      $last=Get-AppSnapshot $exe[$arm]
      if($last.pids -notcontains $proc.Id){throw 'MAIN_PROCESS_EXITED'}
      $cpuSeconds=([double]$last.cpuSec-[double]$before.cpuSec)
      if($cpuSeconds -lt 0){throw 'NEGATIVE_CPU_DELTA'}
      $one=[ordered]@{
        index=$i+1
        pair=[int][Math]::Floor($i/2)+1
        variant=$arm
        exeSHA256=$expected[$arm]
        qaProfile=$profile[$arm]
        wallSeconds=[Math]::Round($t0.Elapsed.TotalSeconds,3)
        cpuSeconds=[Math]::Round($cpuSeconds,4)
        cpuPercentOneCore=[Math]::Round($cpuSeconds/$t0.Elapsed.TotalSeconds*100,3)
        medianPrivateMiB=[Math]::Round((Median $memory),3)
        medianWorkingSetMiB=[Math]::Round((Median $working),3)
        privateMiBSamples=@($memory|ForEach-Object {[Math]::Round($_,3)})
        processCounts=$counts
      }
      $runs+=$one
      Write-Output ('RUN '+($i+1)+'/6 '+$arm+' CPU_ONE_CORE='+$one.cpuPercentOneCore+'% PRIVATE_MIB='+$one.medianPrivateMiB+' PROCS='+($counts -join ','))
    }finally{
      foreach($child in @(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue)){
        if($child.ExecutablePath -eq $exe[$arm]){Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue}
      }
      Start-Sleep -Milliseconds 600
    }
  }
  if($runs.Count -ne 6){throw 'INCOMPLETE_PAIR_COUNT'}
  $result.status='PASS_RAW_DATA'
}catch{
  $result.status='FAILED'
  $result.error=$_.Exception.ToString()
}finally {
  $result.runs=$runs
  $result.profileCount=@($profile.Values|Where-Object {Test-Path $_}).Count
  $result.freeDiskGBAtEnd=[Math]::Round((Get-PSDrive C).Free/1GB,3)
  $result.appProcessesAfter=@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue).Count
  if($result.appProcessesAfter -ne 0){$result.status='FAILED_CLEANUP'}
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($result|ConvertTo-Json -Depth 10)+"`n")
  $f=[IO.File]::Open($out,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$f.Write($bytes,0,$bytes.Length)}finally{$f.Dispose()}
  Write-Output ('BENCHMARK='+$result.status+' RUNS='+$runs.Count+' PROFILE_COUNT='+$result.profileCount+' REMAINING_DISK_GB='+$result.freeDiskGBAtEnd)
  Write-Output ('RECEIPT_SHA256='+((Get-FileHash $out -Algorithm SHA256).Hash.ToLower()))
}
if($result.status -ne 'PASS_RAW_DATA'){exit 3}
