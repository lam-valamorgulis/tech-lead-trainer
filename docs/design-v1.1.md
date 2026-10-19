# Tech Lead Trainer — thiết kế v1.1

- Ngày: 2026-10-19
- Nguồn: buổi `/grill-me` (Q1–Q44 và mục 12) trong Claude Code
- Trạng thái: **v1.1, đã xác nhận.** Bản cũ: `docs/design-v1.md`
- Research đi kèm:
  - `research/roadmap-sources.md` — lộ trình và nguồn chính
  - `research/gamified-learning-apps.md` — các app game hóa và bằng chứng
  - `research/game-ui-ux.md` — UI/UX của các game khác (đang chạy)

## Thay đổi so với v1

| # | Thay đổi | Lý do |
|---|---|---|
| 1 | **Không có AI trong app.** Sát thương tính theo bảng chiêu tạo sẵn. Câu "tại sao" tự đánh dấu theo câu trả lời mẫu | Mục 12 = B. Chấm điểm cho game không cần AI. Việc học sâu làm ở Claude Pro |
| 2 | "Discuss in Claude" chuyển lên tuần 2, đi cùng trận đấu | Đây là nửa "học" của trận đấu |
| 3 | Bỏ API, bỏ giới hạn số lần chấm, bỏ worker trên Mac | Hậu quả của #1. Chi phí AI lúc chạy = $0 |
| 4 | Hiện tỉ lệ ngày học 30 ngày ở màn hình chính và sau mỗi buổi | Q44 #1 |
| 5 | Mỗi ngày bắt đầu bằng 1 lần bấm: "Today I commit to: 3 / 15 / 45 minutes" | Q44 #2 |
| 6 | Mỗi thành phố có 1 cơ chế chơi mới nhỏ | Q44 #3 |
| 7 | Thông báo có 2–3 kiểu câu, đổi luân phiên | Q44 #4 |
| 8 | Không cho điểm khi mở app hoặc ôn bài dễ. Không loot, không tiền trong game | Q44 #5 |
| 9 | Lưu điểm từng lần ôn, để chỉnh khoảng cách ôn sau 3 tháng | Q44 #6 |
| 10 | Luật kiểm tra 4 tuần (mục 11, luật 7) | Q44 |
| 11 | Câu tiếng Anh tốt hơn (Q17 Y) chuyển sang Claude Pro | Hậu quả của #1 |
| 12 | Tạo nội dung bằng Claude Code với **tài khoản Pro cá nhân** | Đây là project cá nhân, không dùng tài khoản công ty |

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
| Một ngày | Bấm chọn 3 / 15 / 45 phút. Mục tiêu tuần 5 giờ 15 phút | Q12, Q32, Q44 |
| Thông báo | 07:30, thêm 1 lần nhắc lúc 20:00 nếu chưa học. 2–3 kiểu câu, đổi luân phiên. Đổi giờ trong Settings | Q35, Q44 |
| Cuối tuần | Tuần 1 boss → tuần 2 ADR → tuần 3 bài tập AI agent → tuần 4 Gym | Q39 |
| Ôn tập | 1 → 3 → 7 → 14 → 30 → 90 ngày. Tối đa 8 bài/ngày, bài trễ lâu nhất ôn trước. Sai thì lùi 1 mốc. Lưu điểm từng lần ôn | Q22, Q44 |
| Trận đấu | Mục 6. Không có AI | Q23, mục 12 |
| Gym / Elite Four / Champion | Gym: 5 trận, thắng 4/5, thua không bị khóa. Elite Four: 4 buổi phỏng vấn system design qua Claude Pro. Champion: checklist 4 mục | Q24, mục 12 |
| Không streak | Tỉ lệ 30 ngày (hiện ở màn hình chính và sau mỗi buổi), "không bỏ 2 lần liền", Trung tâm hồi phục 1 lần bấm | Q31, Q44 |
| Kiểm tra đầu vào | 10 câu trước mỗi thành phố. Câu đúng thì sinh vật được bắt ngay ở dạng 1 | Q36 |
| Ngôn ngữ | 100% tiếng Anh đơn giản (B1, tối đa 20 từ/câu). Bấm từ khó để xem định nghĩa bằng tiếng Anh đơn giản | Q13, Q17 |
| Đúng sai | Mỗi thẻ có 1 nguồn chính. Bạn duyệt trước mỗi tháng. Có nút "Report wrong" | Q20 |
| AI | Không chạy AI trong app. Học sâu qua "Discuss in Claude" (mục 8) | Mục 12 |
| Phần thưởng | Không cho điểm khi mở app hoặc ôn bài dễ. Không loot, không tiền trong game, không bảng xếp hạng | Q44 |
| Giao diện | Kiểu Codédex: pixel art, sinh vật có animation, bản đồ pixel bấm được. Không làm thế giới 2D đi lại | Q8, Q16 |
| Tracking | Tỉ lệ 30 ngày, Pokédex, huy hiệu, lịch học, tỉ lệ thắng theo thành phố, 3 sinh vật yếu nhất, 3 ô mục tiêu năm, tóm tắt Chủ nhật | Q21, Q44 |
| Nền tảng | iPhone (PWA) và trình duyệt máy tính. Mục 9 | Q18, Q26 |
| Build | App mới hoàn toàn. Mục 10 | Q14, Q30, Q34 |
| Luật bảo vệ | Mục 11 | Q28, Q29, Q30, Q44 |

