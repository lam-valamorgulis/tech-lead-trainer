# Tech Lead Trainer — thiết kế v1.3

- Ngày: 2026-10-19
- Nguồn: buổi `/grill-me` (Q1–Q52 và mục 12) + review kiến trúc (sub-agent architect, model `fable`)
- Trạng thái: **v1.3, đã xác nhận.** Bản cũ: `docs/design-v1.md`, `docs/design-v1.1.md`, `docs/design-v1.2.md`
- Research đi kèm:
  - `research/roadmap-sources.md` — lộ trình và nguồn chính
  - `research/gamified-learning-apps.md` — các app game hóa và bằng chứng
  - `research/game-ui-ux.md` — UI/UX của các game khác, giới hạn của iPhone PWA
  - `research/learning-science.md` — học ít nhớ lâu, thói quen, học trong thời AI

## Thay đổi so với v1.2

| # | Thay đổi | Câu |
|---|---|---|
| 1 | Thêm **mục 12: Kiến trúc dữ liệu** | Review kiến trúc |
| 2 | Một ngày bắt đầu lúc **04:00** theo múi giờ nhà | Q48 |
| 3 | Đi du lịch: giữ múi giờ nhà, có 1 nút đổi trong Settings | Q49 |
| 4 | Backup: gói Free + export tự động mỗi tuần + thử khôi phục 1 lần. Chuyển sang gói Pro khi bạn bè tham gia | Q50 |
| 5 | File export = nhật ký thô (mọi lần ôn, bắt, đấu) | Q51 |
| 6 | Database để thử khi code chạy trên Mac (Supabase local) | Q52 |
| 7 | Sprint 1–3 thêm các việc về dữ liệu. Danh sách "không được cắt" dài hơn | Review kiến trúc |
| 8 | Bảng `allowed_emails` có từ Sprint 1. Mời bạn bè = thêm 1 email | Review kiến trúc |

## 1. App này là gì

Một game kiểu Pokémon, phong cách pixel art giống Codédex. Bạn học mỗi ngày trong 12 tháng để trở thành tech lead.
Mỗi khái niệm tech là một sinh vật. Bạn bắt, ôn và dùng nó trong các trận đấu dựa trên tình huống thật.

Giới hạn cần nhớ: chưa có nghiên cứu nào cho thấy game kiểu này làm người ta thành tech lead. Game dạy từ vựng và cách lập luận trade-off. Project thật (Champion) dạy phần còn lại.

## 2. Bảng quyết định

| Phần | Quyết định | Câu |
|---|---|---|
| Người dùng | Bạn dùng một mình trước. Sau **1–2 tháng** mời 3–5 dev quen. Mỗi người chơi riêng, không thấy nhau. Mỗi người có ngày bắt đầu riêng | Q1, Q11, Q41 |
| Mục tiêu 12 tháng | Lead 1 project thật + pass phỏng vấn system design | Q2 |
| Học gì | Tech thuần + quyết định tech lead + lead AI agent. Không học kỹ năng con người | Q3 |
| Lộ trình | 12 thành phố (mục 4). Security và AI được rải vào nhiều tháng | Q38, Q40 |
| Sinh vật | Khoảng 15 sinh vật mỗi tháng. Mỗi sinh vật có 2–4 chiêu (khái niệm con) | Q19 |
| Một ngày | Bắt đầu lúc 04:00 theo múi giờ nhà. Kế hoạch "nếu… thì…", rồi bấm chọn 3 / 15 / 45 phút. Mục tiêu tuần 5 giờ 15 phút | Q12, Q32, Q44, Q47, Q48 |
| Thông báo | 07:30, thêm 1 lần nhắc lúc 20:00 nếu chưa học. 2–3 kiểu câu, đổi luân phiên. Giữ cùng 1 giờ trong 12 tuần đầu | Q35, Q44, Q47 |
| Cuối tuần | Tuần 1 boss → tuần 2 ADR → tuần 3 bài tập AI agent → tuần 4 Gym | Q39 |
| Ôn tập | Mục 6 | Q22, Q47 |
| Bắt | Hỏi trước, hiện thẻ sau | Q47 |
| Trận đấu | Mục 7. HP 4. Không có AI | Q23, mục 12, Q47 |
| Gym / Elite Four / Champion | Gym: 5 trận, thắng 4/5, thua không bị khóa, trộn khái niệm dễ nhầm. Elite Four: 4 buổi phỏng vấn qua Claude Pro. Champion: checklist 4 mục | Q24, Q47 |
| Không streak | Tỉ lệ 30 ngày (màn hình chính và sau mỗi buổi), "không bỏ 2 lần liền", Trung tâm hồi phục 1 lần bấm | Q31, Q44 |
| Kiểm tra đầu vào | 10 câu trả lời ngắn + mức tự tin, trước mỗi thành phố | Q36, Q47 |
| Ngôn ngữ | 100% tiếng Anh đơn giản (B1, tối đa 20 từ/câu). Bấm từ khó để xem định nghĩa bằng tiếng Anh đơn giản | Q13, Q17 |
| Đúng sai | Mỗi thẻ có 1 nguồn chính. Bạn duyệt trước mỗi tháng. Có nút "Report wrong" | Q20 |
| AI | Không chạy AI trong app. Học sâu qua "Discuss in Claude" (mục 10) | Mục 12 cũ |
| Phần thưởng | Không cho điểm khi mở app hoặc ôn bài dễ. Không loot, không tiền trong game, không bảng xếp hạng | Q44 |
| Giao diện | Kiểu Codédex, pixel art. 12 luật UI (mục 9) | Q8, Q16, Q45 |
| Âm thanh | Chỉ có hiệu ứng ngắn kiểu 8-bit. Có nút tắt. Mỗi âm thanh có chữ đi kèm | Q45, Q46 |
| Tracking | Tỉ lệ 30 ngày, Pokédex, huy hiệu, lịch học, **tỉ lệ chọn chiêu tốt nhất** theo thành phố, 3 sinh vật yếu nhất, 3 ô mục tiêu năm, tóm tắt Chủ nhật | Q21, Q44, Q47 |
| Dữ liệu và backup | Mục 12 | Q48–Q52 |
| Nền tảng | iPhone (PWA) và trình duyệt máy tính. Mục 11 | Q18, Q26 |
| Build | App mới hoàn toàn. Sprint 1–4 (mục 13) | Q14, Q30, Q34 |
| Luật bảo vệ | Mục 14 | Q28, Q29, Q30, Q44, Q47 |

