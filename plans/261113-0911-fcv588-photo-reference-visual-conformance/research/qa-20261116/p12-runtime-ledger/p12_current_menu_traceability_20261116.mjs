/**
 * P12 inventory of the EXISTING source/menu surface (not a firmware oracle).
 * Original PDFs/JPGs remain immutable restricted reference assets.
 * This script writes one receipt, never patches product code or runs a browser.
 */
import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {join,resolve,relative} from "node:path";
import {pathToFileURL} from "node:url";

const ROOT = "C:\\Work\\MoPhongMayTrenTau";
const QA = join(ROOT,"plans","261113-0911-fcv588-photo-reference-visual-conformance",
  "research","qa-20261116","p12-runtime-ledger");
const output=join(QA,"P12_CURRENT_MENU_SOURCE_TRACEABILITY_20261116.json");
const fp = p=>join(ROOT,p);
const sha = async p=>createHash("sha256").update(await readFile(p)).digest("hex");
const json = async p=>JSON.parse(await readFile(p,"utf8"));
const parentPath=fp("docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116/FCV588_P11_NATIVE_FOCUS_FINAL_INTEGRITY_20261116.json");
const parentSHA="845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87";
if(await sha(parentPath)!==parentSHA)throw new Error("P11 parent integrity drift");
const p07=await json(fp("docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json"));
for(const [p,h] of Object.entries(p07.canonicalRuntimeSHA256)){
  if(await sha(fp(p))!==h)throw new Error("Canonical runtime source drift: "+p);
}
const originals=p07.referenceOnlyOriginalPhotos;
if(Object.keys(originals).length!==8)throw new Error("photo baseline count drift");
for(const [name,photo] of Object.entries(originals)){
  if(await sha(fp("sources/FCV588_GiaoDienThucTeMay2016/"+name))!==photo.sha256)
    throw new Error("original JPEG SHA drift "+name);
}
const menuPath=fp("src/devices/fcv588/menu-atlas.mjs");
const {
  FCV_MENU_CATEGORIES,FCV_MENU_ENTRIES,FCV_FUNC_TARGETS,
  FCV_RANGE_BANK_FIELDS,FCV_FISH_ALARM_FIELDS,
  FCV_NAV_BOX_OPTIONS,FCV_NAV_BOX_DEFAULTS,
  getFcvMenuItems,getInstallationMenu
}=await import(pathToFileURL(menuPath).href);
const {projectFcvMainMenu}=await import(pathToFileURL(fp("web/lcd-presentation.mjs")).href);
const html=await readFile(fp("web/index.html"),"utf8");
const lcd=await readFile(fp("web/lcd-presentation.mjs"),"utf8");
if(FCV_MENU_CATEGORIES.join("|")!=="Sounder|Display|Alarm|Data|System")
  throw new Error("Menu category baseline drift");
const ids=new Set();
const rows=FCV_MENU_ENTRIES.map(x=>{
  if(ids.has(x.id))throw new Error("Duplicate menu id "+x.id);
  ids.add(x.id);
  if(!FCV_MENU_CATEGORIES.includes(x.category))throw new Error("Unrecognized category "+x.category);
  if(x.menuPath!==x.category+" > "+x.label)throw new Error("Menu label/path inconsistency "+x.id);
  if(typeof x.manualSection!=="string" || !x.manualSection.startsWith("§"))
    throw new Error("Unattributed manual section "+x.id);
  if(x.kind==="choice" && (!Array.isArray(x.choices)||x.choices.length===0))
    throw new Error("Missing choice array "+x.id);
  return {id:x.id,category:x.category,label:x.label,
    menuPath:x.menuPath,manualSection:x.manualSection,
    sourceId:x.sourceId,sourceStatus:x.sourceStatus,
    kind:x.kind,choiceCount:x.choices?.length??0,
    choices:x.choices===null?null:[...x.choices]};
});
const sourceStatusCounts=Object.fromEntries(
  [...new Set(rows.map(x=>x.sourceStatus))].sort().map(s=>[s,rows.filter(x=>x.sourceStatus===s).length]));
const categoryCounts=Object.fromEntries(
  FCV_MENU_CATEGORIES.map(c=>[c,rows.filter(x=>x.category===c).length]));
const languageSource=rows.find(x=>x.id==="system.language");
if(!languageSource || languageSource.choices.join("|")!=="English")
  throw new Error("Unexpected System Language gate");
const state={power:"on",mode:"LF",rangeMode:"manual",
  settings:{tankenmaru:"Off",transducer:"GENERIC_600W",language:"English"},trainingFixture:{}};