## 3. Một ngày và một tuần

Mỗi ngày bắt đầu bằng 1 màn hình: **"Today I commit to: 3 / 15 / 45 minutes"**. Bấm 1 lần.

| Loại ngày | Thời gian | Làm gì |
|---|---|---|
| Ngày bận | 3 phút | Chỉ Ôn (tối đa 8 bài, mỗi bài tối đa 20 giây) |
| Ngày thường | 15 phút | Ôn (2–4 phút) + Bắt 1 sinh vật hoặc 1 chiêu (3–4 phút) + Đấu 1 trận (5–7 phút) |
| Ngày rảnh | 45 phút | Thêm "hiệp phụ": trận phụ, đọc sâu nguồn chính, boss |

- Ngày nào học ít nhất 3 phút cũng được tính là 1 ngày học.
- Sau mỗi buổi: hiện tỉ lệ ngày học 30 ngày và số phút tuần này so với mục tiêu 5 giờ 15 phút.

| Cuối tuần (45 phút, máy tính) | Làm gì |
|---|---|
| Tuần 1 | Boss: tình huống lớn. Nộp design doc (Problem, Options, Decision, Trade-offs, Risks) + sơ đồ Mermaid, hoặc ảnh sơ đồ vẽ tay. So với bài mẫu, rồi thảo luận qua "Discuss in Claude" |
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

Danh sách khái niệm và nguồn của từng tháng: `research/roadmap-sources.md`, mục 3. Các sinh vật AI ở cột ghi chú chỉ là ví dụ. Mỗi sinh vật vẫn cần nguồn chính (Q20).

Mỗi thành phố thêm **1 cơ chế chơi mới nhỏ**, để chống việc hiệu ứng game giảm sau khoảng 4 tuần. Ví dụ (example made up): tháng 2 có đối thủ 2 hệ, tháng 3 có trận tính giờ.

## 5. Lối chơi

| Trong Pokémon | Trong app |
|---|---|
| Bản đồ 12 thành phố | Lộ trình 12 tháng |
| Sinh vật | 1 khái niệm tech, ví dụ `Cache` |
| Chiêu | Khái niệm con, ví dụ `TTL`, `write-through`, `cache invalidation`, `cache stampede` |
| Bắt | Học lần đầu, trả lời đúng 1 câu |
| Tiến hóa | Dạng 2 khi qua mốc ôn 7 ngày. Dạng 3 khi qua mốc 30 ngày |
| Pokédex | Đã gặp / đã bắt / đã tiến hóa hết |
| Bảng khắc chế hệ | Bảng chiêu của từng tình huống: sát thương 0 / 1 / 2 + đòn phản công |
| Trận đấu | Tình huống thật mỗi ngày (mục 6) |
| Gym + huy hiệu | Bài kiểm tra cuối tháng |
| Giáo sư | Câu trả lời mẫu trong app + thảo luận với Claude Pro |
| Elite Four | 4 buổi phỏng vấn system design bằng tiếng Anh, làm trong Claude Pro |
| Champion | Checklist: design doc, chia ticket, review PR, chịu trách nhiệm production |
| Trung tâm hồi phục | Màn hình "Quay lại" sau 3+ ngày nghỉ: 1 lần bấm, buổi học 3 phút, không trách |