## 3. Một ngày và một tuần

**Lần đầu mở app:** màn hình kế hoạch "nếu… thì…":
- "After I ___, I open the app and tap 3 / 15 / 45." Ví dụ: "After my morning coffee…"
- Kế hoạch ngày mệt: "If I am tired, I tap 3."

**Mỗi ngày:** 1 màn hình **"Today I commit to: 3 / 15 / 45 minutes"**, 3 nút lớn ở nửa dưới màn hình. Bấm 1 lần.
Một ngày bắt đầu lúc **04:00** theo múi giờ nhà. Học lúc 00:30 vẫn tính cho ngày hôm trước.

| Loại ngày | Thời gian | Làm gì |
|---|---|---|
| Ngày bận | 3 phút | Chỉ Ôn: nghĩ câu trả lời, "Reveal", tự chấm (tối đa 8 bài) |
| Ngày thường | 15 phút | Ôn + Bắt 1 sinh vật hoặc 1 chiêu + Đấu 1 trận |
| Ngày rảnh | 45 phút | Thêm "hiệp phụ": trận phụ, boss, hoặc đọc 1 nguồn chính → đóng trang → viết 3 ý từ trí nhớ |

- Ngày có ít nhất 3 phút học (180 giây) được tính là 1 ngày học bình thường, không phải ngày "yếu".
- Sau mỗi buổi: hiện tỉ lệ ngày học 30 ngày và số phút tuần này so với mục tiêu 5 giờ 15 phút.
- Tuần bắt đầu thứ Hai lúc 04:00. Tóm tắt tuần được tạo lúc 20:00 Chủ nhật.

| Cuối tuần (45 phút, máy tính) | Làm gì |
|---|---|
| Tuần 1 | Boss: tình huống lớn. Nộp design doc (Problem, Options, Decision, Trade-offs, Risks) + sơ đồ Mermaid, hoặc ảnh sơ đồ vẽ tay. So với bài mẫu, rồi thảo luận qua "Discuss in Claude" |
| Tuần 2 | Viết 1 ADR cho **một quyết định thật ở chỗ làm**. Ghi điều bạn dự đoán. App nhắc bạn xem lại kết quả thật sau 4–8 tuần |
| Tuần 3 | Bài tập AI agent: tự làm trước, cho agent làm sau, rồi review bài của agent bằng checklist của tháng |
| Tuần 4 | Gym: 5 trận liên tiếp, thắng 4/5 thì được huy hiệu |

- Mỗi tháng nhờ 1 đồng nghiệp đọc 1 design doc hoặc ADR của bạn. Đây là phản hồi thật mà game không có.
- **ADR về việc ở công ty:** bỏ tên khách hàng, code và số liệu nội bộ trước khi dán vào "Discuss in Claude". Tài khoản Pro là tài khoản cá nhân.
- **Tháng 1:** bộ soạn thảo cuối tuần chỉ có từ Sprint 4. Trước đó, viết boss và ADR trong 1 file Markdown theo mẫu, rồi dán vào Claude Pro.

## 4. Lộ trình 12 thành phố

