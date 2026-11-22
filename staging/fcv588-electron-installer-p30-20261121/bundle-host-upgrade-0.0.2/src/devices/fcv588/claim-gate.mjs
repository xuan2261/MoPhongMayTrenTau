/**
 * Evaluates one hypothetical lesson, NOT a statement that the current simulator
 * has passed. Every input is explicit and auditable, no hidden approval defaults.
 */
export function evaluateFcvPublicClaim({
  profile, trace, sources = [], verifiedTests = [],
  browserEvidence = null, reviewerDecision = null,
} = {}) {
  const reasons = [];
  if (!profile || profile.profileClass !== "PUBLIC_REFERENCE" ||
      profile.hardwareValidated !== false || profile.firmwareInstalled !== null) {
    reasons.push("INVALID_PUBLIC_PROFILE");
  }
  if (!trace || trace.scope !== "FCV_OPERATOR" || trace.sourceStatus !== "AUTHORITATIVE" ||
      trace.implementationStatus !== "PUBLIC_REFERENCE_TESTED" ||
      trace.courseReviewStatus !== "REFERENCE_REVIEWED" ||
      !["CURATED_NOTES_ONLY", "RIGHTS_CLEARED"].includes(trace.rightsDecision)) {
    reasons.push("UNVERIFIED_OPERATOR_CLAIM");
  }
  const ids = trace?.publicSourceIds ?? [];
  const authorized = sources.some(source => ids.includes(source.id) && (
    (source.authorityTier === "MANUFACTURER_MANUAL" &&
      source.evidenceMode === "DOCUMENTED_RULE") ||
    (source.evidenceMode === "FRAME_AUDITED" &&
      source.frameAuditStatus === "VERIFIED" &&
      source.verifiedTimestamps.length > 0)
  ));
  if (!authorized) reasons.push("NO_AUTHORITATIVE_BEHAVIOR_SOURCE");
  // A domain-smoke filename, generic boolean or another feature's passing
  // test is NOT a public-reference operator receipt. This evaluates explicit
  // hypothetical evidence shapes; it does not authenticate a submitter.
  const featureId=trace?.featureId;
  const profileId=profile?.id;
  const requiredKinds=["positive","negative","cancel","replay"];
  if(typeof featureId!=="string" || !Array.isArray(verifiedTests) ||
    !requiredKinds.every(kind=>verifiedTests.some(receipt=>
      receipt?.featureId===featureId && receipt?.kind===kind &&
      receipt?.status==="PASS" && receipt?.profileId===profileId &&
      typeof receipt?.testId==="string" && receipt.testId.length>0))){
    reasons.push("MISSING_FEATURE_SCOPED_TEST_RECEIPTS");
  }
  if(browserEvidence?.featureId!==featureId ||
    browserEvidence?.status!=="PASS" ||
    typeof browserEvidence?.evidenceId!=="string" ||
    !browserEvidence.evidenceId){
    reasons.push("BROWSER_QA_HOLD");
  }
  if(reviewerDecision?.featureId!==featureId ||
    reviewerDecision?.decision!=="APPROVED" ||
    typeof reviewerDecision?.receiptId!=="string" ||
    !reviewerDecision.receiptId){
    reasons.push("REVIEW_HOLD");
  }
  return {eligible: reasons.length === 0, reasons};
}
