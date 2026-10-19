# Tech Lead Trainer — thiết kế v1

- Ngày: 2026-10-19
- Nguồn: buổi `/grill-me` (Q1–Q43) trong Claude Code
- Trạng thái: **v1, đã xác nhận.** Còn 1 quyết định mở (xem mục 12).
- Research đi kèm: `research/roadmap-sources.md`, `research/gamified-learning-apps.md` (đang chạy)

## 1. App này là gì

Một game kiểu Pokémon, phong cách pixel art giống Codédex. Bạn học mỗi ngày trong 12 tháng để trở thành tech lead.
Mỗi khái niệm tech là một sinh vật. Bạn bắt, ôn và dùng nó trong các trận đấu dựa trên tình huống thật.

## 2. Bảng quyết định

| Phần | Quyết định | Câu |
|---|---|---|
| Người dùng | Bạn dùng trước. Sau 1 tháng mời 3–5 dev quen. Mỗi người chơi riêng, không thấy nhau | Q1, Q11, Q41 |
| Mục tiêu 12 tháng | Lead 1 project thật + pass phỏng vấn system design | Q2 |
| Học gì | Tech thuần + quyết định tech lead + lead AI agent. Không học kỹ năng con người | Q3 |
| Lộ trình | 12 thành phố (mục 4). Security và AI được rải vào nhiều tháng | Q38, Q40 |
| Sinh vật | Khoảng 15 sinh vật mỗi tháng. Mỗi sinh vật có 2–4 chiêu (khái niệm con) | Q19 |
| Một ngày | 3 mức: 3 / 15 / 45 phút. Mục tiêu tuần 5 giờ 15 phút | Q12, Q32 |
| Thông báo | 07:30, thêm 1 lần nhắc lúc 20:00 nếu chưa học. Đổi được trong Settings | Q35 |
| Cuối tuần | Tuần 1 boss → tuần 2 ADR → tuần 3 bài tập AI agent → tuần 4 Gym | Q39 |
| Ôn tập | 1 → 3 → 7 → 14 → 30 → 90 ngày. Tối đa 8 bài/ngày. Sai thì lùi 1 mốc | Q22 |
| Trận đấu | Mục 6 | Q23 |
| Gym / Elite Four / Champion | Gym thắng 4/5, thua không bị khóa. Elite Four: 4 buổi phỏng vấn system design. Champion: checklist 4 mục | Q24 |
| Không streak | Tỉ lệ 30 ngày, "không bỏ 2 lần liền", Trung tâm hồi phục | Q31 |
| Kiểm tra đầu vào | 10 câu trước mỗi thành phố. Câu đúng thì sinh vật được bắt ngay ở dạng 1 | Q36 |
| Ngôn ngữ | 100% tiếng Anh đơn giản (B1, tối đa 20 từ/câu). Bấm từ khó để xem định nghĩa bằng tiếng Anh đơn giản. AI đưa 1 câu tiếng Anh tốt hơn | Q13, Q17 |
| Đúng sai | Mỗi thẻ có 1 nguồn chính. Bạn duyệt trước mỗi tháng. Có nút "Report wrong" | Q20 |
| AI và chi phí | Mục 8 | Q10 |
| Giao diện | Kiểu Codédex: pixel art, sinh vật có animation, bản đồ pixel bấm được. Không làm thế giới 2D đi lại | Q8, Q16 |
| Tracking | Pokédex, huy hiệu, lịch học, tỉ lệ thắng theo thành phố, 3 sinh vật yếu nhất, 3 ô mục tiêu năm, tóm tắt Chủ nhật | Q21 |
| Nền tảng | **iPhone (PWA) và trình duyệt máy tính.** Mục 9 | Q18, Q26, v1 |
| Build | App mới hoàn toàn. Mục 10 | Q14, Q30, Q34 |
| Luật bảo vệ | Mục 11 | Q28, Q29, Q30 |

## 3. Một ngày và một tuần

| Loại ngày | Thời gian | Làm gì |
|---|---|---|
| Ngày bận | 3 phút | Chỉ Ôn (tối đa 8 bài, mỗi bài tối đa 20 giây) |
| Ngày thường | 15 phút | Ôn (2–4 phút) + Bắt 1 sinh vật hoặc 1 chiêu (3–4 phút) + Đấu 1 trận (5–7 phút) |
| Ngày rảnh | 45 phút | Thêm "hiệp phụ": trận phụ, đọc sâu nguồn chính, boss |

- Ngày nào học ít nhất 3 phút cũng được tính là 1 ngày học.
- Màn hình tracking hiện số phút tuần này so với mục tiêu 5 giờ 15 phút.