| Tháng | Thành phố | Ghi chú |
|---|---|---|
| 1 | Web và HTTP chuyên sâu | + security: TLS, CORS |
| 2 | API design | + idempotency key. AI: gọi LLM API (timeout, retry, streaming) |
| 3 | Database, SQL, index, transactions | + SQL injection. AI: embeddings, vector search |
| 4 | Testing và CI | AI: evals |
| 5 | Cache và CDN | AI: prompt caching |
| 6 | Queue và async | AI: job chạy nền, Batch API |
| 7 | Distributed systems: consistency, idempotency, retry | |
| 8 | Reliability: monitoring, sự cố, release an toàn | AI: chi phí, độ trễ, model dự phòng |
| 9 | Security | AI: prompt injection, OWASP Top 10 for LLM |
| 10 | Code architecture và system design | Mở Elite Four |
| 11 | Quyết định tech lead: design doc, ADR, estimate, trade-off | |
| 12 | Lead AI agent + build tính năng AI + project cuối năm | |

"Tháng" ở đây là tháng của từng người, tính từ ngày bắt đầu của người đó. Bạn bè vào sau vẫn bắt đầu từ thành phố 1.

Danh sách khái niệm và nguồn của từng tháng: `research/roadmap-sources.md`, mục 3. Các sinh vật AI ở cột ghi chú chỉ là ví dụ. Mỗi sinh vật vẫn cần nguồn chính (Q20).

Mỗi thành phố thêm **1 cơ chế chơi mới nhỏ**, để chống việc hiệu ứng game giảm sau khoảng 4 tuần. Ví dụ (example made up): tháng 2 có đối thủ 2 hệ, tháng 3 có trận tính giờ. Ngày đầu của mỗi thành phố phải cho cảm giác "mới bắt đầu" (fresh start).

## 5. Lối chơi

| Trong Pokémon | Trong app |
|---|---|
| Bản đồ 12 thành phố | Lộ trình 12 tháng |
| Sinh vật | 1 khái niệm tech, ví dụ `Cache` |
| Chiêu | Khái niệm con, ví dụ `TTL`, `write-through`, `cache invalidation`, `cache stampede` |
| Bắt | Thử trả lời 1 câu **trước**, rồi mới đọc thẻ |
| Tiến hóa | Dạng 2 khi qua mốc ôn 7 ngày. Dạng 3 khi qua mốc 30 ngày |
| Pokédex | Đã gặp / đã bắt / đã tiến hóa hết |
| Bảng khắc chế hệ | Bảng chiêu của từng tình huống: sát thương 0 / 1 / 2 + đòn phản công |
| Trận đấu | Tình huống thật mỗi ngày (mục 7) |
| Gym + huy hiệu | Bài kiểm tra cuối tháng, trộn khái niệm dễ nhầm |
| Giáo sư | Bài giải mẫu, câu trả lời mẫu, và thảo luận với Claude Pro |
| Elite Four | 4 buổi phỏng vấn system design bằng tiếng Anh, làm trong Claude Pro |
| Champion | Checklist: design doc, chia ticket, review PR, chịu trách nhiệm production |
| Trung tâm hồi phục | Màn hình "Quay lại" sau 3+ ngày nghỉ: 1 lần bấm, buổi học 3 phút, không trách, "New week starts Monday" |

Không dùng tên, hình hoặc nhân vật Pokémon. Không dùng "Poké" hoặc "-mon" trong tên.

## 6. Ôn và Bắt

**Bắt (catch):**
1. App hỏi 1 câu về khái niệm mới. Bạn thử trả lời, kể cả khi chưa biết.
2. App hiện thẻ: tối đa 150 từ, 1 ví dụ thật, 1 link nguồn.
3. Trả lời đúng 1 câu thì bắt được sinh vật (dạng 1).

**Ôn (review):**
1. App hiện câu hỏi. Bạn **nghĩ** câu trả lời trong đầu. Ở ngày 15 và 45 phút, có thể gõ câu trả lời.
2. Bấm "Reveal" để xem đáp án.
3. Tự chấm 4 mức: **Again / Hard / Good / Easy**.

| Quy tắc ôn | Giá trị |
|---|---|
| Khoảng cách | 1 → 3 → 7 → 14 → 30 → 90 ngày, thêm 1 lần ở khoảng ngày 180 |
| Again | Lùi 1 mốc |
| Easy | Bỏ qua 1 mốc |
| Đơn vị ôn | Thứ bạn bắt mỗi ngày: 1 sinh vật hoặc 1 chiêu |
| Giới hạn | Tối đa 8 bài/ngày. Bài trễ lâu nhất ôn trước |
| Chốt chặn | Nếu hàng ôn quá 8 bài trong 3 ngày liền: tạm dừng bắt mới cho đến khi hết dồn |
| Dữ liệu | Mỗi lần ôn được ghi lại đầy đủ (mục 12) |
| Trộn | Bài ôn trộn các khái niệm dễ nhầm từ nhiều thành phố (từ Sprint 3) |
| Tháng 3 | Kiểm tra có cần đổi sang FSRS không (mục 15) |

