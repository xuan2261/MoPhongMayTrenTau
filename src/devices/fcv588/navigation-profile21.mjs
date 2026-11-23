/** Slim backward-compatibility re-export for archived profile21 navigation helpers. */
export {
  createLegacyNavigationState as createNavigationState,
  advanceLegacyTrainingTrip as advanceTrainingTrip,
  isValidLegacySyntheticPosition as isValidSyntheticPosition,
  isValidLegacySyntheticSpeed as isValidSyntheticSpeed,
  formatLegacySyntheticPosition as formatSyntheticPosition,
  legacyDistanceNmBetween as distanceNmBetween,
  addLegacyWaypoint as addWaypoint,
  editLegacyWaypoint as editWaypoint,
  deleteLegacyWaypoint as deleteWaypoint,
  setLegacyDestination as setDestination,
  projectLegacyFcvTravelValues as projectFcvTravelValues,
  projectLegacyNavData as projectNavData,
  projectLegacyFcvManualNavBoxes as projectFcvManualNavBoxes,
} from "./legacy-profile-factory.mjs";
