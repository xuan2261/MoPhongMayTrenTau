# ak-brainstorm --ultra — result and verifier receipt (2026-11-13)

## Thực thi thật
- Installed skill: `ak-brainstorm` v2.9.1; đã đọc `brainstorm-ultra-mode.md` và `ultra-verifier-mode.md`.
- 5 read-only independent candidate slots theo cùng một packet và rubric; slot #5 lỗi tool delivery lần đầu, **retry một lần chỉ slot lỗi**, sau đó 5/5 usable. Không có candidate nào sửa source.
- 1 verifier độc lập lần đầu bị timeout nên **bounded retry một lần**, lựa chọn **Candidate A** từ tập A-E đã anonymized. Same-tier `gpt-5-6` high workers/verifier (không phải Kongming, không khẳng định strongest-model advantage hay independent OEM reviewer).
- Tài liệu lưu nguyên cohort: [candidates](./brainstorm-ultra-candidates.md). **Nội dung winner được sao nguyên không blend**: [selected](./brainstorm-ultra-selected.md).

## Kết quả verifier (mỗi tiêu chí 1–20)
| Rank | Candidate | Goal fit | Source grounded | TDD acceptance | Rights/honesty | Trade-offs | Total |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | A | 20 | 20 | 20 | 20 | 20 | **100** |
| 2 | B | 20 | 19 | 20 | 20 | 19 | 98 |
| 3 | D | 19 | 19 | 20 | 20 | 18 | 96 |
| 4 | C | 15 | 18 | 13 | 18 | 8 | 72 |
| 5 | E | 12 | 18 | 6 | 18 | 5 | 59 |

Verifier lý giải A thắng ở contract đầy đủ, grounded visual/source, TDD RED→GREEN đúng, giữ quyền và firmware HOLD, so ba phương án (CSS-only, presentation-renderer, full rewrite). **Không kết hợp các phương án.** Xếp hạng mang tính advisory, không phải metric OEM.

`ultra: picked=A/5 margin=low unanimous=no rejected_all=no`

## Giới hạn
Kết quả đủ quy trình 5-candidate + verifier sau retries, nhưng verifier cùng model/tier với candidates có rủi ro thiên vị tương quan. Các chi tiết phản biện mới về V57, source ownership và Battery được ghi **riêng** trong [plan red-team](./plan-red-team-review.md) và cập nhật plan; không sửa nội dung winner đã chọn.