Ghi chú: mặc định là nghĩ trong đầu, để ngày 3 phút vẫn đủ 8 bài. Research đề xuất gõ câu trả lời. Có nghiên cứu nói nghĩ trong đầu hiệu quả gần bằng gõ, nhưng điều này chưa được kiểm tra (not verified).

## 7. Một trận đấu (không có AI)

1. **Lần đầu gặp một khái niệm trong thành phố mới:** xem 1 bài giải mẫu trước trận, rồi bài giải bị ẩn. Bỏ qua bước này nếu kiểm tra đầu vào cho thấy bạn đã biết.
2. **Trước trận:** bạn thấy hệ của đối thủ (màu + icon + chữ) và chọn đội 3 sinh vật. Chỉ dùng được chiêu của sinh vật đã bắt.
3. **Mỗi lượt:** app hiện **mối đe dọa của đối thủ trước** (đối thủ sắp làm gì). Bạn chọn 1 chiêu.
4. **Viết trước khi xem kết quả:** 1–2 câu tiếng Anh: tại sao. Phải viết xong mới thấy kết quả.
5. **Sát thương:** lấy từ bảng chiêu tạo sẵn: 0, 1 hoặc 2. Hiện bằng chữ + số + ô, ví dụ: "Strong hit · 2 ●●".
6. **Phản công:** 1 câu nguyên nhân và kết quả, ví dụ: "You chose cache. Customers see old prices." Lượt sau bạn phải xử lý hậu quả này.
7. **Câu trả lời mẫu:** câu trả lời mẫu + 3 ý chính. Bạn tự đánh dấu ý nào mình đã nói được. Kết quả này **chỉ cập nhật lịch ôn**.
8. **Kết thúc:** đối thủ có **HP 4**. Thắng khi HP về 0, trong tối đa 3 lượt. Thua thì các chiêu đã dùng được ôn lại vào ngày mai.
9. **Sau trận:** nút "Discuss in Claude" (mục 10).

**Đo việc học bằng tỉ lệ chọn chiêu tốt nhất,** không đo bằng tỉ lệ thắng. Với HP 3, người đoán mò thắng 63%. Với HP 4 thì chỉ còn 37% (`research/learning-science.md`, mục 3).

| Mục tiêu | Mức |
|---|---|
| Ôn đúng | Khoảng 90% |
| Chọn chiêu tốt nhất | 70–85% |
| Thắng trận (khi đã biết chủ đề) | 70–80% |
| Gym | Thắng 4/5 |

Ví dụ một bảng chiêu (example made up):

| Đối thủ: "Black Friday, traffic tăng 10 lần" (hệ Traffic) | Sát thương | Phản công |
|---|---|---|
| `CDN cache` | 2 | "You chose cache. Customers see old prices." → lượt sau cần `cache invalidation` |
| `Add more servers` | 1 | "You added servers. The cost is now 3 times higher." |
| `Rewrite in Go` | 0 | "You chose a rewrite. The fix is 3 months late." |

Chống đoán mò: phải viết câu "tại sao" trước khi thấy kết quả. Các chiêu sai phải nghe hợp lý. Mỗi lượt có **đúng 1 chiêu tốt nhất**, không có hòa (mục 12).

## 8. Nội dung

- Claude Code tạo nội dung từ nguồn chính, lưu thành file JSON trong git. Dùng **tài khoản Pro cá nhân**, không dùng tài khoản công ty.
- Mỗi sinh vật và mỗi chiêu: 1 câu hỏi "bắt", thẻ tối đa 150 từ, 1 ví dụ thật, 1 link nguồn, câu hỏi ôn và đáp án.
- Mỗi tình huống đấu: mối đe dọa, vấn đề, bảng chiêu (sát thương + câu phản công), câu trả lời mẫu, 3 ý chính.
- Mỗi khái niệm mới: 1 bài giải mẫu.
- Mỗi thành phố: 10 câu kiểm tra đầu vào, danh sách các cặp khái niệm dễ nhầm (để trộn).
- Bạn duyệt nội dung trước khi tháng bắt đầu. Việc duyệt cũng là học.
- Trước buổi duyệt mỗi tháng: in danh sách các "Report wrong" còn mở.
- Chỉ tạo nội dung cho thành phố hiện tại và thành phố kế tiếp.
- Lộ trình cũ trong `~/Desktop/learn/` có phần trùng chủ đề (`backend-mastery-tree`, `nodejs-mastery-in-1-year`, `frontend-mastery-tree`, `engineering-manager-in-1-year/front-end-tech-lead`, `ai-engineer-in-1-year`). Chỉ dùng chúng làm nguyên liệu, vẫn phải duyệt.

## 9. Luật UI

