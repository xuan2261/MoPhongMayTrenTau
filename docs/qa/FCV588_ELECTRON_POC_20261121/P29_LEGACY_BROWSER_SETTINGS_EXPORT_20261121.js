/**
 * USER-INITIATED ONLY. Run in the DevTools Console on the existing training
 * page, exactly http://127.0.0.1:4173. Reads a single approved settings key.
 * Never accesses browser profile databases, cookies, sessions or OEM assets.
 */
(()=>{
  "use strict";
  if(location.origin!=="http://127.0.0.1:4173"){
    alert("Sai trang: chỉ dùng tại http://127.0.0.1:4173/");
    return;
  }
  const key="mophongmaytrentau.fcv588.public-reference.settings.v18";
  let raw;
  try{raw=localStorage.getItem(key);}catch{
    alert("Không thể đọc cấu hình cục bộ.");return;
  }
  if(typeof raw!=="string" || raw.length===0 || raw.length>12000){
    alert("Không có cấu hình đã lưu hợp lệ để xuất.");return;
  }
  const transfer={
    schema:"FCV588_SETTINGS_TRANSFER_V1",
    trainingOnly:true,
    settingsStorageKey:key,
    encodedSettings:raw,
  };
  const blob=new Blob([JSON.stringify(transfer,null,2)+"\n"],
    {type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="FCV588-settings-training-only.json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  console.info("Đã yêu cầu tải JSON chỉ chứa cấu hình FCV-588 synthetic.");
})();
