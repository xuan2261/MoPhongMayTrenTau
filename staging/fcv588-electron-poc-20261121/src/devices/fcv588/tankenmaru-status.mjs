/**
 * Curated operator-manual §2.9 read-only training reference, NOT an emulator
 * of the optional partner radio/display, physical TX, firmware or menu editor.
 * Unlike an active transport setting, these MANUAL defaults cannot emit data.
 */
export function projectFcvTankenmaruTrainingStatus(state){
  const optionDeclared=state?.trainingFixture?.tankenmaruOption===true;
  const selected=optionDeclared && state?.settings?.tankenmaru==="On";
  return {
    status:selected?"VIRTUAL_OPTION_REFERENCE":"SOURCE_GAP_OPTION_NOT_ACTIVE",
    sourceClass:"CURATED_MANUAL_DEFAULTS_ONLY",
    manualSection:"§2.9",
    hardwareValidated:false,physicalPartnerConnected:false,
    transport:"NONE",transmissionAllowed:false,editable:false,
    values:selected?Object.freeze({
      output:"Off",pictureSync:"Yes",subClutter:"4",
    }):null,
    note:"TRAINING READ-ONLY; REAL OUTPUT / PICTURE SYNC / FILTER UNKNOWN",
  };
}