| # | Luật | Sprint |
|---|---|---|
| 1 | Trong trận: hiện mối đe dọa của đối thủ **trước** khi chọn chiêu | 2 |
| 2 | Sau mỗi lượt: 1 câu "You chose X. Y happens." | 2 |
| 3 | Sát thương = chữ + số + ô: "Strong hit · 2 ●●" | 2 |
| 4 | Mỗi hệ = màu + icon + chữ. Không chỉ dùng màu | 1 |
| 5 | Màn hình commit: 3 nút lớn ở nửa dưới màn hình | 1 |
| 6 | Nút tối thiểu 44 px, nút chính 56 px. Dùng `100dvh` và `env(safe-area-inset-bottom)`. `touch-action: manipulation` cho nút | 1 |
| 7 | Ô viết "why": test trên iPhone thật, bàn phím không được che nút gửi | 2 |
| 8 | Font pixel chỉ cho tiêu đề và nhãn ngắn. Câu văn 16–17 px sans-serif. Có setting "Plain font" | 1 |
| 9 | Hiệu ứng ngắn, bỏ qua được. Tôn trọng `prefers-reduced-motion`. Có setting "Reduce effects". Không nháy quá 3 lần/giây | 4 |
| 10 | Âm thanh bật từ lần bấm commit đầu tiên. Có nút tắt. Mỗi âm thanh có chữ đi kèm | 4 |
| 11 | Độ tương phản: 4,5:1 cho chữ, 3:1 cho icon và thành phần UI | 1 |
| 12 | "Discuss in Claude": copy trong lúc bấm nút. Nếu copy lỗi thì hiện ô chữ để copy tay | 2 |

Không dùng rung (`navigator.vibrate` không chạy trên iOS Safari). Mọi phản hồi phải có hình và chữ.
Hình pixel: phóng to theo số nguyên (x3 hoặc x4), `image-rendering: pixelated`. Kiểm tra trên iPhone thật.

## 10. AI: không chạy trong app, học sâu qua Claude Pro

| Việc | Cách làm | Chi phí |
|---|---|---|
| Tạo nội dung | Claude Code (tài khoản Pro cá nhân), lúc build | Trong gói Pro |
| Ôn tập, trận đấu, Gym | Tự chấm, bảng chiêu tạo sẵn, câu trả lời mẫu | $0 |
| Học sâu sau trận | Nút **"Discuss in Claude"** | Trong gói Pro |
| Elite Four | Gói prompt "người phỏng vấn" mở trong Claude Pro. Chốt ở tháng 10 | Trong gói Pro |

Gói "Discuss in Claude" gồm:
- Tình huống, chiêu bạn chọn ở từng lượt, câu "tại sao" bạn viết
- Sát thương, đòn phản công, các ý bạn đã đánh dấu
- Câu trả lời mẫu và 3 ý chính (Claude được yêu cầu giữ kín lúc đầu)
- Thẻ khái niệm và link nguồn chính
- Prompt "coach":

```
You are my tech lead coach. Below is my battle and the model answer. Do not show the model answer yet. Ask me ONE question at a time about my choice and my why. Wait for my reply. Give hints, not solutions. After three rounds, compare my thinking with the model answer. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.
```

**Sau khi chat:** quay lại app, viết 2 câu từ trí nhớ về điều đã học. App lưu 2 câu này và hỏi lại ở lần ôn sau.

Tại sao Claude phải hỏi lại, không làm hộ: trong nghiên cứu ngẫu nhiên của Anthropic (52 kỹ sư), nhóm có AI hỗ trợ đạt 50% trong bài kiểm tra, nhóm tự code đạt 67%. Nguồn: https://www.anthropic.com/research/AI-assistance-coding-skills. Trong Bastani 2025, AI chỉ gợi ý và giấu đáp án thì không gây hại.

Cách mở: copy vào clipboard, rồi mở `https://claude.ai/new`. Link `claude.ai/new?q=...` lúc chạy lúc không (not verified), phải test trước khi dùng.

Ghi chú:
- Gói Claude Pro không bao gồm API. Điều này chỉ quan trọng nếu sau này thêm AI vào app.
- Không chuyển yêu cầu của bạn bè qua gói Pro của bạn. Anthropic không cho phép điều này. Nguồn: https://code.claude.com/docs/en/legal-and-compliance
- `franklin-os` có tính năng tương tự cho ChatGPT (`src/components/ai/copy-for-chatgpt.tsx`). Có thể mở ra xem cách làm, không copy (Q34).

## 11. Nền tảng và tech stack

- **Một web app chạy trên cả 2 nơi:**
  - iPhone: PWA cài lên màn hình chính. Cần iOS 16.4+ thì thông báo mới chạy.
  - Máy tính: mở trong trình duyệt như một web app bình thường.
- Thiết kế mobile-first. Trên máy tính, màn hình boss và ADR rộng hơn: một bên là editor, một bên là preview Mermaid.
- Login bằng mã 6 số qua email, dùng được trên cả 2 nơi. Không dùng magic link, vì magic link mở trong Safari chứ không mở trong PWA.