Không dùng tên, hình hoặc nhân vật Pokémon. Không dùng "Poké" hoặc "-mon" trong tên.

## 6. Một trận đấu (không có AI)

1. **Trước trận:** bạn thấy hệ của đối thủ (ví dụ Traffic, Consistency, Security) và chọn đội 3 sinh vật. Chỉ dùng được chiêu của sinh vật đã bắt.
2. **Mỗi lượt:** đối thủ đưa ra 1 vấn đề. Bạn chọn 1 chiêu.
3. **Viết trước khi xem kết quả:** bạn viết 1–2 câu tiếng Anh: tại sao chọn chiêu này. Phải viết xong mới thấy kết quả.
4. **Sát thương:** app lấy từ bảng chiêu tạo sẵn: 0, 1 hoặc 2.
5. **Phản công:** đối thủ đưa ra hậu quả của lựa chọn. Ví dụ: chọn `CDN cache` thì "khách thấy giá cũ". Lượt sau bạn phải xử lý hậu quả này.
6. **Câu trả lời mẫu:** app hiện câu trả lời mẫu và 3 ý chính. Bạn tự đánh dấu mình đã nói được ý nào. Kết quả này **chỉ cập nhật lịch ôn**, không đổi sát thương.
7. **Kết thúc:** thắng khi HP đối thủ (3) về 0, trong tối đa 3 lượt. Thua thì các chiêu đã dùng được đưa vào lịch ôn ngày mai.
8. **Sau trận:** nút "Discuss in Claude" (mục 8).

Ví dụ một bảng chiêu (example made up):

| Đối thủ: "Black Friday, traffic tăng 10 lần" (hệ Traffic) | Sát thương | Phản công |
|---|---|---|
| `CDN cache` | 2 | "Khách thấy giá cũ" → lượt sau cần `cache invalidation` |
| `Add more servers` | 1 | "Chi phí tăng 3 lần" |
| `Rewrite in Go` | 0 | "Trễ 3 tháng" |

Chống đoán mò: phải viết câu "tại sao" trước khi thấy kết quả. Các chiêu sai phải nghe hợp lý.

## 7. Nội dung

- Claude Code tạo nội dung từ nguồn chính, lưu thành file JSON. Dùng **tài khoản Pro cá nhân**, không dùng tài khoản công ty.
- Mỗi sinh vật: thẻ tối đa 150 từ, có 1 ví dụ thật và 1 link nguồn.
- Mỗi tình huống đấu: vấn đề, bảng chiêu (sát thương + phản công), câu trả lời mẫu, 3 ý chính.
- Bạn duyệt nội dung trước khi tháng bắt đầu. Việc duyệt cũng là học.
- Chỉ tạo nội dung cho thành phố hiện tại và thành phố kế tiếp.
- Lộ trình cũ trong `~/Desktop/learn/` có phần trùng chủ đề (`backend-mastery-tree`, `nodejs-mastery-in-1-year`, `frontend-mastery-tree`, `engineering-manager-in-1-year/front-end-tech-lead`, `ai-engineer-in-1-year`). Chỉ dùng chúng làm nguyên liệu, vẫn phải duyệt.

## 8. AI: không chạy trong app, học sâu qua Claude Pro

| Việc | Cách làm | Chi phí |
|---|---|---|
| Tạo nội dung | Claude Code (tài khoản Pro cá nhân), lúc build | Trong gói Pro |
| Ôn tập | Trắc nghiệm hoặc tự chấm | $0 |
| Trận đấu, Gym | Bảng chiêu tạo sẵn + tự đánh dấu theo câu trả lời mẫu | $0 |
| Học sâu sau trận | Nút **"Discuss in Claude"** | Trong gói Pro |
| Elite Four | Gói prompt "người phỏng vấn" mở trong Claude Pro. Chốt ở tháng 10 | Trong gói Pro |

Gói "Discuss in Claude" gồm:
- Tình huống, chiêu bạn chọn ở từng lượt, câu "tại sao" bạn viết
- Sát thương, đòn phản công, câu trả lời mẫu, 3 ý chính và các ý bạn đã đánh dấu
- Thẻ khái niệm và link nguồn chính
- Câu mở đầu, ví dụ: "Act as my tech lead mentor. Challenge my choices. Rewrite my answers in better English. Then ask me one harder follow-up question."

