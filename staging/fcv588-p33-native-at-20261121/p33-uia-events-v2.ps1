$ErrorActionPreference='Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Windows.Automation;
public sealed class P33UIAEvents : IDisposable {
  private readonly int[] allowed;
  private readonly AutomationElement scope;
  private readonly AutomationFocusChangedEventHandler focus;
  private readonly AutomationEventHandler live;
  private readonly string[] events = new string[80];
  private int count=0;
  public P33UIAEvents(AutomationElement window, int[] processIds){
    scope=window;
    allowed=processIds;
    focus=new AutomationFocusChangedEventHandler(OnFocus);
    live=new AutomationEventHandler(OnLive);
    Automation.AddAutomationFocusChangedEventHandler(focus);
    Automation.AddAutomationEventHandler(AutomationElementIdentifiers.LiveRegionChangedEvent,scope,TreeScope.Subtree,live);
  }
  private void Capture(string category,object o){
    try{
      var a=o as AutomationElement;
      if(a==null || Array.IndexOf(allowed,a.Current.ProcessId)<0) return;
      string n=a.Current.Name ?? "";
      n=n.Replace("\r"," ").Replace("\n"," ");
      if(n.Length>120)n=n.Substring(0,120);
      lock(events){if(count<events.Length)events[count++]=category+"|"+a.Current.ProcessId+"|"+a.Current.ControlType.ProgrammaticName+"|"+n;}
    }catch{}
  }
  private void OnFocus(object sender,AutomationFocusChangedEventArgs e){Capture("FOCUS",sender);}
  private void OnLive(object sender,AutomationEventArgs e){Capture("LIVE_REGION",sender);}
  public string[] Snapshot(){lock(events){string[] copy=new string[count];Array.Copy(events,copy,count);return copy;}}
  public void Dispose(){
    try{Automation.RemoveAutomationFocusChangedEventHandler(focus);}catch{}
    try{Automation.RemoveAutomationEventHandler(AutomationElementIdentifiers.LiveRegionChangedEvent,scope,live);}catch{}
  }
}
'@ -ReferencedAssemblies @([Windows.Automation.AutomationElement].Assembly.Location,[Windows.Automation.TreeScope].Assembly.Location,'System.Threading.dll')
$root='C:\Work\MoPhongMayTrenTau'
$qa=Join-Path $root 'docs\qa\FCV588_ELECTRON_P33_NARRATOR_AT_20261121'
$exe=Join-Path $env:LOCALAPPDATA 'Programs\fcv588-synthetic-electron-poc\FCV588-Synthetic-POC.exe'
$profile=Join-Path $qa 'p33-uia-profile-v2'
$receipt=Join-Path $qa 'P33_INSTALLED_P31_NATIVE_UIA_FOCUS_LIVE_V2_20261121.json'
if((Test-Path $profile) -or (Test-Path $receipt)){throw 'FAIL_CLOSED_EXISTING_QA_PATH'}
if((Get-FileHash $exe).Hash.ToLower() -ne '79512e2b520a590e19cd1893c19b0a6fd1c79abb56efcd9c5e83e7613a4fa5fd'){throw 'INSTALLED_P31_SHA_DRIFT'}
if(@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue).Count -gt 0){throw 'EXISTING_FCV_PROCESS'}
if(@(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {$_.Name -in @('Narrator.exe','nvda.exe')}).Count -gt 0){throw 'PREEXISTING_SCREENREADER_PROCESS'}
$env:FCV588_POC_PROFILE_DIR=$profile
$started=$null
$listener=$null
$report=[ordered]@{schema='P33_NATIVE_UIA_ANNOUNCEMENT_SURROGATE_V2';status='IN_PROGRESS';installedVersion='0.0.3';narratorLaunched=$false;nvdaLaunched=$false;spokenAudioVerified=$false;uiAutomationFocusEvents=@();uiAutomationLiveRegionEvents=@();controls=@{};actions=@();errors=@();releaseApproval='HOLD'}
try{
  $started=Start-Process -FilePath $exe -PassThru
  Start-Sleep -Seconds 5
  $owned=@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue | Where-Object {$_.ExecutablePath -eq $exe})
  $ids=@($owned|ForEach-Object {[int]$_.ProcessId})
  if($ids -notcontains $started.Id){throw 'NATIVE_MAIN_NOT_ALIVE'}
  $window=$null
  foreach($element in [Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children,[Windows.Automation.Condition]::TrueCondition)){
    if($ids -contains $element.Current.ProcessId -and $element.Current.Name -like '*FCV-588*'){$window=$element;break}
  }
  if(!$window){throw 'FCV_WINDOW_UIA_MISSING'}
  $report.windowName=$window.Current.Name
  $report.mainPID=$started.Id
  $report.processCount=$ids.Count
  $nodes=$window.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
  $report.descendantCount=$nodes.Count
  $control=@{}
  foreach($node in $nodes){
    try{
      if($node.Current.ControlType -ne [Windows.Automation.ControlType]::Button){continue}
      $name=$node.Current.Name
      if($name -like 'GAIN:*'){$control.GAIN=$node}
      elseif($name -like 'MODE:*'){$control.MODE=$node}
      elseif($name -like 'Nguồn và độ sáng*'){$control.POWER=$node}
    }catch{}
  }
  foreach($key in @('GAIN','MODE','POWER')){
    if(!$control.ContainsKey($key)){throw ('MISSING_NATIVE_BUTTON_'+$key)}
    if(!$control[$key].Current.IsKeyboardFocusable -or $control[$key].Current.IsOffscreen){throw ('INACCESSIBLE_BUTTON_'+$key)}
    $report.controls[$key]=[ordered]@{name=$control[$key].Current.Name;type=$control[$key].Current.ControlType.ProgrammaticName;focusable=$true}
  }
  $listener=[P33UIAEvents]::new($window,$ids)
  foreach($key in @('GAIN','MODE','POWER')){
    $control[$key].SetFocus()
    Start-Sleep -Milliseconds 400
    if(!$control[$key].Current.HasKeyboardFocus){throw ('FOCUS_NOT_OBSERVED_'+$key)}
    $report.actions+=($key+'_SETFOCUS_PASS')
  }
  $powerBefore=@($window.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)|ForEach-Object {$_.Current.Name})
  if($powerBefore -notcontains 'POWER OFF'){throw 'POWER_BEFORE_NOT_OFF'}
  $control.POWER.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()
  Start-Sleep -Seconds 2
  $namesAfter=@($window.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)|ForEach-Object {$_.Current.Name})
  $report.powerOffAfterNativeInvoke=($namesAfter -contains 'POWER OFF')
  $report.bootOrRunningTextObserved=@($namesAfter|Where-Object {$_ -match 'BOOT|RUNNING|DEMO DATA'}|Select-Object -First 8)
  if($report.powerOffAfterNativeInvoke -or $report.bootOrRunningTextObserved.Count -eq 0){throw 'POWER_NATIVE_INVOKE_STATE_NOT_CONFIRMED'}
  $report.actions+='POWER_INVOKE_OFF_TO_BOOT_OR_RUNNING_PASS'
  $events=$listener.Snapshot()
  $report.uiAutomationFocusEvents=@($events|Where-Object {$_ -like 'FOCUS|*'})
  $report.uiAutomationLiveRegionEvents=@($events|Where-Object {$_ -like 'LIVE_REGION|*'})
  $sequence=@('GAIN','MODE','POWER')
  $position=0
  foreach($eventLine in $report.uiAutomationFocusEvents){
    $columns=$eventLine -split '\|',4
    if($columns.Count -ne 4 -or $columns[2] -ne 'ControlType.Button'){continue}
    $expected=$sequence[$position]
    $matching= switch($expected){
      'GAIN' { $columns[3] -like 'GAIN:*' }
      'MODE' { $columns[3] -like 'MODE:*' }
      'POWER' { $columns[3] -like 'Nguồn và độ sáng*' }
    }
    if($matching){$position++}
    if($position -eq $sequence.Count){break}
  }
  $report.focusSequenceVerified=($position -eq 3)
  if($report.focusSequenceVerified -and $report.actions.Count -eq 4){$report.status='PASS_NATIVE_UIA_FOCUS_SURROGATE'}
  else{$report.status='PARTIAL_FOCUS_EVENT_DELIVERY'}
}catch{
  $report.status='FAILED'
  $report.errors+=($_.Exception.ToString())
}finally{
  if($listener){$listener.Dispose()}
  $cleanupCandidates=@()
  if($started){
    $cleanupCandidates=@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue | Where-Object {$_.ExecutablePath -eq $exe})
    $report.cleanupOwnedPids=@($cleanupCandidates | ForEach-Object {$_.ProcessId})
    foreach($item in $cleanupCandidates){
      $check=Get-CimInstance Win32_Process -Filter ("ProcessId="+$item.ProcessId) -ErrorAction SilentlyContinue
      if($check -and $check.ExecutablePath -eq $exe -and $check.CreationDate -eq $item.CreationDate){
        Stop-Process -Id $item.ProcessId -Force -ErrorAction SilentlyContinue
      }
    }
  }
  $remaining=@()
  $deadline=(Get-Date).AddSeconds(10)
  do{
    Start-Sleep -Milliseconds 250
    $remaining=@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue | Where-Object {$_.ExecutablePath -eq $exe})
  }while($remaining.Count -gt 0 -and (Get-Date) -lt $deadline)
  $report.cleanupWaitMilliseconds=10000
  $report.fcv588ProcessesRemaining=$remaining.Count
  if($remaining.Count -ne 0){$report.status='FAILED_CLEANUP'}
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($report|ConvertTo-Json -Depth 9)+"`n")
  $file=[IO.File]::Open($receipt,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$file.Write($bytes,0,$bytes.Length)}finally{$file.Dispose()}
  Write-Output ('P33_UIA='+$report.status+' ACTIONS='+$report.actions.Count+' FOCUS_EVENTS='+$report.uiAutomationFocusEvents.Count+' LIVE_EVENTS='+$report.uiAutomationLiveRegionEvents.Count+' SPEECH_VERIFIED='+$report.spokenAudioVerified)
  Write-Output ('RECEIPT_SHA256='+((Get-FileHash $receipt -Algorithm SHA256).Hash.ToLower()))
  if($report.errors.Count){Write-Output ('ERROR='+$report.errors[0])}
}
if($report.status -notin @('PASS_NATIVE_UIA_FOCUS_SURROGATE','PARTIAL_FOCUS_EVENT_DELIVERY')){exit 3}