| Phần | Công cụ |
|---|---|
| Frontend | Next.js + React + TypeScript |
| Backend | Supabase (gói Free): Postgres, login bằng mã 6 số, RLS, `pg_cron` |
| Database khi code | Supabase chạy trên Mac (`supabase start`). Không bao giờ test trên database thật |
| AI | Không gọi AI lúc chạy. "Discuss in Claude" = clipboard + mở `claude.ai` |
| Thông báo | `web-push` + service worker (Sprint 2) |
| Hình và animation | CSS + sprite sheet, không dùng game engine |
| Âm thanh | Hiệu ứng 8-bit (jsfxr hoặc gói itch.io, đọc license trước) |
| Backup | Export nhật ký thô mỗi tuần (GitHub Actions) + nút "Download my data" |
| Test | Vitest + Playwright (màn hình iPhone + Desktop Chrome) |
| Hosting | Vercel |

## 12. Kiến trúc dữ liệu

### 12.1 Ba rủi ro lớn nhất

| Rủi ro | Bạn sẽ thấy gì nếu sai |
|---|---|
| Ghi thiếu dữ liệu học | Tháng 3 không kiểm tra được FSRS. Không đo được tỉ lệ chọn chiêu tốt nhất. Dữ liệu không ghi vào đúng ngày thì mất luôn |
| Một database miễn phí, không có bản sao | Một buổi sáng app báo "paused" hoặc Pokédex trống. Mất tiến độ của nhiều tháng |
| ID nội dung bị đổi khi sửa chữ | Đổi tên `Cache` thành `Caching` thì lịch sử ôn biến mất. "3 sinh vật yếu nhất" hiện ô trống |

### 12.2 Lịch sử học: nhật ký không bao giờ sửa

Mỗi việc bạn làm được ghi thành **1 dòng mới, không bao giờ sửa** (event log). Trạng thái hiện tại (bài nào đến hạn ôn) được tính lại từ nhật ký. Có 1 chương trình "tính lại trạng thái từ nhật ký", được chạy thử 1 lần trong Sprint 1.

| Nhật ký | Ghi lại những gì | Dùng để |
|---|---|---|
| `review_events` | Bài nào, loại (sinh vật hay chiêu), phiên bản nội dung, mốc trước và sau, mức chấm, ngày đến hạn, lúc hiện câu hỏi, lúc bấm "Reveal", lúc chấm, câu đã gõ (nếu có) | Tháng 3 kiểm tra FSRS. Phát hiện chấm vội (bấm "Good" 1 giây sau khi "Reveal") |
| `catch_events` | Bài nào, phiên bản nội dung, câu trả lời, đúng hay sai, mức tự tin | Biết khái niệm nào khó bắt |
| `battle_turns` | Trận nào, tình huống, lượt số mấy, chiêu đã chọn, sát thương, **có phải chiêu tốt nhất không**, câu "why", mức tự tin | Tỉ lệ chọn chiêu tốt nhất |
| `battles` | Tình huống, đội 3 sinh vật, kết quả, số lượt, số ý tự đánh dấu, đã bấm "Discuss in Claude" chưa, 2 câu viết lại | Tracking theo thành phố |
| `sessions` | Mức đã chọn (3/15/45), lúc bắt đầu, lần cuối thấy hoạt động, số giây học (ghi mỗi 60 giây), thiết bị | Tỉ lệ 30 ngày, số phút mỗi tuần, lời nhắc 20:00 |

Mọi dòng đều có: người dùng, thời điểm thật (có múi giờ), ngày học (tính theo mốc 04:00), buổi học, và **mã chống bấm 2 lần** (`client_event_id`).

- "Có phải chiêu tốt nhất không" được ghi lại ngay lúc đấu. Sau này sửa bảng chiêu thì lịch sử vẫn đúng.
- **Phiên bản nội dung** (`content_hash`) được tính tự động lúc build và ghi vào mọi dòng. Không ai phải nhớ số phiên bản.
- **Bấm 2 lần chỉ ghi 1 lần.** Lịch ôn không nhảy từ mốc 3 lên mốc 14 vì một lần bấm vội. Mã này cũng giúp làm tính năng chạy không cần mạng sau này.
- **Tóm tắt Chủ nhật** được lưu như một ảnh chụp. Số liệu tuần trước không tự đổi khi bạn sửa nội dung.

### 12.3 Nội dung: JSON trong git, ID không bao giờ đổi

- Nội dung là file JSON trong git, được gói vào app lúc build. Có schema và chương trình kiểm tra tự động.
- **ID là tên ngắn, không bao giờ đổi:** `cache`, `cache.ttl`, `t01-black-friday`. Tên hiển thị thì đổi được.
- **Không bao giờ xóa.** Nội dung bỏ đi được đánh dấu `"retired": true` và vẫn nằm trong file.
- Có 1 file ghi lại mọi ID đã từng phát hành. Thiếu 1 ID thì build báo lỗi.
- Chương trình kiểm tra còn bắt buộc 2 luật:
  1. Mỗi lượt đấu có **đúng 1 chiêu** có sát thương cao nhất. Không có hòa.
  2. Mọi chiêu trong bảng chiêu đều phải là chiêu có thật, bắt được.