const languageExposed=getFcvMenuItems("System",state).find(x=>x.id==="system.language");
if(!languageExposed?.disabled ||
  languageExposed.disabledReason!=="RIGHTS_HOLD_LANGUAGE_ASSETS_AND_REBOOT_SOURCE_GAP")
  throw new Error("Language install gate unexpectedly enabled");
const installLanguage=getInstallationMenu(state).find(x=>x.settingKey==="language");
if(!installLanguage?.disabled)throw new Error("Installation Language unexpectedly enabled");
const warningText="SOURCE_GAP";
if(!lcd.includes('localeConformance:"HOLD"'))throw new Error("LCD locale HOLD metadata missing");
if(!html.includes('class="device-frame"') || !html.includes('class="training-panel"'))
  throw new Error("D15/device boundary missing");
if(!html.includes('id="key-menu"') || !html.includes("MENU/ESC"))
  throw new Error("Physical MENU/ESC source label missing");
const sourceManifest=await json(fp("sources/manuals/MANIFEST.json"));
const manufacturer=sourceManifest.entries.filter(x=>x.device==="FCV-588" && x.source_tier==="manufacturer");
const originalManuals=manufacturer.filter(x=>x.status==="already_present"||x.status==="downloaded");
const manualInputHashes=[];
for(const entry of originalManuals){
  const local=fp("sources/manuals/"+entry.file);
  const hash=await sha(local);
  if(hash!==entry.sha256)throw new Error("Manufacturer manual SHA drift "+entry.id);
  manualInputHashes.push({
    id:entry.id,sha256:hash,pages:entry.pages,
    rights:entry.rights_status,localPath:relative(ROOT,local).replaceAll("\\","/")});
}
const receipt={
  schema:"fcv588-p12-runtime-menu-source-traceability-v1",
  createdAt:new Date().toISOString(),
  sourceClass:"CURRENT_F1_PUBLIC_REFERENCE_V2_IMPLEMENTATION_NOT_OEM_FIRMWARE_DUMP",
  parentP11FinalSHA256:parentSHA,
  menuModuleSHA256:await sha(menuPath),
  menuLCDPresentationSHA256:await sha(fp("web/lcd-presentation.mjs")),
  sourceManifestSHA256:await sha(fp("sources/manuals/MANIFEST.json")),
  manualSourceBindings:manualInputHashes,
  imageOriginals:"8/8 SHA_MATCH_RESTRICTED_REFERENCE_ONLY",
  canonicalRuntime:"39/39 SHA_MATCH_P07_SEALED",
  counts:{
    categories:FCV_MENU_CATEGORIES.length,menuEntries:rows.length,
    funcTargets:FCV_FUNC_TARGETS.length,
    fishAlarmFields:FCV_FISH_ALARM_FIELDS.length,
    navBoxOptions:FCV_NAV_BOX_OPTIONS.length,
    rangePresets:FCV_RANGE_BANK_FIELDS.length,
    byCategory:categoryCounts,byCurrentImplementationStatus:sourceStatusCounts},
  currentRuntimeMenuEntries:rows,
  tests:{
    categoryNamesPresent:true,
    categoryToEntryIdsUnique:true,
    manualSectionAnnotationPresent:true,
    menuPathLabelConsistent:true,
    englishOnlyCurrentTrainingMenu:true,
    languageSystemAndInstallationBothDisabled:true,
    localeConformanceHoldMetadata:true,
    instructorBoundaryOutsideDevice:true,
    faceMENU_ESCPresent:true},
  explicitGaps:[
    "Implementation status CURATED_REFERENCE is a source interpretation, not line-by-line verified OEM screenshot or installed firmware acceptance.",
    "English-only Language setting is a safety gate; it does not prove a real FCV-588 ships in English-only locale or that Vietnamese firmware labels are known.",
    "Current synthetic/training menu paths, choices, values and manualSection annotations require independent manual/photographic verification before any OEM claim.",
    "No direct installed 2016 firmware version, Vietnamese phrase oracle, text-font/pixel validation, native hardware or rights to redistribute source PDFs/JPGs.",
    "This receipt inventories code and immutable source identities; it does not accept any menu phrase as exact OEM until the independent source audit cross-references it."],
  operations:{runtimeEdited:false,sourceOriginalsEdited:false,servedOEMAssetsCreated:false,
    installedFirmwareInspected:false,browserRun:false,historicalReceiptOverwritten:false}
};
await mkdir(QA,{recursive:true});
await writeFile(output,JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
if((await json(output)).counts.menuEntries!==rows.length)throw new Error("Write-once readback failed");
console.log(JSON.stringify({status:"PASS_INVENTORY_ONLY",menuEntries:rows.length,
  categories:categoryCounts,counts:sourceStatusCounts,manuals:manualInputHashes.length,
  receiptSHA256:await sha(output)}));
