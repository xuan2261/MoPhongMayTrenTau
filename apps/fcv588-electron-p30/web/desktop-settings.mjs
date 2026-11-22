/**
 * Offline manual settings migration only. Never reads external browser profiles.
 * No session/replay/waypoints/alarms are transferred. Controls live outside LCD.
 */
import {exportDesktopSettingsText,importDesktopSettingsText,
  DESKTOP_SETTINGS_KEY} from "./desktop-settings-core.mjs";

const root=document.querySelector(".app > main");
if(root){
  const block=document.createElement("section");
  block.id="desktop-transfer";
  block.setAttribute("aria-label","Chuyển cấu hình cục bộ của ứng dụng Windows");
  const title=document.createElement("h2");
  title.textContent="Windows POC — Chuyển cấu hình thủ công (không phải máy FCV-588)";
  const intro=document.createElement("p");
  intro.textContent="Chỉ xuất/nhập cấu hình đã lưu của mô phỏng. Không chuyển lịch sử phiên, replay, dữ liệu máy thật hoặc tài khoản trình duyệt.";
  const exportButton=document.createElement("button");
  exportButton.type="button";exportButton.id="desktop-export-settings";
  exportButton.textContent="Xuất cấu hình đã lưu (.json)";
  const input=document.createElement("input");
  input.type="file";input.accept=".json,application/json";
  input.id="desktop-import-settings-file";
  input.setAttribute("aria-label","Chọn tệp cấu hình xuất từ trình duyệt cũ");
  const importButton=document.createElement("button");
  importButton.type="button";importButton.id="desktop-import-settings";
  importButton.textContent="Kiểm tra và nhập cấu hình";
  const status=document.createElement("p");
  status.id="desktop-settings-status";status.setAttribute("role","status");
  status.textContent="Không thay đổi cấu hình nếu không nhập tệp hợp lệ.";
  for(const el of [title,intro,exportButton,input,importButton,status])block.append(el);
  root.append(block);
  exportButton.addEventListener("click",()=>{
    try{
      const contents=exportDesktopSettingsText(localStorage.getItem(DESKTOP_SETTINGS_KEY));
      const url=URL.createObjectURL(new Blob([contents],{type:"application/json"}));
      const link=document.createElement("a");
      link.href=url;link.download="FCV588-settings-training-only.json";
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
      status.textContent="Đã tạo tệp cấu hình; chỉ chứa thiết lập đã lưu.";
    }catch(err){status.textContent="Không thể xuất: "+err.message;}
  });
  importButton.addEventListener("click",async()=>{
    try{
      const file=input.files?.[0];
      if(!file || file.size===0 || file.size>18000)
        throw new RangeError("Cần một tệp JSON cấu hình hợp lệ tối đa 18 KB");
      const raw=importDesktopSettingsText(await file.text());
      if(!window.confirm("Nhập cấu hình và khởi động lại mô phỏng? Thiết lập đang lưu sẽ được thay thế."))
        return;
      localStorage.setItem(DESKTOP_SETTINGS_KEY,raw);
      // The original validated restoreSettingsOnReload() handles versioned migration.
      location.reload();
    }catch(err){status.textContent="TỪ CHỐI NHẬP: "+err.message;}
  });
}