- **"Report wrong":** lưu bài nào, phiên bản nội dung, lời nhắn, màn hình, trạng thái. Trước buổi duyệt mỗi tháng, một chương trình in danh sách các báo cáo còn mở. Sửa xong thì đổi trạng thái thành `done`.

### 12.4 Ngày và múi giờ

- Mỗi người có múi giờ nhà (mặc định `Asia/Ho_Chi_Minh`) và mốc bắt đầu ngày **04:00**.
- "Hôm nay" được tính ở server, theo múi giờ nhà, không theo đồng hồ điện thoại.
- Đi du lịch: vẫn tính theo múi giờ nhà. Settings có 1 nút "Use this phone's time zone".
- Thông báo: `pg_cron` chạy mỗi 5 phút. App tự quyết định cho từng người lúc nào cần gửi. Không bao giờ ghi giờ địa phương vào lịch của `pg_cron` (giờ của `pg_cron` là UTC, not verified).
- Mỗi thông báo chỉ gửi 1 lần cho mỗi người, mỗi ngày, mỗi loại.

### 12.5 Sẵn sàng cho bạn bè từ ngày đầu

- Mọi bảng có cột người dùng (`user_id`) và luật RLS "chỉ đọc và sửa dữ liệu của chính mình". Bạn bè không đọc được ADR của bạn.
- Bảng `allowed_emails`: server kiểm tra email trước khi gửi mã 6 số. Mời bạn bè = thêm 1 email vào bảng này.
- Mỗi người có 1 dòng `profiles`: múi giờ, mốc 04:00, giờ thông báo sáng và tối, "Plain font", "Reduce effects", âm thanh, kế hoạch "nếu… thì…", và **ngày bắt đầu riêng** (`program_start_date`).
- Không build: danh sách bạn bè, màn hình chung, màn hình mời, trang admin.

### 12.6 Backup

Dữ kiện đã kiểm tra trên trang của Supabase (2026-10-19):
- Gói Free: **không có backup tự động**.
- Gói Free: project **bị tạm dừng sau 1 tuần không hoạt động**.
- Gói Free: tối đa **2 project** chạy cùng lúc.
- Supabase khuyên các project gói Free tự export dữ liệu thường xuyên bằng CLI.
- Nguồn: https://supabase.com/pricing, https://supabase.com/docs/guides/platform/backups

Cách làm:
1. Nút **"Download my data"** trong Settings: tải về 1 file JSON nhật ký thô. Lưu được vào app Files trên iPhone.
2. **Export tự động mỗi thứ Hai** (GitHub Actions), có mã hóa. Giữ file lâu hơn 90 ngày.
3. **Chương trình khôi phục:** đưa file export vào một database trống. Chạy thử 1 lần thật trong Sprint 2, trên Supabase ở Mac.
4. Settings hiện **"Last backup: <ngày>"**. Nếu ngày này cũ, bạn sẽ thấy ngay.
5. Khi bạn bè tham gia: chuyển sang gói Pro của Supabase để có backup hằng ngày và không bị tạm dừng (giá chưa kiểm tra).

Lưu ý: nghỉ học 2 tuần có thể làm project bị tạm dừng. Chưa rõ `pg_cron` chạy mỗi 5 phút có được tính là "hoạt động" hay không (not verified).

### 12.7 Các luật khác

| Luật | Bạn thấy gì |
|---|---|
| Link dùng tên nội dung, ví dụ `/battle/t01-black-friday`. Không có ID người dùng trong link | Link trong thông báo không bị hỏng |
| Database khi code chạy trên Mac. Không bao giờ đăng nhập thử trên database thật | Dữ liệu thử không lẫn vào ngày học thật |
| Cả app này và `franklin-os` đều export được "số ngày học trong 30 ngày", cùng luật ≥ 3 phút | So sánh được cho luật 6 (mục 14) |

## 13. Thứ tự build: Sprint 1–4

Sprint đếm từ ngày bắt đầu viết code. Bạn vẫn học mỗi ngày trong lúc build (luật 1, mục 14).