| Cuối tuần (45 phút, máy tính) | Làm gì |
|---|---|
| Tuần 1 | Boss: tình huống lớn. Nộp design doc (Problem, Options, Decision, Trade-offs, Risks) + sơ đồ Mermaid, hoặc ảnh sơ đồ vẽ tay |
| Tuần 2 | Viết 1 ADR cho một quyết định của tháng |
| Tuần 3 | Bài tập AI agent: tự làm trước, cho agent làm sau, rồi review bài của agent bằng checklist của tháng |
| Tuần 4 | Gym: 5 trận liên tiếp, thắng 4/5 thì được huy hiệu |

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

Danh sách khái niệm và nguồn của từng tháng: `research/roadmap-sources.md`, mục 3. Các AI sinh vật ở cột ghi chú chỉ là ví dụ. Mỗi sinh vật vẫn cần nguồn chính (Q20).

## 5. Lối chơi

| Trong Pokémon | Trong app |
|---|---|
| Bản đồ 12 thành phố | Lộ trình 12 tháng |
| Sinh vật | 1 khái niệm tech, ví dụ `Cache` |
| Chiêu | Khái niệm con, ví dụ `TTL`, `write-through`, `cache invalidation`, `cache stampede` |
| Bắt | Học lần đầu, trả lời đúng 1 câu |
| Tiến hóa | Dạng 2 khi qua mốc ôn 7 ngày. Dạng 3 khi qua mốc 30 ngày |
| Pokédex | Đã gặp / đã bắt / đã tiến hóa hết |
| Trận đấu | Tình huống thật mỗi ngày |
| Gym + huy hiệu | Bài kiểm tra cuối tháng |
| Giáo sư | AI mentor |
| Elite Four | 4 buổi phỏng vấn system design bằng tiếng Anh |
| Champion | Checklist: design doc, chia ticket, review PR, chịu trách nhiệm production |
| Trung tâm hồi phục | Màn hình "Quay lại" sau 3+ ngày nghỉ: hồi phục đội, hỏi 1 câu, không trách |

Không dùng tên, hình hoặc nhân vật Pokémon. Không dùng "Poké" hoặc "-mon" trong tên.

## 6. Một trận đấu

1. Trước trận: bạn thấy hệ của đối thủ (ví dụ Traffic, Consistency, Security) và chọn đội 3 sinh vật.
2. Mỗi lượt: đối thủ đưa ra 1 vấn đề. Bạn chọn 1 chiêu và viết 1–2 câu tiếng Anh: tại sao.
3. AI chấm 0–3: 0 sai, 1 đúng một phần, 2 đúng, 3 đúng và nói được trade-off. Điểm là sát thương.
4. Đối thủ phản công bằng hậu quả của lựa chọn. Ví dụ: chọn cache thì khách thấy giá cũ.
5. Thắng khi HP đối thủ (3) về 0, trong tối đa 3 lượt.
6. Thua: chiêu đã dùng được đưa vào lịch ôn ngày mai.

AI chấm dựa trên thẻ khái niệm và nguồn của nó, không tự đoán.

## 7. Nội dung

- Claude Code tạo thẻ từ nguồn chính, lưu thành file JSON. Bạn duyệt thẻ trước khi tháng bắt đầu. Việc duyệt cũng là học.
- Chỉ tạo nội dung cho thành phố hiện tại và thành phố kế tiếp.
- Thẻ khái niệm tối đa 150 từ, có 1 ví dụ thật và 1 link nguồn.
- Lộ trình cũ trong `~/Desktop/learn/` có phần trùng chủ đề (`backend-mastery-tree`, `nodejs-mastery-in-1-year`, `frontend-mastery-tree`, `engineering-manager-in-1-year/front-end-tech-lead`, `ai-engineer-in-1-year`). Chỉ dùng chúng làm nguyên liệu, vẫn phải duyệt.

## 8. AI và chi phí

| Việc | Cách làm | Gọi API? |
|---|---|---|
| Tạo bài học, câu hỏi, tình huống | Tạo trước bằng Claude Code. Batch API (rẻ hơn 50%) nếu cần số lượng lớn | Lúc build, không phải lúc chơi |
| Ôn tập | Trắc nghiệm hoặc tự chấm | Không |
| Chấm trận đấu | `claude-haiku-5-5` + prompt caching cho rubric cố định | Có |
| Gym, boss, Elite Four | `claude-sonnet-5-5` | Có, ít lần |
| Giới hạn | Tối đa 10 lần AI chấm mỗi người mỗi ngày | |
| **Thảo luận tiếp với Claude Pro** | Nút **"Discuss in Claude"**: copy 1 gói Markdown, rồi mở `claude.ai` | **Không** (dùng gói Claude Pro) |

