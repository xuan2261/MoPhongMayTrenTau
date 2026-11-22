$ErrorActionPreference='Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
$exe=Join-Path $env:LOCALAPPDATA 'Programs\fcv588-synthetic-electron-poc\FCV588-Synthetic-POC.exe'
$qa='C:\Work\MoPhongMayTrenTau\docs\qa\FCV588_ELECTRON_P30_INSTALLER_20261121'
$profile=Join-Path $qa 'profile-native-keyboard-v3-20261121'
$receipt=Join-Path $qa 'P30_NATIVE_KEYBOARD_FOCUS_V3_20261121.json'
if((Test-Path $profile) -or (Test-Path $receipt)){throw 'FAIL_CLOSED_EXISTING_QA'}
if(@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue).Count){throw 'FCV_PROCESS_ALREADY_RUNNING'}
$env:FCV588_POC_PROFILE_DIR=$profile
$p=$null
$result=[ordered]@{schema='FCV588_P30_NATIVE_KEYBOARD_V1';status='IN_PROGRESS';forcedAccessibility=$true;controls=@{};checks=@();errors=@();focusLossContract='NOT_YET_VERIFIED';releaseApproval='HOLD'}
try{
  $p=Start-Process -FilePath $exe -ArgumentList '--force-renderer-accessibility=complete' -PassThru
  Start-Sleep -Seconds 5
  $ids=@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" | Where-Object {$_.ExecutablePath -eq $exe} | ForEach-Object {$_.ProcessId})
  $windows=[Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children,[Windows.Automation.Condition]::TrueCondition)
  $window=$null
  foreach($w in $windows){if($ids -contains $w.Current.ProcessId -and $w.Current.Name -like '*FCV-588*'){$window=$w;break}}
  if(!$window){throw 'APP_WINDOW_NOT_FOUND'}
  $result.windowName=$window.Current.Name
  $result.windowPID=$window.Current.ProcessId
  $nodes=$window.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
  $result.descendantCount=$nodes.Count
  $buttons=@{}
  foreach($node in $nodes){
    try{
      if($node.Current.ControlType -ne [Windows.Automation.ControlType]::Button){continue}
      $n=$node.Current.Name
      foreach($key in @('GAIN','MODE','POWER')){
        $match=if($key -eq 'POWER'){$n -like 'Nguồn và độ sáng*'}else{$n -like ($key+':*')}
        if($match){$buttons[$key]=$node}
      }
    }catch{}
  }
  foreach($key in @('GAIN','MODE','POWER')){
    if(!$buttons.ContainsKey($key)){throw ('MISSING_UIA_BUTTON_'+$key)}
    $n=$buttons[$key]
    if(!$n.Current.IsKeyboardFocusable -or $n.Current.IsOffscreen){throw ('BUTTON_NOT_USABLE_'+$key)}
    $result.controls[$key]=[ordered]@{name=$n.Current.Name;type=$n.Current.ControlType.ProgrammaticName;focusable=$n.Current.IsKeyboardFocusable;offscreen=$n.Current.IsOffscreen}
    $result.checks+=('BUTTON_'+$key+'_VISIBLE_AND_FOCUSABLE')
  }
  $buttons.GAIN.SetFocus()
  Start-Sleep -Milliseconds 300
  if(!$buttons.GAIN.Current.HasKeyboardFocus){throw 'GAIN_SETFOCUS_FAILED'}
  $result.checks+='GAIN_FOCUSED'
  [System.Windows.Forms.SendKeys]::SendWait('{TAB}')
  Start-Sleep -Milliseconds 400
  if(!$buttons.MODE.Current.HasKeyboardFocus){throw 'TAB_GAIN_TO_MODE_FAILED'}
  $result.checks+='TAB_GAIN_TO_MODE'
  [System.Windows.Forms.SendKeys]::SendWait('{TAB}')
  Start-Sleep -Milliseconds 400
  if(!$buttons.POWER.Current.HasKeyboardFocus){throw 'TAB_MODE_TO_POWER_FAILED'}
  $result.checks+='TAB_MODE_TO_POWER'
  $buttons.GAIN.SetFocus()
  Start-Sleep -Milliseconds 200
  [System.Windows.Forms.SendKeys]::SendWait('{RIGHT}')
  Start-Sleep -Milliseconds 500
  $result.gainNameAfterArrow=$buttons.GAIN.Current.Name
  if($result.gainNameAfterArrow -eq $result.controls.GAIN.name){throw 'GAIN_ARROW_NAME_DID_NOT_CHANGE'}
  $result.checks+='GAIN_ARROW_CHANGED_ACCESSIBLE_NAME'
  $buttons.MODE.SetFocus()
  Start-Sleep -Milliseconds 200
  [System.Windows.Forms.SendKeys]::SendWait('{RIGHT}')
  Start-Sleep -Milliseconds 500
  $result.modeNameAfterArrow=$buttons.MODE.Current.Name
  if($result.modeNameAfterArrow -eq $result.controls.MODE.name){throw 'MODE_ARROW_NAME_DID_NOT_CHANGE'}
  $result.checks+='MODE_ARROW_CHANGED_ACCESSIBLE_NAME'
  $result.status='PASS'
}catch{
  $result.status='FAILED'
  $result.errors+=($_.Exception.ToString())
}finally{
  if($p){
    foreach($proc in @(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue)){
      if($proc.ExecutablePath -eq $exe){Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue}
    }
  }
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($result|ConvertTo-Json -Depth 9)+"`n")
  $stream=[IO.File]::Open($receipt,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
  Write-Output ('STATUS='+$result.status+' CHECKS='+$result.checks.Count+' ERRORS='+$result.errors.Count)
  Write-Output ('RECEIPT_SHA='+((Get-FileHash $receipt -Algorithm SHA256).Hash.ToLower()))
  if($result.errors.Count){Write-Output ('ERROR='+$result.errors[0])}
}
if($result.status -ne 'PASS'){exit 3}