| Sprint | Ngày | Build | Học |
|---|---|---|---|
| **1** | 1–7 | **Nền dữ liệu:** Supabase trên Mac; `user_id` + RLS cho mọi bảng; `allowed_emails`; `profiles` (múi giờ, mốc 04:00, ngày bắt đầu riêng); nhật ký ôn, bắt, buổi học; mã chống bấm 2 lần; phiên bản nội dung; ID cố định + file ghi ID + chương trình kiểm tra; nút "Download my data". **Màn hình:** kế hoạch "nếu… thì…" + commit 3/15/45; Bắt (hỏi trước); Ôn (nghĩ → Reveal → 4 mức, Easy bỏ mốc, chốt chặn hàng ôn); Pokédex, tiến hóa, tỉ lệ 30 ngày; kiểm tra đầu vào thành phố 1; login 1 email; link theo tên nội dung; nút "Report wrong". Luật UI #4, #5, #6, #8, #11. Chưa có thông báo (dùng Reminders của iPhone) | Viết và duyệt 15 thẻ của thành phố 1 |
| **2** | 8–14 | Trận đấu (HP 4, mối đe dọa trước, câu nguyên nhân–kết quả, câu trả lời mẫu, tự đánh dấu, tỉ lệ chọn chiêu tốt nhất) + nhật ký trận và lượt. "Discuss in Claude" (prompt coach, viết lại 2 câu, copy dự phòng). Thông báo 2–3 kiểu câu, mỗi loại 1 lần/ngày. Export tự động mỗi tuần + **thử khôi phục 1 lần** + "Last backup". Ảnh chụp tóm tắt Chủ nhật. Luật UI #1, #2, #3, #7, #12 | Học bằng app |
| **3** | 15–21 | Bản đồ 12 thành phố + Gym 1. Trộn khái niệm dễ nhầm trong bài ôn và Gym. Bài giải mẫu trước trận đầu tiên của khái niệm mới. Danh sách "Report wrong" cho buổi duyệt tháng | Học bằng app |
| **4** | 22–28 | Bộ soạn thảo cuối tuần trên máy tính: boss (design doc + preview Mermaid), mẫu ADR, nhắc xem lại kết quả sau 4–8 tuần, ô đánh dấu "đồng nghiệp đã đọc". Ngày 45 phút: đọc → đóng → viết 3 ý. Hiệu ứng + âm thanh (luật UI #9, #10) | Học bằng app |
| Tháng 2–3 | | Khi bạn quyết định mời bạn bè: thêm email vào `allowed_emails`, chuyển Supabase sang gói Pro. Checklist Champion | Học bằng app |
| Tháng 10 | | Elite Four | Học bằng app |

**Cảnh báo:** sau review kiến trúc, Sprint 1 có nhiều việc hơn trước. Rủi ro không kịp 7 ngày là có thật.

**Giới hạn cứng của Sprint 1:** phải dùng được trong 7 ngày. Nếu không kịp, cắt theo thứ tự sau, không lùi ngày:
1. Kiểm tra đầu vào (tạm thời bắt đầu thành phố 1 từ 0)
2. Màn hình kế hoạch "nếu… thì…" (tạm ghi kế hoạch vào Reminders của iPhone)
3. "Easy" bỏ qua 1 mốc
4. Nút "Report wrong" (tạm ghi lỗi vào 1 file ghi chú)
5. Animation tiến hóa (giữ logic, bỏ hình)

**Không được cắt:** Ôn, Bắt, tỉ lệ 30 ngày, nhật ký không bao giờ sửa, phiên bản nội dung, ID cố định, `user_id` + RLS, mã chống bấm 2 lần, nút "Download my data".

## 14. Luật bảo vệ

1. Mỗi ngày học 15 phút **trước** khi mở code của app.
2. App được đo bằng **số ngày học**, không đo bằng số tính năng.
3. Ngày thứ 8 mà chưa học được bằng app: dừng build, học bằng bản đang có.
4. Chỉ tạo nội dung cho 2 thành phố: thành phố hiện tại và thành phố kế tiếp.
5. Mục tiêu mới giữa năm thì ghi vào danh sách "Later" trong app. Không tạo lộ trình mới.
6. Sau 30 ngày, so tỉ lệ ngày dùng trong 30 ngày của app này và `franklin-os`. App nào dưới 50% thì tạm dừng.
7. Sau 4 tuần: nếu bạn mở app ít hơn 5 ngày mỗi tuần, thử thêm "days learned this week". Vẫn không có chuỗi streak.
8. Giữ màn hình "Quay lại" và ngày 3 phút ít nhất đến **tuần 12**. Thói quen có thể cần 2–5 tháng (`research/learning-science.md`, mục 4).

Lý do dừng thật trước đây (Q27): đổi mục tiêu, bận việc công ty, đang học AI song song, ít năng lượng.

## 15. Later và các điểm kiểm tra

| Mục | Khi nào |
|---|---|
| Đổi sang FSRS nếu: tỉ lệ ôn đúng ở 1 mốc dưới 80% hoặc trên 97% (ít nhất 100 lần ôn), hoặc hàng ôn chạm giới hạn 8 trong 10+ ngày của 4 tuần, hoặc đã có 500+ lần ôn | Kiểm tra ở tháng 3 |
| Supabase gói Pro | Khi bạn bè tham gia |
| AI chấm Gym (API), nếu tự đánh dấu quá dễ dãi | Sau 1 tháng |
| Nhạc nền (mặc định tắt) | Later |
| Chơi với bạn bè (thấy nhau, đấu với nhau) | Later |
| Chạy khi không có mạng (Ôn và Bắt) | Sau Sprint 4 |
| Elite Four bằng giọng nói hay bằng chữ | Tháng 10 |
