"""Pure TDD guard for the Python Chrome runner's response-byte attestation.

No browser, network, OEM assets, or test source mutation are used here.
"""
import hashlib
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import fcv588_chrome_viewport_acceptance as runner


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


class BrowserLoadedSourceTests(unittest.TestCase):
    def setUp(self):
        self.verify = getattr(runner, "verify_browser_loaded_source", None)
        self.assertTrue(callable(self.verify),
                        "browser loaded-source attestation must be implemented")
        self.url = "http://127.0.0.1:4173/"
        self.assets = {"web/index.html": b"index", "web/app.mjs": b"app",
                       "src/core/session.mjs": b"session",
                       "src/devices/fcv588/profile-version.mjs": b"profile"}
        self.manifest = {"fileDigests": [
            {"path": path, "sha256": digest(data)}
            for path, data in self.assets.items()]}
        self.records = [
            {"url": self.url + ("" if path == "web/index.html" else path),
             "status": 200, "sha256": digest(data), "bytes": len(data)}
            for path, data in self.assets.items()]

    def test_actual_browser_responses_pass_when_every_loaded_byte_matches(self):
        result = self.verify(self.records, self.manifest, self.url,
                             response_count=len(self.records), body_errors=[])
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["verifiedResponses"], len(self.records))
        self.assertEqual(result["verifiedUniquePaths"], len(self.assets))

    def test_swapped_response_during_run_fails_despite_same_pre_post_manifest(self):
        corrupted = [dict(item) for item in self.records]
        corrupted[1]["sha256"] = digest(b"unexpected temporary replacement")
        with self.assertRaisesRegex(AssertionError, "browser.*source.*mismatch"):
            self.verify(corrupted, self.manifest, self.url,
                        response_count=len(corrupted), body_errors=[])

    def test_missing_body_or_failed_body_collection_never_passes(self):
        with self.assertRaisesRegex(AssertionError, "unhashed|incomplete|missing"):
            self.verify(self.records[:-1], self.manifest, self.url,
                        response_count=len(self.records), body_errors=[])
        with self.assertRaisesRegex(AssertionError, "body|capture"):
            self.verify(self.records, self.manifest, self.url,
                        response_count=len(self.records),
                        body_errors=["failed to capture response body"])

    def test_unexpected_path_or_external_source_is_not_accepted(self):
        unexpected = [dict(item) for item in self.records]
        unexpected[1]["url"] = self.url + "src/foreign.mjs"
        with self.assertRaises(AssertionError):
            self.verify(unexpected, self.manifest, self.url,
                        response_count=len(unexpected), body_errors=[])
        external = [dict(item) for item in self.records]
        external[1]["url"] = "https://example.org/web/app.mjs"
        with self.assertRaises(AssertionError):
            self.verify(external, self.manifest, self.url,
                        response_count=len(external), body_errors=[])


if __name__ == "__main__":
    unittest.main()
