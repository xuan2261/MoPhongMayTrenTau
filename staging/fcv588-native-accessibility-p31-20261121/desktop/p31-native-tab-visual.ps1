$ErrorActionPreference='Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class P31ScreenWin32 {
  [StructLayout(LayoutKind.Sequential)] public struct RECT {public int Left,Top,Right,Bottom;}
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
}
'@
$root='C:\Work\MoPhongMayTrenTau'
$qa=Join-Path $root 'docs\qa\FCV588_ELECTRON_P31_NATIVE_A11Y_20261121'
$exe=Join-Path $env:LOCALAPPDATA 'Programs\fcv588-synthetic-electron-poc\FCV588-Synthetic-POC.exe'
$profile=Join-Path $qa 'profile-native-tab-visual-v1'
$receipt=Join-Path $qa 'P31_NATIVE_TAB_FOCUS_VISUAL_V1_20261121.json'
$modePng=Join-Path $qa 'P31_NATIVE_MODE_FOCUS_V1_20261121.png'
$powerPng=Join-Path $qa 'P31_NATIVE_POWER_FOCUS_V1_20261121.png'
foreach($n in @($profile,$receipt,$modePng,$powerPng)){if(Test-Path $n){throw ('QA_FILE_EXISTS '+$n)}}
if(@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue).Count){throw 'APP_ALREADY_RUNNING'}
if((Get-FileHash $exe).Hash.ToLower() -ne '79512e2b520a590e19cd1893c19b0a6fd1c79abb56efcd9c5e83e7613a4fa5fd'){throw 'P31_EXE_DRIFT'}
$env:FCV588_POC_PROFILE_DIR=$profile
$p=$null
$report=[ordered]@{schema='P31_NATIVE_TAB_VISUAL_V1';status='IN_PROGRESS';forceRendererAccessibilityUsed=$false;checks=@();screenshots=@{};errors=@();releaseApproval='HOLD'}
function ScreenshotWindow([IntPtr]$hwnd,[string]$out){
  $rect=New-Object P31ScreenWin32+RECT
  if(![P31ScreenWin32]::GetWindowRect($hwnd,[ref]$rect)){throw 'GET_WINDOW_RECT_FAILED'}
  $w=$rect.Right-$rect.Left;$h=$rect.Bottom-$rect.Top
  if($w -lt 200 -or $h -lt 200 -or $w -gt 4000 -or $h -gt 3000){throw 'UNSAFE_SCREENSHOT_BOUNDS'}
  $bmp=New-Object System.Drawing.Bitmap($w,$h)
  try{
    $g=[System.Drawing.Graphics]::FromImage($bmp)
    try{$g.CopyFromScreen($rect.Left,$rect.Top,0,0,(New-Object System.Drawing.Size($w,$h)))}finally{$g.Dispose()}
    $bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png)
  }finally{$bmp.Dispose()}
  return [ordered]@{sha256=(Get-FileHash $out -Algorithm SHA256).Hash.ToLower();bytes=(Get-Item $out).Length;width=$w;height=$h}
}
try{
  $p=Start-Process -FilePath $exe -PassThru
  Start-Sleep -Seconds 5
  $ids=@(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" | Where-Object {$_.ExecutablePath -eq $exe} | ForEach-Object {$_.ProcessId})
  $window=$null
  foreach($n in [Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children,[Windows.Automation.Condition]::TrueCondition)){
    if($ids -contains $n.Current.ProcessId -and $n.Current.Name -like '*FCV-588*'){$window=$n;break}
  }
  if(!$window){throw 'APP_UIA_WINDOW_NOT_FOUND'}
  $hwnd=[IntPtr]$window.Current.NativeWindowHandle
  $report.hwnd=$hwnd.ToInt64();$report.pid=$window.Current.ProcessId
  $nodes=$window.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
  $controls=@{}
  foreach($node in $nodes){
    try{
      if($node.Current.ControlType -ne [Windows.Automation.ControlType]::Button){continue}
      foreach($key in @('GAIN','MODE','POWER')){
        $match=if($key -eq 'POWER'){$node.Current.Name -like 'Nguồn và độ sáng*'}else{$node.Current.Name -like ($key+':*')}
        if($match){$controls[$key]=$node}
      }
    }catch{}
  }
  if($controls.Count -ne 3){throw ('EXPECTED_THREE_BUTTONS_GOT_'+$controls.Count)}
  [void][P31ScreenWin32]::SetForegroundWindow($hwnd)
  Start-Sleep -Milliseconds 200
  if([P31ScreenWin32]::GetForegroundWindow() -ne $hwnd){throw 'HARNESS_BLOCKED_APP_NOT_FOREGROUND'}
  $controls.GAIN.SetFocus();Start-Sleep -Milliseconds 200
  if(!$controls.GAIN.Current.HasKeyboardFocus){throw 'GAIN_FOCUS_FAILED'}
  $report.checks+='GAIN_NATIVE_FOCUS'
  [System.Windows.Forms.SendKeys]::SendWait('{TAB}')
  Start-Sleep -Milliseconds 300
  if(!$controls.MODE.Current.HasKeyboardFocus){throw 'TAB_GAIN_MODE_FAILED'}
  $report.checks+='TAB_GAIN_TO_MODE'
  $report.screenshots.MODE=ScreenshotWindow $hwnd $modePng
  [System.Windows.Forms.SendKeys]::SendWait('{TAB}')
  Start-Sleep -Milliseconds 300
  if(!$controls.POWER.Current.HasKeyboardFocus){throw 'TAB_MODE_POWER_FAILED'}
  $report.checks+='TAB_MODE_TO_POWER'
  $report.screenshots.POWER=ScreenshotWindow $hwnd $powerPng
  $report.status='PASS'
}catch {
  $report.status=if($_.Exception.Message -like 'HARNESS_BLOCKED*'){'BLOCKED'}else{'FAILED'}
  $report.errors+=($_.Exception.ToString())
}finally{
  if($p){
    foreach($c in @(Get-CimInstance Win32_Process -Filter "Name='FCV588-Synthetic-POC.exe'" -ErrorAction SilentlyContinue)){
      if($c.ExecutablePath -eq $exe){Stop-Process -Id $c.ProcessId -Force -ErrorAction SilentlyContinue}
    }
  }
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($report|ConvertTo-Json -Depth 8)+"`n")
  $f=[IO.File]::Open($receipt,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$f.Write($bytes,0,$bytes.Length)}finally{$f.Dispose()}
  Write-Output ('P31_TAB_VISUAL='+$report.status+' CHECKS='+$report.checks.Count)
  foreach($k in @($report.screenshots.Keys)){Write-Output ($k+'_SCREEN_SHA='+$report.screenshots[$k].sha256)}
  Write-Output ('RECEIPT_SHA='+((Get-FileHash $receipt -Algorithm SHA256).Hash.ToLower()))
  if($report.errors.Count){Write-Output ('ERROR='+$report.errors[0])}
}
if($report.status -ne 'PASS'){exit 3}
