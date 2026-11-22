"""Receipt-derived atlas QA; no browser, network, or manufacturer media."""
import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import build_fcv588_visual_atlas as atlas


class VisualAtlasTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = atlas.build()

    def test_all_measured_viewports_retain_unverified_hardware_boundary(self):
        self.assertEqual({v["viewport"] for v in self.result["measurements"]},
                         atlas.EXPECTED_VIEWPORTS)
        self.assertIs(self.result["hardwareValidated"], False)
        self.assertIsNone(self.result["oemFidelityPercent"])
        self.assertEqual(self.result["releaseApproval"], "HOLD")
        self.assertEqual(len(self.result["sourceReceipts"]), 3)
        self.assertTrue(all(len(r["sha256"]) == 64 for r in self.result["sourceReceipts"]))

    def test_simulator_geometry_cannot_be_promoted_to_hardware_measurement(self):
        item = copy.deepcopy(self.result["measurements"][0])
        item["geometry"]["basis"] = "HARDWARE_VALIDATED"
        with self.assertRaisesRegex(ValueError, "relabeled as measured hardware"):
            atlas.validated_geometry(item)

    def test_invalid_rectangles_and_empty_sizes_are_rejected(self):
        for field, value in (("x", float("nan")), ("width", 0), ("height", -1)):
            item = copy.deepcopy(self.result["measurements"][0])
            item["geometry"]["elements"]["#lcd"]["css"][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "rectangle"):
                atlas.validated_geometry(item)

    def test_viewport_identity_and_logical_lcd_must_match_receipt(self):
        item = copy.deepcopy(self.result["measurements"][0])
        item["geometry"]["viewport"] = [800, 600]
        with self.assertRaisesRegex(ValueError, "identities differ"):
            atlas.validated_geometry(item)
        item = copy.deepcopy(self.result["measurements"][0])
        item["geometry"]["logicalLcd"] = [640, 480]
        with self.assertRaisesRegex(ValueError, "LCD resolution drift"):
            atlas.validated_geometry(item)

    def test_v28_selection_keeps_historical_v27_and_qualitative_evidence_distinct(self):
        current = atlas.build("V28")
        self.assertEqual(current["checkpoint"], "V28")
        self.assertEqual(self.result["checkpoint"], "V27")
        self.assertNotEqual(current["runtimeManifestSha256"],
                            self.result["runtimeManifestSha256"])
        self.assertTrue(all("V28" in r["path"] for r in current["sourceReceipts"]))
        observed = current["qualitativeReferenceReview"]
        self.assertEqual(len(observed["observedImages"]), 3)
        self.assertIsNone(observed["physicalMeasurements"])
        self.assertIs(observed["rightsPromotion"], False)
        self.assertIs(current["hardwareValidated"], False)
        self.assertEqual(current["releaseApproval"], "HOLD")

    def test_unknown_checkpoint_is_rejected_before_any_receipt_lookup(self):
        with self.assertRaisesRegex(ValueError, "unsupported atlas checkpoint"):
            atlas.build("V999")


if __name__ == "__main__":
    unittest.main()