Cách mở: copy vào clipboard, rồi mở `https://claude.ai/new`. Link `claude.ai/new?q=...` có thể điền sẵn prompt, nhưng theo báo cáo bên ngoài thì lúc chạy lúc không (not verified). Phải test trước khi dùng.

Ghi chú:
- Gói Claude Pro không bao gồm API. Điều này chỉ quan trọng nếu sau này thêm AI vào app. Nguồn: https://support.anthropic.com/en/articles/9876003-i-subscribe-to-claude-pro-why-do-i-have-to-pay-separately-for-api-usage-on-console
- Không chuyển yêu cầu của bạn bè qua gói Pro của bạn. Anthropic không cho phép điều này. Nguồn: https://code.claude.com/docs/en/legal-and-compliance
- `franklin-os` có tính năng tương tự cho ChatGPT (`src/components/ai/copy-for-chatgpt.tsx`). Có thể mở ra xem cách làm, không copy (Q34).

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
| AI | Không gọi AI lúc chạy. "Discuss in Claude" = clipboard + mở `claude.ai` |
| Thông báo | `web-push` + service worker (từ tuần 2) |
| Hình và animation | CSS + sprite sheet, không dùng game engine |
| Test | Vitest + Playwright (màn hình iPhone + Desktop Chrome) |
| Hosting | Vercel |

## 10. Thứ tự build

| Tuần | Build | Học |
|---|---|---|
| 1 | Màn hình commit 3/15/45, Ôn, Bắt, Pokédex, tiến hóa, tỉ lệ 30 ngày. Login chỉ cho 1 email. Chưa có thông báo (dùng tạm Reminders của iPhone) | Viết và duyệt 15 thẻ của thành phố 1 |
| 2 | Đấu (bảng chiêu + câu trả lời mẫu + tự đánh dấu) + "Discuss in Claude". Thông báo | Học bằng app |
| 3 | Bản đồ + Gym 1 | Học bằng app |
| 4 | Login cho danh sách 3–5 email, mở cho bạn bè | Học bằng app |
| Tháng 2–3 | Boss tuần, Champion. Elite Four chốt ở tháng 10 | Học bằng app |

Giới hạn cứng: phần tuần 1 phải dùng được trong 7 ngày. Nếu chưa xong thì cắt bớt tính năng, không lùi ngày.

## 11. Luật bảo vệ

1. Mỗi ngày học 15 phút **trước** khi mở code của app.
2. App được đo bằng **số ngày học**, không đo bằng số tính năng.
3. Ngày thứ 8 mà chưa học được bằng app: dừng build, học bằng bản đang có.
4. Chỉ tạo nội dung cho 2 thành phố: thành phố hiện tại và thành phố kế tiếp.
5. Mục tiêu mới giữa năm thì ghi vào danh sách "Later" trong app. Không tạo lộ trình mới.
6. Sau 30 ngày, so tỉ lệ ngày dùng trong 30 ngày của app này và `franklin-os`. App nào dưới 50% thì tạm dừng.
7. **Sau 4 tuần:** nếu bạn mở app ít hơn 5 ngày mỗi tuần, thử thêm "days learned this week". Vẫn không có chuỗi streak.

Lý do dừng thật trước đây (Q27): đổi mục tiêu, bận việc công ty, đang học AI song song, ít năng lượng.
Research: thói quen cần 18–254 ngày để hình thành, nên 8 tuần đầu là giai đoạn dễ bỏ cuộc nhất (`research/gamified-learning-apps.md`, mục 4b).

## 12. Later

| Mục | Khi nào xem lại |
|---|---|
| AI chấm Gym (API), nếu tự đánh dấu quá dễ dãi | Sau 1 tháng |
| Chơi với bạn bè (thấy nhau, đấu với nhau) | Later |
| Chạy khi không có mạng (Ôn và Bắt) | Sau tuần 4 |
| Elite Four bằng giọng nói hay bằng chữ | Tháng 10 |
| Nâng cấp UI/UX từ research | Chờ `research/game-ui-ux.md` |
