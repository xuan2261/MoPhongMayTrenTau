"""No-browser TDD for the identity of the V20 mobile Chrome QA harness.

The mobile runner imports its byte verifier from the desktop runner. The
source of BOTH files must be pinned before running and checked afterward.
This test uses only disposable local bytes, not HTTP/Chrome/OEM materials.
"""
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import fcv588_mobile_viewport_acceptance as mobile
import fcv588_chrome_viewport_acceptance as desktop


class HarnessIdentityTests(unittest.TestCase):
    def setUp(self):
        self.capture = getattr(mobile, "capture_harness_source_identity", None)
        self.verify = getattr(mobile, "require_harness_source_stable", None)
        self.assertTrue(callable(self.capture),
                        "mobile Chrome receipt must fingerprint its exact runner and helper")
        self.assertTrue(callable(self.verify),
                        "mobile Chrome must reject helper drift before PASS")

    def test_current_runner_and_imported_helper_are_both_pinned(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = Path(directory, "runner.py")
            helper = Path(directory, "shared.py")
            runner.write_bytes(b"mobile runner")
            helper.write_bytes(b"imported source verifier")
            files = {"mobileRunner": runner, "sharedChromeVerifier": helper}
            captured = self.capture(files)
            self.assertEqual(set(captured), set(files))
            self.assertEqual(captured["mobileRunner"],
                             hashlib.sha256(b"mobile runner").hexdigest())
            self.assertEqual(captured["sharedChromeVerifier"],
                             hashlib.sha256(b"imported source verifier").hexdigest())
            self.assertTrue(self.verify(files, captured))

    def test_helper_changed_during_browser_workflow_rejects_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = Path(directory, "runner.py")
            helper = Path(directory, "shared.py")
            runner.write_bytes(b"original mobile runner")
            helper.write_bytes(b"original helper")
            files = {"mobileRunner": runner, "sharedChromeVerifier": helper}
            captured = self.capture(files)
            helper.write_bytes(b"changed helper after preflight")
            with self.assertRaisesRegex(AssertionError, "QA harness.*drift"):
                self.verify(files, captured)

    def test_desktop_receipt_must_identify_its_exact_runner_and_reject_drift(self):
        capture = getattr(desktop, "capture_harness_source_identity", None)
        verify = getattr(desktop, "require_harness_source_stable", None)
        self.assertTrue(callable(capture),
                        "desktop and mobile receipts must both bind the test harness")
        self.assertTrue(callable(verify),
                        "a changed desktop QA script may not return PASS")
        with tempfile.TemporaryDirectory() as directory:
            runner = Path(directory, "desktop.py")
            runner.write_bytes(b"desktop version one")
            files = {"desktopRunner": runner}
            captured = capture(files)
            self.assertEqual(captured["desktopRunner"],
                             hashlib.sha256(runner.read_bytes()).hexdigest())
            self.assertTrue(verify(files, captured))
            runner.write_bytes(b"desktop version two")
            with self.assertRaisesRegex(AssertionError, "QA harness.*drift"):
                verify(files, captured)


if __name__ == "__main__":
    unittest.main()
