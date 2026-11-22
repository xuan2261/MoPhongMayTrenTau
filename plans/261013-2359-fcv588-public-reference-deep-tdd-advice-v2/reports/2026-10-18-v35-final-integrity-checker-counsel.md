# V35 QA final-readback helper failure — GPT-6 decision

**Date:** 2026-10-18. **Scope:** read-only final checksum aggregation.

The new final auditor was executed once with
python tools/fcv588_v35_final_integrity_20261018.py.
It exited **1** before creating its own receipt:

    TypeError: 'WindowsPath' object is not subscriptable
    tools/fcv588_v35_final_integrity_20261018.py:102

The exact faulty expression was ROOT[x["path"]] inside the loop comparing
75 backward-compat and 25 dedicated canonical Chrome PNG hashes.
ROOT is a pathlib.Path, which does not implement integer or dictionary
subscript indexing. The required path composition is ROOT / x["path"].

The script had already checked source hashes, Node/Python results,
HTTP route restrictions and the existence/status of both Chrome receipts.
The failure therefore identifies a **bug in the new audit script**, not a
reported product or browser failure. The screenshot comparison itself was
not executed and must not be counted as PASS until the correction is run.
Original Chrome receipts and images remain untouched.

**GPT-6 supervisor GO:** change exactly this single file-path composition
expression to digest(ROOT / x["path"]), inspect the script, and rerun the
same final readback once with its original write-once receipt path.
No product/module/test expectation changes, no stale evidence rewrite,
no Git publication and no OEM/ship-release approval.

If the corrected auditor fails again, record the new evidence and STOP
for another distinct diagnosis. The earlier partial V35 integrity receipt
remains true as a historical checkpoint taken before the canonical Chrome
run was available.
