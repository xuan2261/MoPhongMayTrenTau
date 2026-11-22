$ErrorActionPreference='Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class P31Win32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll")] public static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr data);
}
'@
$root='C:\Work\MoPhongMayTrenTau'
$exe=Join-Path $env:LOCALAPPDATA 'Programs\fcv588-synthetic-electron-poc\FCV588-Synthetic-POC.exe'
$qa=Join-Path $root 'docs\qa\FCV588_ELECTRON_P31_NATIVE_A11Y_20261121'
$profile=Join-Path $qa 'profile-native-power-blur-v1'
$receipt=Join-Path $qa 'P31_NATIVE_POWER_WIN32_FOCUS_BLUR_V1_20261121.json'
if((Test-Path $profile) -or (Test-Path $receipt)){throw 'QA_PATH_ALREADY_EXISTS'}
if(@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue).Count){throw 'APP_ALREADY_RUNNING'}
if((Get-FileHash $exe).Hash.ToLower() -ne '79512e2b520a590e19cd1893c19b0a6fd1c79abb56efcd9c5e83e7613a4fa5fd'){throw 'INSTALLED_EXE_DRIFT'}
$env:FCV588_POC_PROFILE_DIR=$profile
$p=$null;$helper=$null;$spaceDown=$false
$report=[ordered]@{schema='FCV588_P31_NATIVE_POWER_BLUR_V1';status='IN_PROGRESS';qaProfile=$profile;test='POWER SpaceDown, true OS foreground switch, SpaceUp';events=@();checks=@();errors=@();releaseApproval='HOLD';sourceBoundEventCount=$false}
function Find-AppWindow([int[]]$PIDs) {
  $roots=[Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children,[Windows.Automation.Condition]::TrueCondition)
  foreach($r in $roots){if($PIDs -contains $r.Current.ProcessId -and $r.Current.Name -like '*FCV-588*'){return $r}}
  return $null
}
function Read-EventCount($w) {
  $nodes=$w.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
  for($i=0;$i -lt ($nodes.Count-1);$i++){
    if($nodes[$i].Current.Name -eq 'SỰ KIỆN' -and $nodes[$i+1].Current.Name -match '^\d+$'){
      return [int]$nodes[$i+1].Current.Name
    }
  }
  throw 'EVENT_COUNT_UIA_NOT_FOUND'
}
function FindButton($w,[string]$prefix) {
  $nodes=$w.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
  foreach($n in $nodes){
    try{if($n.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $n.Current.Name.StartsWith($prefix)){return $n}}catch{}
  }
  throw ('BUTTON_NOT_FOUND '+$prefix)
}
try {
  $p=Start-Process -FilePath $exe -PassThru
  Start-Sleep -Seconds 5
  $ps=@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" | Where-Object {$_.ExecutablePath -eq $exe})
  $ids=@($ps | ForEach-Object {$_.ProcessId})
  $w=Find-AppWindow $ids
  if(!$w){throw 'NO_VISIBLE_APP_HWND'}
  $hwnd=[IntPtr]$w.Current.NativeWindowHandle
  if($hwnd -eq [IntPtr]::Zero){throw 'NO_NATIVE_WINDOW_HANDLE'}
  $report.appWindowHWND=$hwnd.ToInt64();$report.appPID=$w.Current.ProcessId
  $pause=FindButton $w 'Tạm dừng thời gian'
  $pause.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()
  Start-Sleep -Milliseconds 400
  $baseline=Read-EventCount $w
  $report.eventCountBefore=$baseline
  $report.checks+='APP_PAUSED_WITH_NATIVE_UIA'
  $power=FindButton $w 'Nguồn và độ sáng'
  $power.SetFocus()
  Start-Sleep -Milliseconds 200
  if(!$power.Current.HasKeyboardFocus){throw 'POWER_NATIVE_FOCUS_FAILED'}
  [void][P31Win32]::SetForegroundWindow($hwnd)
  Start-Sleep -Milliseconds 250
  $fg=[P31Win32]::GetForegroundWindow()
  $report.foregroundBefore=$fg.ToInt64()
  if($fg -ne $hwnd){throw 'HARNESS_BLOCKED_APP_NOT_WIN32_FOREGROUND'}
  $report.checks+='POWER_APP_WIN32_FOREGROUND'
  [P31Win32]::keybd_event(0x20,0,0,[UIntPtr]::Zero)
  $spaceDown=$true
  Start-Sleep -Milliseconds 250
  $report.eventCountAfterSpaceDown=Read-EventCount $w
  $helper=New-Object System.Windows.Forms.Form
  $helper.Text='P31 FCV588 QA Focus Helper'
  $helper.Width=280;$helper.Height=120
  $helper.StartPosition='CenterScreen'
  $helper.Show();$helper.Activate()
  [void][P31Win32]::SetForegroundWindow($helper.Handle)
  Start-Sleep -Milliseconds 450
  $helperFg=[P31Win32]::GetForegroundWindow()
  $report.helperWindowHWND=$helper.Handle.ToInt64()
  $report.foregroundHelper=$helperFg.ToInt64()
  if($helperFg -ne $helper.Handle){throw 'HARNESS_BLOCKED_HELPER_NOT_WIN32_FOREGROUND'}
  $report.checks+='REAL_HELPER_WIN32_FOREGROUND'
  [P31Win32]::keybd_event(0x20,0,2,[UIntPtr]::Zero)
  $spaceDown=$false
  Start-Sleep -Milliseconds 350
  [void][P31Win32]::SetForegroundWindow($hwnd)
  Start-Sleep -Milliseconds 350
  $report.foregroundAfter=[P31Win32]::GetForegroundWindow().ToInt64()
  $after=Read-EventCount $w
  $report.eventCountAfterBlurAndKeyUp=$after
  $report.sourceBoundEventCount=$true
  $nodeNames=@($w.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition) | ForEach-Object {$_.Current.Name})
  $report.powerOffAfterBlur=($nodeNames -contains 'POWER OFF')
  if($report.eventCountAfterSpaceDown -ne $baseline+1){throw 'POWER_DOWN_EVENT_COUNT_MISMATCH'}
  if($after -ne $baseline+2){throw 'POWER_BLUR_CANCEL_EVENT_COUNT_MISMATCH'}
  if(!$report.powerOffAfterBlur){throw 'POWER_UNEXPECTEDLY_ON'}
  $report.checks+='EXACT_DOWN_PLUS_BLUR_CANCEL_TWO_EVENTS'
  $report.checks+='POWER_REMAINS_OFF_AFTER_HELPER_KEYUP'
  $report.status='PASS'
}catch {
  $report.status=if($_.Exception.Message -like 'HARNESS_BLOCKED*'){'BLOCKED'}else{'FAILED'}
  $report.errors+=($_.Exception.ToString())
}finally {
  if($spaceDown){[P31Win32]::keybd_event(0x20,0,2,[UIntPtr]::Zero)}
  if($helper){$helper.Close();$helper.Dispose()}
  if($p){
    foreach($c in @(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue)){
      if($c.ExecutablePath -eq $exe){Stop-Process -Id $c.ProcessId -Force -ErrorAction SilentlyContinue}
    }
  }
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($report|ConvertTo-Json -Depth 9)+"`n")
  $f=[IO.File]::Open($receipt,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$f.Write($bytes,0,$bytes.Length)}finally{$f.Dispose()}
  Write-Output ('POWER_BLUR='+$report.status+' EVENTS='+$report.eventCountBefore+'/'+$report.eventCountAfterSpaceDown+'/'+$report.eventCountAfterBlurAndKeyUp)
  Write-Output ('RECEIPT_SHA='+((Get-FileHash $receipt -Algorithm SHA256).Hash.ToLower()))
  if($report.errors.Count){Write-Output ('ERROR='+$report.errors[0])}
}
if($report.status -ne 'PASS'){exit 3}