Ước tính (guess): chấm 5 lần/ngày với Haiku là khoảng $0.16/tháng cho 1 người, dưới $2/tháng cho 6 người.
Giả định: mỗi lần chấm khoảng 3.000 token input và 1.500 token output. Giá lấy từ bảng giá ngày 2026-10-06.

**Claude Pro không thay được API.** Theo Anthropic, gói Claude Pro không bao gồm việc dùng API qua Console. Hai thứ tính tiền riêng.
Nguồn: https://support.anthropic.com/en/articles/9876003-i-subscribe-to-claude-pro-why-do-i-have-to-pay-separately-for-api-usage-on-console

Gói "Discuss in Claude" gồm:
- Tình huống trận đấu và các câu trả lời của bạn
- Điểm và nhận xét của AI trong app
- Thẻ khái niệm và link nguồn chính
- Một câu mở đầu, ví dụ: "Act as my tech lead mentor. Challenge my answer and ask me one harder follow-up question."

Cách mở: v1 dùng copy vào clipboard, rồi mở `https://claude.ai/new`. Link `claude.ai/new?q=...` có thể điền sẵn prompt. Nhưng theo các báo cáo bên ngoài, link này lúc chạy lúc không, nên phải test trước khi dùng (not verified).

Gợi ý: `franklin-os` đã có tính năng tương tự cho ChatGPT (`src/components/ai/copy-for-chatgpt.tsx`). Có thể mở ra xem cách làm (Q34: xem, không copy).

## 9. Nền tảng và tech stack

- **Một web app chạy trên cả 2 nơi:**
  - iPhone: PWA cài lên màn hình chính. Cần iOS 16.4+ thì thông báo mới chạy.
  - Máy tính: mở trong trình duyệt như một web app bình thường.
- Thiết kế mobile-first. Trên máy tính, màn hình boss tuần và ADR rộng hơn: một bên là editor, một bên là preview Mermaid.
- Login bằng mã 6 số qua email, dùng được trên cả 2 nơi. Không dùng magic link, vì magic link mở trong Safari chứ không mở trong PWA.

| Phần | Công cụ |
|---|---|
| Frontend | Next.js + React + TypeScript |
| Backend | Supabase: Postgres, login bằng mã 6 số, RLS, `pg_cron` |
| AI | Claude API (mục 8) |
| Thông báo | `web-push` + service worker (từ tuần 2) |
| Hình và animation | CSS + sprite sheet, không dùng game engine |
| Test | Vitest + Playwright (màn hình iPhone + Desktop Chrome) |
| Hosting | Vercel |

## 10. Thứ tự build

| Tuần | Build | Học |
|---|---|---|
| 1 | Ôn, Bắt, Pokédex, tiến hóa. Login chỉ cho 1 email. Chưa có thông báo (dùng tạm Reminders của iPhone) | Viết và duyệt 15 thẻ của thành phố 1 |
| 2 | Đấu + AI chấm. Thông báo | Học bằng app |
| 3 | Bản đồ + Gym 1 | Học bằng app |
| 4 | Login cho danh sách 3–5 email, mở cho bạn bè | Học bằng app |
| Tháng 2–3 | Elite Four, Champion, boss tuần, "Discuss in Claude" | Học bằng app |

Giới hạn cứng: phần tuần 1 phải dùng được trong 7 ngày. Nếu chưa xong thì cắt bớt tính năng, không lùi ngày.

## 11. Luật bảo vệ (từ dữ liệu 13 lộ trình cũ)

1. Mỗi ngày học 15 phút **trước** khi mở code của app.
2. App được đo bằng **số ngày học**, không đo bằng số tính năng.
3. Ngày thứ 8 mà chưa học được bằng app: dừng build, học bằng bản đang có.
4. Chỉ tạo nội dung cho 2 thành phố: thành phố hiện tại và thành phố kế tiếp.
5. Mục tiêu mới giữa năm thì ghi vào danh sách "Later" trong app. Không tạo lộ trình mới.
6. Sau 30 ngày, so tỉ lệ ngày dùng trong 30 ngày của app này và `franklin-os`. App nào dưới 50% thì tạm dừng.

Lý do dừng thật trước đây (Q27): đổi mục tiêu, bận việc công ty, đang học AI song song, ít năng lượng.

## 12. Còn mở và "Later"

| Mục | Trạng thái |
|---|---|
| Chấm trận đấu vẫn dùng API, hay chuyển hết sang Claude Pro (copy-paste)? | **Mở**, chờ bạn chọn |
| Chơi với bạn bè (thấy nhau, đấu với nhau) | Later |
| Chạy khi không có mạng (Ôn và Bắt) | Later, sau tuần 4 |
| Elite Four bằng giọng nói hay bằng chữ | Chốt ở tháng 10 |
| Bài học từ research app game hóa | Chờ `research/gamified-learning-apps.md` |
