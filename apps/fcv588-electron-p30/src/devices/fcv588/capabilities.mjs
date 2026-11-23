/**
 * Source-graded FCV-588 public-reference options.
 * Pure fixture logic: absolutely no real probe, ship I/O, or firmware calls.
 */
const ADVANCED = new Set(["accuFish", "rezBoost", "bottomDiscrimination"]);

export function resolveFcvCapability(profile, feature, context = {}) {
  if (!ADVANCED.has(feature)) return {enabled: false, reason: "UNKNOWN_FEATURE"};
  if (!profile || profile.profileClass !== "PUBLIC_REFERENCE" ||
      profile.hardwareValidated !== false || profile.firmwareInstalled !== null) {
    return {enabled: false, reason: "UNVERIFIED_PROFILE"};
  }
  const type = profile.virtualTransducerType;
  if (type === "GENERIC_600W" || type === "GENERIC_1KW") {
    return {enabled: false, reason: "GENERIC_TRANSDUCER_TYPE"};
  }
  if (type !== "525STID-PWD" || profile.advancedCapabilities?.[feature] !== "CONDITIONAL") {
    return {enabled: false, reason: "SOURCE_GAP"};
  }
  // A selected model name is not a virtual mounting assertion. The instructor
  // must explicitly enable the named fixture; no real sensor is inferred.
  if(context.mountCompatible!==true || context.mountAligned!==true) {
    return {enabled:false,reason:"NAMED_VIRTUAL_MOUNT_UNVERIFIED"};
  }
  if (feature !== "bottomDiscrimination") {
    return {enabled: true, reason: "SYNTHETIC_NAMED_FIXTURE_ONLY"};
  }
  const {depthM, speedKn, draftM, rangeMode} = context;
  if (!Number.isFinite(depthM) || depthM < 5 || depthM > 100) {
    return {enabled: false, reason: "BDS_DEPTH_OUTSIDE_5_100_M"};
  }
  if (!Number.isFinite(speedKn) || speedKn < 0 || speedKn > 10) {
    return {enabled: false, reason: "BDS_SPEED_OUTSIDE_LIMIT"};
  }
  if (!Number.isFinite(draftM) || draftM < 0) {
    return {enabled: false, reason: "BDS_DRAFT_MISSING"};
  }
  // The operator's menu may activate AUTO_R on committing Bottom Disc.
  // Actual display projection still requires AUTO_R to be effective.
  if (rangeMode !== "auto" && context.allowAutoRangeEnable!==true) {
    return {enabled:false,reason:"BDS_REQUIRES_AUTO_RANGE"};
  }
  return {enabled: true, reason: "SYNTHETIC_BDS_GUARDS_SATISFIED"};
}
