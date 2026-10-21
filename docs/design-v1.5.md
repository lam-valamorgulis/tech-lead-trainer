# Tech Lead Trainer — thiết kế v1.5

- Ngày: 2026-10-21
- Nguồn: buổi grilling ngày 2026-10-21 (Q1–Q42), và `research/tech-lead-skills.md`. Phần không đổi lấy từ v1.4 (buổi `/grill-me` Q1–Q57, review kiến trúc, quyết định factory)
- Trạng thái: **v1.5, đã xác nhận.** Bản cũ: `docs/design-v1.md` → `docs/design-v1.4.md`
- Spec trên GitHub: issue #1. Khi spec, ticket và thiết kế này khác nhau, **thiết kế này thắng**
- Từ ngữ trong game: `GLOSSARY.md` (Lesson, Town Intro, System Map, Decision Card, Battle, Meeting Battle, Agent Diff Battle, Constraint, Reason, Faint, Skill, Trainer Card, Boss, Feedback, Report wrong)
- Quyết định khó đảo ngược: `docs/adr/`
- Research đi kèm:
  - `research/roadmap-sources.md` — lộ trình và nguồn chính
  - `research/tech-lead-skills.md` — 26 kỹ năng của tech lead và cách luyện
  - `research/gamified-learning-apps.md` — các app game hóa và bằng chứng
  - `research/game-ui-ux.md` — UI/UX của các game khác, giới hạn của iPhone PWA
  - `research/learning-science.md` — học ít nhớ lâu, thói quen, học trong thời AI

## Thay đổi so với v1.4

Lý do chung: bạn dùng app và thấy 3 vấn đề. Bị hỏi khi chưa được dạy. Màn đấu toàn chữ, không giống game. Không nghe âm thanh. Giao diện chỉ đúng khoảng 20% ý bạn.

| # | Thay đổi | Câu |
|---|---|---|
| 1 | "Đánh boss" bạn nói là **Battle** hằng ngày. **Boss** vẫn là bài design doc cuối tuần | Q1 |
| 2 | **Dạy trước, hỏi sau.** Khái niệm mới bắt đầu bằng **Lesson**: bài học nhỏ, nguồn uy tín, có hình hoặc sơ đồ khi cần. Bỏ "hỏi trước, hiện thẻ sau" | Q2 |
| 3 | Mỗi thành phố mở đầu bằng **Town Intro**: bức tranh lớn, 1 sơ đồ, khoảng 3 phút | Q3 |
| 4 | Battle: **hình giống Coromon, luật giống Prodigy** (phải trả lời đúng mới ra đòn mạnh) | Q4 |
| 5 | Bỏ gõ "why" mỗi lượt. Thay bằng bấm chọn **1 trong 3 Reason**. Gõ chỉ là tùy chọn | Q5 |
| 6 | Âm thanh: thêm tiếng, to hơn, **nhạc nền** cho bản đồ và trận đấu, nút loa ngay trên màn chơi | Q6 |
| 7 | Nút **Feedback** ở mọi màn. Agent đọc mỗi tuần, tạo GitHub issue nhãn `needs-triage` | Q7 |
| 8 | Thứ tự: hỏi đáp đến khi bạn ưng, rồi build bản hoàn chỉnh dần. Sau đó (2026-10-21) bạn yêu cầu thêm: **prototype giao diện gameplay trước** khi build tiếp | Q8 |
| 9 | Học Lesson xong mà trả lời sai: hiện lại đúng đoạn Lesson chứa đáp án, cho trả lời lại 1 lần | Q9 |
| 10 | Hình trong Lesson: **sơ đồ** cho kiến thức. Hình pixel chỉ cho sinh vật và phần game | Q10 |
| 11 | **Viết lại nội dung Town 1 và Town 2** theo dạng mới | Q11 |
| 12 | Không bắt đầu ticket mới trong lúc hỏi đáp. (Sửa 2026-10-21: Sprint 4 thật ra đã ship ngày 2026-10-20, PR #90) | Q12 |
| 13 | **HP hai bên.** Sinh vật của bạn cũng mất HP khi chọn chiêu chưa tốt | Q13 |
| 14 | Câu trả lời mẫu + 3 ý chính **gom 1 lần ở cuối trận** | Q14 |
| 15 | Màn đấu **cầm dọc** | Q15 |
| 16 | Hình và nhạc: **bộ CC0 miễn phí trước**, mua khi thiếu. Ghi giấy phép trong repo | Q16 |
| 17 | Bản đồ: **bấm** vào thành phố. Không đi bộ | Q17 |
| 18 | iPhone gạt im lặng: app im lặng theo. Lần đầu hiện 1 dòng nhắc | Q18 |
| 19 | Lesson = **3 màn nhỏ**, mỗi màn tối đa 50 từ + 1 hình hoặc sơ đồ | Q19 |
| 20 | Sinh vật của bạn hết HP thì **Faint**, con tiếp theo vào thay | Q20 |
| 21 | Reason sai thì **đòn yếu đi 1** | Q21 |
| 22 | Màn Ôn vẫn là thẻ nhanh. Thêm hình sinh vật, tiếng, hiệu ứng | Q22 |
| 23 | Vẫn **không có** level, XP, loot. Tiến hóa là "lên cấp" | Q23 |
| 24 | Mỗi lượt có 1 dòng **Constraint** (hoàn cảnh). Constraint quyết định chiêu nào tốt nhất | Q24 |
| 25 | Tình huống lấy từ **sự cố thật đã công bố** và việc kỹ thuật nói chung, có link nguồn. Không giới hạn Shopify | Q25 |
| 26 | **Dạng 3 cần trả lời đúng 1 câu trade-off khó** | Q26 |
| 27 | Thêm màn **System Map** | Q27 |
| 28 | Thêm **Decision Card** vào Ôn: khoảng 1 trong 4 bài | Q28 |
| 29 | Từ Town 2, mỗi trận có 1 lượt cần sinh vật của thành phố cũ | Q29 |
| 30 | Chủ nhật hỏi: "Tuần này bạn gặp `<khái niệm>` ở chỗ làm ở đâu?" | Q30 |
| 31 | **Gym gặp lại tình huống cũ với Constraint đảo ngược** | Q31 |
| 32 | Câu khó của Dạng 3: Decision Card 3 lựa chọn + Reason, chấm tự động | Q32 |
| 33 | **Một agent độc lập kiểm tra từng ý nội dung** với link nguồn trước khi merge | Q33 |
| 34 | Tóm tắt Chủ nhật thêm 2 số: tỉ lệ chọn đúng theo Constraint, tỉ lệ đúng Decision Card. Thêm 3 khái niệm hay sai nhất | Q34 |
| 35 | **Giữ đúng 3 / 15 / 45 phút.** Bớt số bài trong ngày cho vừa | Q35 |
| 36 | Vai trò: **tech lead 1 team + một phần staff.** Code chủ yếu bằng AI, nhưng hiểu sâu tech stack | Q36 |
| 37 | Học **kỹ thuật + kỹ thuật nói với người**: PM, client, cấp trên, CTO. Bỏ việc thuần quản lý người | Q37 |
| 38 | Thêm **Meeting Battle**: đối thủ là câu hỏi của client hoặc cấp trên | sau Q37 |
| 39 | Mỗi thành phố = **1 chủ đề tech + 1–2 Skill** | Q38 |
| 40 | Skill hiện trên **Trainer Card**, mỗi Skill 1 tỉ lệ | Q39 |
| 41 | Meeting Battle **1–2 lần mỗi tuần** | Q40 |
| 42 | **Agent Diff Battle** mỗi tuần, từ Town 1 | Q41 |
| 43 | 4 Skill cấp staff học ở **Town 10–12** | Q42 |
| 44 | Bạn kiểm tra trên iPhone **cuối mỗi sprint hoặc tính năng lớn**, không phải mỗi ticket | sau Q35 |
| 45 | Prototype gameplay **đã duyệt** (2026-10-21). Bố cục màn đấu: **C · Panel** | Prototype |
| 46 | Sinh vật: bộ **50+ Monsters Pack 2D** (CC0, 64 px, có mặt trước + mặt sau). Sinh vật của bạn quay lưng, đối thủ quay mặt. Cần nhiều loài: mỗi khái niệm 1 loài | Prototype |
| 47 | Người (bạn, client, cấp trên): **chân dung pixel 64 px trong khung**, bộ "64px portraits" của peb (CC-BY 4.0, phải ghi tên tác giả). Không dùng hình người 16 px | Prototype |
| 48 | Field Guide: đã bắt = màu, đã gặp = xám, chưa gặp = bóng đen "???" | Prototype |

## 1. App này là gì

Một game kiểu Pokémon, phong cách pixel art. Bạn học mỗi ngày trong 12 tháng để trở thành tech lead.
Mỗi khái niệm tech là một sinh vật. Bạn học nó, bắt nó, ôn nó và dùng nó trong các trận đấu dựa trên tình huống thật.

**Bạn nhắm tới vai trò nào:** tech lead của 1 team, cộng một phần staff engineer (dẫn kỹ thuật cho nhiều team). Bạn ít tự viết code, vì AI agent viết phần lớn code. Nhưng bạn vẫn phải hiểu sâu tech stack để quyết định, review và chịu trách nhiệm.

**Cảm giác phải có:** giống game thật. Màn đấu có sinh vật lớn, thanh HP, hiệu ứng, âm thanh và rất ít chữ. Phần đọc dài nằm ở Lesson và ở cuối trận, không nằm giữa trận.

Giới hạn cần nhớ: chưa có nghiên cứu nào cho thấy game kiểu này làm người ta thành tech lead. Game dạy kiến thức, từ vựng và cách lập luận. Project thật (Champion) dạy phần còn lại.

## 2. Bảng quyết định

| Phần | Quyết định | Câu |
|---|---|---|
| Người dùng | Bạn dùng một mình trước. Sau **1–2 tháng** mời 3–5 dev quen. Mỗi người chơi riêng, không thấy nhau. Mỗi người có ngày bắt đầu riêng | v1.4: Q1, Q11, Q41 |
| Mục tiêu 12 tháng | Lead 1 project thật + pass phỏng vấn system design | v1.4: Q2 |
| Vai trò | Tech lead 1 team + một phần staff. Code chủ yếu bằng AI, nhưng hiểu sâu tech stack | Q36 |
| Học gì | Tech + 26 **Skill** của tech lead (`research/tech-lead-skills.md`): Skill kỹ thuật, và Skill **kỹ thuật nói với người** (PM, client, cấp trên, CTO). **Không học** việc thuần quản lý người: 1:1, tuyển dụng, đánh giá nhân viên, nói chuyện sự nghiệp | Q37 |
| Lộ trình | 12 thành phố (mục 4). Mỗi thành phố = 1 chủ đề tech + 1–2 Skill. Skill cấp staff ở Town 10–12 | Q38, Q42 |
| Sinh vật | Khoảng 15 sinh vật mỗi tháng. Mỗi sinh vật có 2–4 chiêu (khái niệm con) | v1.4: Q19 |
| Một ngày | Bắt đầu lúc 04:00 theo múi giờ nhà. Kế hoạch "nếu… thì…", rồi bấm chọn 3 / 15 / 45 phút. Mục tiêu tuần 5 giờ 15 phút. **Thời gian cố định**: app bớt bài cho vừa, không cho quá giờ | v1.4: Q12, Q32, Q44, Q47, Q48; Q35 |
| Thông báo | 07:30, thêm 1 lần nhắc lúc 20:00 nếu chưa học. 2–3 kiểu câu, đổi luân phiên. Giữ cùng 1 giờ trong 12 tuần đầu | v1.4: Q35, Q44, Q47 |
| Cuối tuần | Tuần 1 Boss → tuần 2 ADR → tuần 3 bài tập AI agent → tuần 4 Gym | v1.4: Q39 |
| Học khái niệm mới | **Lesson trước** (3 màn nhỏ), rồi mới hỏi. Mục 6 | Q2, Q9, Q19 |
| Bức tranh lớn | Town Intro đầu mỗi thành phố + System Map cho cả hệ thống | Q3, Q27 |
| Ôn tập | Thẻ nhanh. Khoảng 1 trong 4 bài là Decision Card. Mục 6 | v1.4: Q22, Q47; Q22, Q28 |
| Trận đấu | Mục 7. 3 loại: Battle, Meeting Battle, Agent Diff Battle. HP hai bên. Constraint + Reason. Không có AI | Q4, Q5, Q13, Q20, Q21, Q24, Q40, Q41 |
| Gym / Interview Tower / Champion | Gym: 5 trận, thắng 4/5, thua không bị khóa, trộn khái niệm dễ nhầm, **gặp lại tình huống cũ với Constraint đảo ngược**. Interview Tower: 4 buổi phỏng vấn qua Claude Pro. Champion: checklist 4 mục | v1.4: Q24, Q47; Q31 |
| Không streak | Tỉ lệ 30 ngày (màn hình chính và sau mỗi buổi), "không bỏ 2 lần liền", Rest Stop 1 lần bấm | v1.4: Q31, Q44 |
| Kiểm tra đầu vào | 10 câu trả lời ngắn + mức tự tin, trước mỗi thành phố | v1.4: Q36, Q47 |
| Ngôn ngữ | 100% tiếng Anh đơn giản (B1, tối đa 20 từ/câu). Bấm từ khó để xem định nghĩa bằng tiếng Anh đơn giản | v1.4: Q13, Q17 |
| Đúng sai | Mỗi Lesson có 1 nguồn chính uy tín. **Một agent độc lập** kiểm tra từng ý với nguồn trước khi merge. Có nút "Report wrong" | v1.4: Q20; Q33 |
| AI | Không chạy AI trong app. Học sâu qua "Discuss in Claude" (mục 10) | v1.4 |
| Phần thưởng | Không cho điểm khi mở app hoặc ôn bài dễ. **Không level, không XP**, không loot, không tiền trong game, không bảng xếp hạng. Tiến hóa là "lên cấp" | v1.4: Q44; Q23 |
| Giao diện | Màn chơi giống game thật: Battle như Coromon, cầm dọc. Luật UI ở mục 9 | Q4, Q15 |
| Âm thanh | Hiệu ứng 8-bit nhiều hơn và to hơn. **Nhạc nền** cho bản đồ và trận đấu. Nút loa trên màn chơi. Im lặng theo nút im lặng của iPhone. Mỗi âm thanh có chữ đi kèm | Q6, Q18 |
| Hình và nhạc | Bộ hình và nhạc giấy phép CC0 trước. Mua khi thiếu. Ghi giấy phép của mọi file trong repo | Q16 |
| Bản đồ | Bản đồ pixel 12 thành phố. Bấm vào thành phố để vào. Không đi bộ | Q17 |
| Tracking | Tỉ lệ 30 ngày, Field Guide, huy hiệu, lịch học, **Trainer Card** (tỉ lệ từng Skill), tỉ lệ chọn chiêu tốt nhất theo Constraint, tỉ lệ đúng Decision Card, 3 khái niệm hay sai nhất, 3 ô mục tiêu năm, tóm tắt Chủ nhật | v1.4: Q21, Q44, Q47; Q34, Q39 |
| Nối với việc thật | ADR cuối tuần cho quyết định thật. Chủ nhật hỏi: "Tuần này bạn gặp `<khái niệm>` ở chỗ làm ở đâu?" | v1.4: Q39; Q30 |
| Feedback | Nút **Feedback** ở mọi màn. Agent đọc mỗi tuần, tạo issue `needs-triage` | Q7 |
| Dữ liệu và backup | Mục 12. Dữ liệu học của bạn được giữ nguyên khi đổi thiết kế | v1.4: Q48–Q52 |
| Nền tảng | iPhone (PWA) và trình duyệt máy tính. Mục 11 | v1.4: Q18, Q26 |
| Build | Prototype gameplay trước, rồi Sprint 5–7 (mục 13) | Q8, Q12 |
| Luật bảo vệ | Mục 14 | v1.4: Q28, Q29, Q30, Q44, Q47 |

## 3. Một ngày và một tuần

**Lần đầu mở app:** màn hình kế hoạch "nếu… thì…":
- "After I ___, I open the app and tap 3 / 15 / 45." Ví dụ: "After my morning coffee…"
- Kế hoạch ngày mệt: "If I am tired, I tap 3."

**Mỗi ngày:** 1 màn hình **"Today I commit to: 3 / 15 / 45 minutes"**, 3 nút lớn ở nửa dưới màn hình. Bấm 1 lần.
Một ngày bắt đầu lúc **04:00** theo múi giờ nhà. Học lúc 00:30 vẫn tính cho ngày hôm trước.

| Loại ngày | Thời gian | Làm gì |
|---|---|---|
| Ngày bận | 3 phút | Chỉ Ôn: thẻ nhanh và Decision Card (tối đa 8 bài) |
| Ngày thường | 15 phút | Ôn + Bắt (Lesson → câu hỏi) 1 sinh vật hoặc 1 chiêu + Đấu 1 trận |
| Ngày rảnh | 45 phút | Thêm "hiệp phụ": trận phụ, Boss, hoặc đọc 1 nguồn chính → đóng trang → viết 3 ý từ trí nhớ |

**Loại trận trong tuần (ngày 15 phút):**

| Loại trận | Bao nhiêu |
|---|---|
| Meeting Battle | 1–2 lần mỗi tuần, thay cho Battle thường |
| Agent Diff Battle | 1 lần mỗi tuần, từ Town 1, thay cho Battle thường |
| Battle thường | Các ngày còn lại |

**Giữ đúng thời gian (Q35):**
- 3 / 15 / 45 phút là lời hứa. App không làm bạn quá giờ.
- Agent đo thời gian thật trên iPhone. Nếu một ngày bị dài, app bớt bài trong ngày đó.
- Ví dụ: ngày 15 phút chỉ bắt 1 chiêu, không bắt cả sinh vật mới.

- Ngày có ít nhất 3 phút học (180 giây) được tính là 1 ngày học bình thường, không phải ngày "yếu".
- Sau mỗi buổi: hiện tỉ lệ ngày học 30 ngày và số phút tuần này so với mục tiêu 5 giờ 15 phút.
- Tuần bắt đầu thứ Hai lúc 04:00. Tóm tắt tuần được tạo lúc 20:00 Chủ nhật.

**Tóm tắt Chủ nhật** (Q30, Q34):
- Tỉ lệ chọn chiêu tốt nhất theo Constraint, so với tuần trước.
- Tỉ lệ đúng Decision Card, so với tuần trước.
- 3 khái niệm bạn hay chọn sai nhất.
- 1 câu hỏi: "Where did you meet `<concept>` at work this week?" Có nút "Not this week". Gõ 1–2 câu là tùy chọn.

| Cuối tuần (45 phút, máy tính) | Làm gì |
|---|---|
| Tuần 1 | Boss: tình huống lớn. Nộp design doc (Problem, Options, Decision, Trade-offs, Risks) + sơ đồ Mermaid, hoặc ảnh sơ đồ vẽ tay. So với bài mẫu, rồi thảo luận qua "Discuss in Claude" |
| Tuần 2 | Viết 1 ADR cho **một quyết định thật ở chỗ làm**. Ghi điều bạn dự đoán. App nhắc bạn xem lại kết quả thật sau 4–8 tuần |
| Tuần 3 | Bài tập AI agent: tự làm trước, cho agent làm sau, rồi review bài của agent bằng checklist của tháng |
| Tuần 4 | Gym: 5 trận liên tiếp, thắng 4/5 thì được huy hiệu |

- Mỗi tháng nhờ 1 đồng nghiệp đọc 1 design doc hoặc ADR của bạn. Đây là phản hồi thật mà game không có.
- Bài cuối tuần có thể luyện Skill của thành phố. Ví dụ: viết email cho client về dự án trễ (`research/tech-lead-skills.md`, bảng "How each skill is practised").
- **ADR về việc ở công ty:** bỏ tên khách hàng, code và số liệu nội bộ trước khi dán vào "Discuss in Claude". Tài khoản Pro là tài khoản cá nhân.

## 4. Lộ trình 12 thành phố

Mỗi thành phố có **1 chủ đề tech + 1–2 Skill** (Q38). Skill được luyện trên chính chủ đề tech của tháng đó.
Số Skill theo danh sách 26 Skill trong `research/tech-lead-skills.md`.

| Tháng | Thành phố (chủ đề tech) | Ghi chú tech | Skill (**đề xuất, agent chốt khi làm nội dung**) |
|---|---|---|---|
| 1 | Web và HTTP chuyên sâu | + security: TLS, CORS | 11 Debug lỗi qua nhiều tầng · 19 Giải thích cho người không phải kỹ sư |
| 2 | API design | + idempotency key. AI: gọi LLM API (timeout, retry, streaming) | 20 Nói chuyện kỹ thuật với client · 13 Giao việc rõ cho AI agent |
| 3 | Database, SQL, index, transactions | + SQL injection. AI: embeddings, vector search | 7 Chất lượng và tech debt · 18 Khớp kỹ thuật với mục tiêu product |
| 4 | Testing và CI | AI: evals | 8 Chiến lược test, release an toàn · 6 Code review và chuẩn code |
| 5 | Cache và CDN | AI: prompt caching | 5 Chia việc, estimate, cắt scope · 21 Nói chuyện kỹ thuật với cấp trên |
| 6 | Queue và async | AI: job chạy nền, Batch API | 17 Gỡ vướng và giao việc · 15 Quyết định ship hay chặn kết quả của AI |
| 7 | Distributed systems: consistency, idempotency, retry | | 2 System design qua ranh giới · 22 Mentoring qua việc kỹ thuật |
| 8 | Reliability: monitoring, sự cố, release an toàn | AI: chi phí, độ trễ, model dự phòng | 10 Sự cố production · 9 Observability |
| 9 | Security | AI: prompt injection, OWASP Top 10 for LLM | 12 Security và rủi ro · 4 Design doc và ADR (phần Risks) |
| 10 | Code architecture và system design | Mở Interview Tower | 2 System design · 24 Định hướng nhiều team (staff) |
| 11 | Quyết định tech lead: design doc, ADR, estimate, trade-off | | 1 Vision kỹ thuật cho team · 25 Chọn việc đáng làm (staff) |
| 12 | Lead AI agent + build tính năng AI + project cuối năm | | 23 Chiến lược và chuẩn chung (staff) · 26 Trình bày với CTO (staff) |

**Skill luyện ở mọi thành phố:**

| Skill | Luyện bằng gì |
|---|---|
| 3 Trade-off | Mọi Battle có Constraint, và Decision Card |
| 14 Review code do AI viết | Agent Diff Battle mỗi tuần |
| 16 Hiểu sâu tech stack khi ít tự code | Ôn hằng ngày |
| 20, 21, 26 Nói chuyện với client, cấp trên, CTO | Meeting Battle 1–2 lần mỗi tuần, theo chủ đề của tháng |

"Tháng" ở đây là tháng của từng người, tính từ ngày bắt đầu của người đó. Bạn bè vào sau vẫn bắt đầu từ thành phố 1.

Danh sách khái niệm và nguồn của từng tháng: `research/roadmap-sources.md`, mục 3. Mỗi sinh vật vẫn cần nguồn chính.

Mỗi thành phố thêm **1 cơ chế chơi mới nhỏ**, để chống việc hiệu ứng game giảm sau khoảng 4 tuần. Ngày đầu của mỗi thành phố phải cho cảm giác "mới bắt đầu" (fresh start), bắt đầu bằng **Town Intro**.

## 5. Lối chơi

| Trong Pokémon | Trong app |
|---|---|
| Bản đồ 12 thành phố | Lộ trình 12 tháng. Bản đồ pixel, bấm để vào |
| Sinh vật | 1 khái niệm tech, ví dụ `Cache` |
| Chiêu | Khái niệm con, ví dụ `TTL`, `write-through`, `cache invalidation`, `cache stampede` |
| Bắt | Học **Lesson** trước, rồi trả lời 1 câu hỏi |
| Tiến hóa | Dạng 2 khi qua mốc ôn 7 ngày. Dạng 3 khi qua mốc 30 ngày **và** trả lời đúng 1 câu trade-off khó |
| Pokédex | **Field Guide**: đã gặp / đã bắt / đã tiến hóa hết |
| Bảng khắc chế hệ | Bảng chiêu của từng lượt: sát thương 0 / 1 / 2 + đòn phản công. Constraint quyết định chiêu nào tốt nhất |
| Trận đấu | Battle, Meeting Battle, Agent Diff Battle (mục 7) |
| Thẻ huấn luyện viên | **Trainer Card**: tỉ lệ từng Skill của bạn |
| Gym + huy hiệu | Bài kiểm tra cuối tháng, trộn khái niệm dễ nhầm, Constraint đảo ngược |
| Giáo sư | Lesson, Town Intro, bài giải mẫu, câu trả lời mẫu, và thảo luận với Claude Pro |
| Elite Four | **Interview Tower**: 4 buổi phỏng vấn system design bằng tiếng Anh, làm trong Claude Pro |
| Champion | Checklist: design doc, chia ticket, review PR, chịu trách nhiệm production |
| Trung tâm hồi phục | **Rest Stop**: màn hình "Quay lại" sau 3+ ngày nghỉ: 1 lần bấm, buổi học 3 phút, không trách, "New week starts Monday" |

**Sinh vật và Skill khác nhau** (Q39):
- Sinh vật là "đội của bạn": kiến thức. Bạn bắt, ôn, tiến hóa chúng.
- Skill là "chính bạn": cách dùng kiến thức. Skill không bắt được. Skill hiện trên Trainer Card.

Không dùng tên, hình hoặc nhân vật Pokémon. Không dùng "Poké" hoặc "-mon" trong tên.

## 6. Học, Bắt và Ôn

### 6.1 Town Intro (Q3)

- Hiện 1 lần, ở ngày đầu của mỗi thành phố.
- Khoảng 3 phút. 1 sơ đồ cho thấy các khái niệm của thành phố nối với nhau thế nào.
- Ví dụ Town 1: "Một request đi từ trình duyệt đến server thế nào" (example made up).
- Mở lại được từ bản đồ.

### 6.2 System Map (Q27)

- 1 sơ đồ một hệ thống web thật: trình duyệt → CDN → API → cache → database → queue.
- Mỗi sinh vật bạn đã bắt hiện ở đúng chỗ của nó trên sơ đồ.
- Thành phố không phải một phần của hệ thống (Testing, Security, Quyết định tech lead): sinh vật của chúng gắn vào đường nối hoặc lớp bao quanh. Agent chọn cách vẽ khi build.
- Bản đồ pixel 12 thành phố vẫn giữ. System Map là màn riêng.

### 6.3 Bắt (catch) — dạy trước, hỏi sau (Q2, Q9, Q10, Q19)

1. App hiện **Lesson**: 3 màn nhỏ, vuốt qua.
   - Mỗi màn tối đa 50 từ, 1 ý.
   - Mỗi màn có 1 hình hoặc sơ đồ khi ý đó cần.
   - Có 1 ví dụ thật và 1 link nguồn chính uy tín (ví dụ MDN, RFC, tài liệu chính thức).
2. App hỏi 1 câu về khái niệm vừa học.
3. Trả lời đúng: bắt được sinh vật (dạng 1).
4. Trả lời sai: app hiện lại **đúng màn Lesson** chứa đáp án. Bạn trả lời lại 1 lần.

Hình: **sơ đồ** (hộp và mũi tên) cho kiến thức. Hình pixel chỉ cho sinh vật và phần game.
Lý do đổi: "hỏi trước" (v1.4) giúp nhớ lâu hơn theo research, nhưng bạn thấy bị lạc. Mất người học tệ hơn mất một chút lợi ích nhớ lâu.

### 6.4 Ôn (review) (Q22, Q28)

Ôn vẫn là **thẻ nhanh**, để ngày 3 phút vẫn đủ 8 bài. Thêm hình sinh vật, tiếng và hiệu ứng khi đúng.

**Thẻ thường:**
1. App hiện câu hỏi. Bạn **nghĩ** câu trả lời trong đầu. Ở ngày 15 và 45 phút, có thể gõ câu trả lời.
2. Bấm "Reveal" để xem đáp án.
3. Tự chấm 4 mức: **Again / Hard / Good / Easy**.

**Decision Card** (khoảng 1 trong 4 bài ôn):
1. 1 tình huống ngắn, 2 lựa chọn.
2. Bấm 1 lựa chọn, rồi bấm 1 Reason.
3. App chấm tự động.

| Quy tắc ôn | Giá trị |
|---|---|
| Khoảng cách | 1 → 3 → 7 → 14 → 30 → 90 ngày, thêm 1 lần ở khoảng ngày 180 |
| Again | Lùi 1 mốc |
| Hard | Ôn lại đúng mốc hiện tại |
| Good | Lên mốc tiếp theo |
| Easy | Bỏ qua 1 mốc |
| Đơn vị ôn | Thứ bạn bắt mỗi ngày: 1 sinh vật hoặc 1 chiêu |
| Giới hạn | Tối đa 8 bài/ngày. Bài trễ lâu nhất ôn trước |
| Chốt chặn | Nếu hàng ôn quá 8 bài trong 3 ngày liền: tạm dừng bắt mới cho đến khi hết dồn |
| Dữ liệu | Mỗi lần ôn được ghi lại đầy đủ (mục 12) |
| Trộn | Bài ôn trộn các khái niệm dễ nhầm từ nhiều thành phố |
| Tháng 3 | Kiểm tra có cần đổi sang FSRS không (mục 15) |

### 6.5 Tiến hóa (Q26, Q32)

| Dạng | Điều kiện |
|---|---|
| 1 | Bắt được |
| 2 | Ôn đúng qua mốc 7 ngày |
| 3 | Ôn đúng qua mốc 30 ngày **và** trả lời đúng 1 **câu trade-off khó** của sinh vật đó |

- Câu trade-off khó là 1 Decision Card khó hơn: **3 lựa chọn + Reason**. App chấm tự động.
- Sai: thử lại ở lần ôn sau. Sinh vật vẫn giữ Dạng 2.
- Sinh vật đã lên Dạng 3 trước v1.5 vẫn giữ nguyên dạng.

## 7. Trận đấu (không có AI)

### 7.1 Ba loại trận

| Loại | Đối thủ | Chiêu | Constraint |
|---|---|---|---|
| **Battle** | Một vấn đề kỹ thuật thật, ví dụ "Trang sản phẩm chậm khi traffic tăng" | Các khái niệm bạn đã bắt | Hoàn cảnh kỹ thuật: ngân sách, team, deadline, dữ liệu |
| **Meeting Battle** | Một câu hỏi hoặc áp lực từ client hoặc cấp trên, ví dụ "Why is this late?" | Các cách trả lời | Hoàn cảnh cuộc họp, ví dụ "The client launches on Friday" |
| **Agent Diff Battle** | Một đoạn code ngắn do AI agent viết, có cài sẵn 1 vấn đề | Các quyết định review: approve, yêu cầu thêm test, chặn, thu hẹp | Hoàn cảnh release, ví dụ "Release tonight" |

- Meeting Battle luyện Skill 19–21 và 26. Nó dạy được cấu trúc câu trả lời và việc chọn nội dung. Nó không dạy được giọng nói, phản ứng thật trong cuộc họp, và niềm tin theo thời gian (`research/tech-lead-skills.md`).
- Agent Diff Battle luyện Skill 14 và 15. Code lấy theo chủ đề tech của tháng.

### 7.2 Một lượt

1. **Lần đầu gặp một khái niệm trong thành phố mới:** xem 1 bài giải mẫu trước trận, rồi bài giải bị ẩn. Bỏ qua bước này nếu kiểm tra đầu vào cho thấy bạn đã biết.
2. **Trước trận:** bạn thấy hệ của đối thủ (màu + icon + chữ) và chọn đội 3 sinh vật. Chỉ dùng được chiêu của sinh vật đã bắt.
3. **Đầu lượt:** app hiện **mối đe dọa** của đối thủ (icon trên đầu đối thủ + 1 câu ngắn) và **1 dòng Constraint**.
4. **Chọn chiêu.** Constraint quyết định chiêu nào tốt nhất.
5. **Chọn 1 trong 3 Reason** trước khi thấy kết quả. Gõ thêm là tùy chọn.
6. **Ra đòn:** hiệu ứng chiêu, thanh HP của đối thủ giảm. Hiện chữ + số + ô, ví dụ "Strong hit · 2 ●●".
7. **Đối thủ đánh lại:** hiệu ứng đòn của đối thủ, thanh HP của bạn giảm. Kèm 1 câu nguyên nhân và kết quả, ví dụ "You chose cache. Customers see old prices."

**Ví dụ Constraint quyết định chiêu tốt nhất** (example made up). Mối đe dọa: "Trang sản phẩm chậm khi traffic tăng."

| Constraint | `CDN cache` |
|---|---|
| "Prices change every minute." | Sai: khách thấy giá cũ |
| "Prices change once a day. The team has 2 people." | Tốt nhất |

### 7.3 Luật HP (Q13, Q20, Q21)

| Luật | Giá trị |
|---|---|
| HP đối thủ | 4 |
| Sát thương lên đối thủ | Lấy từ bảng chiêu: 0, 1 hoặc 2 |
| Reason sai | Đòn yếu đi 1 (2 → 1, 1 → 0). Màn hình nói Reason đúng là gì |
| HP mỗi sinh vật của bạn | 3 |
| Sát thương lên bạn | Chiêu tốt nhất: 0. Chiêu tạm được (sát thương 1): mất 1. Chiêu sai (sát thương 0): mất 2 |
| Faint | Sinh vật hết HP thì Faint. Sinh vật tiếp theo trong đội vào thay |
| Thắng | HP đối thủ về 0, trong tối đa 3 lượt |
| Thua | Cả 3 sinh vật Faint, hoặc hết 3 lượt mà đối thủ còn HP |
| Sau khi thua | Các chiêu đã dùng được ôn lại vào ngày mai |

Ghi chú: với 3 lượt, bạn mất tối đa 6 HP. Đội 3 sinh vật có 9 HP. Vì vậy trong 1 trận 3 lượt, tối đa 2 sinh vật Faint. Thua thật sự đến từ việc hết 3 lượt. Xem `docs/adr/0001-battle-rules-v2.md`.

### 7.4 Cuối trận (Q14)

- Câu trả lời mẫu + 3 ý chính của **từng lượt**, gom lại 1 màn.
- Bạn tự đánh dấu ý nào mình đã nói được. Kết quả này **chỉ cập nhật lịch ôn**.
- Nút "Discuss in Claude" (mục 10).

### 7.5 Trộn và Gym (Q29, Q31)

- **Từ Town 2:** mỗi trận có 1 lượt cần chiêu của sinh vật ở thành phố cũ. Lý do: vấn đề thật không chia theo chương sách.
- **Gym:** gặp lại tình huống cũ với **Constraint đảo ngược**. Ví dụ: lần trước `CDN cache` thắng. Lần này giá đổi mỗi phút, nên `CDN cache` thua.

### 7.6 Tình huống lấy từ đâu (Q25)

- Từ **sự cố thật đã công bố** (postmortem của các công ty như Cloudflare, GitHub, Stripe) và blog kỹ thuật. Mỗi tình huống có link nguồn.
- Từ việc kỹ thuật nói chung. Không giới hạn ở Shopify hay một ngành.
- Được phép làm gọn tình huống cho vừa 3 lượt. Link nguồn vẫn trỏ về sự cố gốc.

### 7.7 Đo việc học

**Đo bằng tỉ lệ chọn chiêu tốt nhất theo Constraint,** không đo bằng tỉ lệ thắng.
Người đoán mò giờ chỉ thắng khoảng **7%** (3 chiêu) hoặc **3,5%** (4 chiêu). v1.4 là 37%. Cách tính ở `docs/adr/0001-battle-rules-v2.md`.

| Mục tiêu | Mức |
|---|---|
| Ôn đúng | Khoảng 90% |
| Chọn chiêu tốt nhất | 70–85% |
| Thắng trận (khi đã biết chủ đề) | 70–80% |
| Gym | Thắng 4/5 |

**Trainer Card** (Q39): mỗi lượt Battle và mỗi Decision Card được gắn 1 hoặc nhiều Skill. Tỉ lệ của 1 Skill = số lần chọn đúng / số lần gặp Skill đó. Không có XP.

Chống đoán mò: phải chọn Reason trước khi thấy kết quả. Các chiêu sai và Reason sai phải nghe hợp lý. Mỗi lượt có **đúng 1 chiêu tốt nhất**, không có hòa (mục 12).

## 8. Nội dung

- Claude Code tạo nội dung từ nguồn chính, lưu thành file JSON trong git. Dùng **tài khoản Pro cá nhân**, không dùng tài khoản công ty.
- **Mỗi thành phố:** 1 Town Intro, 10 câu kiểm tra đầu vào, danh sách các cặp khái niệm dễ nhầm, 1–2 Skill (mục 4).
- **Mỗi sinh vật và mỗi chiêu:** Lesson 3 màn (có sơ đồ khi cần), 1 câu hỏi "bắt", 1 ví dụ thật, 1 link nguồn, câu hỏi ôn và đáp án.
- **Mỗi sinh vật:** 1 câu trade-off khó cho Dạng 3 (3 lựa chọn + Reason). Một số Decision Card cho Ôn.
- **Mỗi lượt đấu:** mối đe dọa, Constraint, bảng chiêu (sát thương + câu phản công), 3 Reason (1 đúng), câu trả lời mẫu, 3 ý chính, các Skill được gắn.
- **Mỗi tình huống:** link nguồn của sự cố hoặc tình huống gốc.
- **Mỗi tuần:** 1–2 Meeting Battle và 1 Agent Diff Battle theo chủ đề của tháng.
- Mỗi khái niệm mới: 1 bài giải mẫu.
- **Kiểm tra đúng sai (Q33):** một agent **độc lập**, không phải agent viết nội dung, kiểm tra từng ý với link nguồn. Ý nào không khớp nguồn thì bị bỏ trước khi merge. "Report wrong" vẫn giữ.
- Trước mỗi tháng: in danh sách các "Report wrong" còn mở.
- Chỉ tạo nội dung cho thành phố hiện tại và thành phố kế tiếp.
- **Viết lại Town 1 và Town 2** theo dạng mới (Q11). ID cũ giữ nguyên (mục 12.3), nên lịch sử học của bạn không mất.
- Lộ trình cũ trong `~/Desktop/learn/` có phần trùng chủ đề. Chỉ dùng chúng làm nguyên liệu, vẫn phải kiểm tra.

## 9. Luật UI

| # | Luật |
|---|---|
| 1 | Màn đấu giống game thật (giống Coromon): sinh vật lớn, nền chiến đấu, thanh HP hai bên, hiệu ứng chiêu. Rất ít chữ trong trận |
| 2 | Màn đấu **cầm dọc**, bố cục **C · Panel**: cảnh đấu chiếm cả màn hình, đối thủ ở trên, sinh vật của bạn ở giữa. Đến lượt bạn, 1 bảng trượt lên từ dưới (tối đa nửa màn hình, không che sinh vật): mối đe dọa, Constraint, chiêu, rồi Reason. Lúc hoạt ảnh chạy, bảng đóng lại. Cầm 1 tay được |
| 3 | Trong trận: hiện mối đe dọa (icon + 1 câu) và Constraint **trước** khi chọn chiêu |
| 4 | Sau mỗi lượt: 1 câu "You chose X. Y happens." |
| 5 | Sát thương = chữ + số + ô: "Strong hit · 2 ●●" |
| 6 | Reason: 3 nút lớn. Không bắt gõ trong trận |
| 7 | Mỗi hệ = màu + icon + chữ. Không chỉ dùng màu |
| 8 | Màn hình commit: 3 nút lớn ở nửa dưới màn hình |
| 9 | Nút tối thiểu 44 px, nút chính 56 px. Dùng `100dvh` và `env(safe-area-inset-bottom)`. `touch-action: manipulation` cho nút |
| 10 | Font pixel chỉ cho tiêu đề và nhãn ngắn. Câu văn 16–17 px sans-serif. Có setting "Plain font" |
| 11 | Lesson: 3 màn, vuốt qua, mỗi màn 1 ý. Sơ đồ đọc được trên màn hình iPhone |
| 12 | Hiệu ứng ngắn, bỏ qua được. Tôn trọng `prefers-reduced-motion`. Có setting "Reduce effects". Không nháy quá 3 lần/giây |
| 13 | Âm thanh bật từ lần bấm đầu tiên. **Nút loa ngay trên màn chơi.** Mỗi âm thanh có chữ đi kèm |
| 14 | iPhone gạt im lặng thì app im lặng theo. Lần đầu hiện 1 dòng: "Turn off silent mode to hear the music" |
| 15 | Nút **Feedback** ở mọi màn |
| 16 | Độ tương phản: 4,5:1 cho chữ, 3:1 cho icon và thành phần UI |
| 17 | "Discuss in Claude": copy trong lúc bấm nút. Nếu copy lỗi thì hiện ô chữ để copy tay |
| 18 | Người là chân dung trong khung (Meeting Battle, Agent Diff Battle, Trainer Card). Sinh vật là sprite đứng trên bệ |
| 19 | Mỗi khái niệm là 1 loài khác nhau. Field Guide hiện 3 trạng thái: màu, xám, bóng đen "???" |

Không dùng rung (`navigator.vibrate` không chạy trên iOS Safari). Mọi phản hồi phải có hình và chữ.
Hình pixel: phóng to theo số nguyên (sinh vật 64 px → x2, chân dung 64 px → x1,5–x2), `image-rendering: pixelated`. Kiểm tra trên iPhone thật.

Prototype đã duyệt: https://claude.ai/artifact/PLKDLa2q7igeAAjkoxD6zg. Code của prototype nằm ở nhánh `prototype/gameplay-ui`, không merge vào `main`.

## 10. AI: không chạy trong app, học sâu qua Claude Pro

| Việc | Cách làm | Chi phí |
|---|---|---|
| Tạo nội dung | Claude Code (tài khoản Pro cá nhân), lúc build | Trong gói Pro |
| Kiểm tra nội dung | Một agent độc lập, lúc build | Trong gói Pro |
| Ôn tập, trận đấu, Gym | Tự chấm, bảng chiêu tạo sẵn, Reason tạo sẵn, câu trả lời mẫu | $0 |
| Học sâu sau trận | Nút **"Discuss in Claude"** | Trong gói Pro |
| Interview Tower | Gói prompt "người phỏng vấn" mở trong Claude Pro. Chốt ở tháng 10 | Trong gói Pro |

Gói "Discuss in Claude" gồm:
- Tình huống, Constraint, chiêu và Reason bạn chọn ở từng lượt, câu bạn gõ thêm (nếu có)
- Sát thương, đòn phản công, các ý bạn đã đánh dấu
- Câu trả lời mẫu và 3 ý chính (Claude được yêu cầu giữ kín lúc đầu)
- Lesson và link nguồn chính
- Prompt "coach":

```
You are my tech lead coach. Below is my battle and the model answer. Do not show the model answer yet. Ask me ONE question at a time about my choice and my reason. Wait for my reply. Give hints, not solutions. After three rounds, compare my thinking with the model answer. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.
```

**Sau khi chat:** quay lại app, viết 2 câu từ trí nhớ về điều đã học. App lưu 2 câu này và hỏi lại ở lần ôn sau.

Tại sao Claude phải hỏi lại, không làm hộ: trong nghiên cứu ngẫu nhiên của Anthropic (52 kỹ sư), nhóm có AI hỗ trợ đạt 50% trong bài kiểm tra, nhóm tự code đạt 67%. Nguồn: https://www.anthropic.com/research/AI-assistance-coding-skills. Trong Bastani 2025, AI chỉ gợi ý và giấu đáp án thì không gây hại.

Cách mở: copy vào clipboard, rồi mở `https://claude.ai/new`. Link `claude.ai/new?q=...` lúc chạy lúc không (not verified), phải test trước khi dùng.

Ghi chú:
- Gói Claude Pro không bao gồm API. Điều này chỉ quan trọng nếu sau này thêm AI vào app.
- Không chuyển yêu cầu của bạn bè qua gói Pro của bạn. Anthropic không cho phép điều này. Nguồn: https://code.claude.com/docs/en/legal-and-compliance

## 11. Nền tảng và tech stack

- **Một web app chạy trên cả 2 nơi:**
  - iPhone: PWA cài lên màn hình chính. Cần iOS 16.4+ thì thông báo mới chạy.
  - Máy tính: mở trong trình duyệt như một web app bình thường.
- Thiết kế mobile-first. Trên máy tính, màn hình Boss và ADR rộng hơn: một bên là editor, một bên là preview Mermaid.
- Login bằng mã 6 số qua email, dùng được trên cả 2 nơi. Không dùng magic link, vì magic link mở trong Safari chứ không mở trong PWA.

| Phần | Công cụ |
|---|---|
| Frontend | Next.js + React + TypeScript |
| Backend | Supabase (gói Free): Postgres, login bằng mã 6 số, RLS, `pg_cron` |
| Database khi code | Supabase chạy trên Mac (`supabase start`). Không bao giờ test trên database thật |
| AI | Không gọi AI lúc chạy. "Discuss in Claude" = clipboard + mở `claude.ai` |
| Thông báo | `web-push` + service worker |
| Hình và animation | Sinh vật: [50+ Monsters Pack 2D](https://opengameart.org/content/50-monsters-pack-2d) (CC0, 56 loài, đủ khoảng 4 thành phố; thiếu thì mua thêm hoặc dùng bộ màu thứ 2 cho dạng tiến hóa). Người: [64px portraits](https://opengameart.org/content/64px-portraits) của peb (CC-BY 4.0, ghi tên trong màn Credits). Màn đấu cần chuyển động nhiều hơn: agent chọn CSS hay canvas khi build, và ghi lý do trong PR |
| Sơ đồ trong Lesson | Tạo từ nội dung (ví dụ Mermaid, app đã có phần preview Mermaid) |
| Âm thanh | Hiệu ứng 8-bit + **nhạc nền** cho bản đồ và trận đấu (bộ CC0 trước). Mọi file có giấy phép ghi trong repo |
| Backup | Export nhật ký thô mỗi tuần (GitHub Actions) + nút "Download my data" |
| Test | Vitest + Playwright (màn hình iPhone + Desktop Chrome) |
| Hosting | Vercel |

## 12. Kiến trúc dữ liệu

### 12.1 Ba rủi ro lớn nhất

| Rủi ro | Bạn sẽ thấy gì nếu sai |
|---|---|
| Ghi thiếu dữ liệu học | Tháng 3 không kiểm tra được FSRS. Không đo được tỉ lệ chọn chiêu tốt nhất. Dữ liệu không ghi vào đúng ngày thì mất luôn |
| Một database miễn phí, không có bản sao | Một buổi sáng app báo "paused" hoặc Field Guide trống. Mất tiến độ của nhiều tháng |
| ID nội dung bị đổi khi sửa chữ | Đổi tên `Cache` thành `Caching` thì lịch sử ôn biến mất. "3 sinh vật yếu nhất" hiện ô trống |

### 12.2 Lịch sử học: nhật ký không bao giờ sửa

Mỗi việc bạn làm được ghi thành **1 dòng mới, không bao giờ sửa** (event log). Trạng thái hiện tại (bài nào đến hạn ôn) được tính lại từ nhật ký.

| Nhật ký | Ghi lại những gì | Dùng để |
|---|---|---|
| `review_events` | Bài nào, loại (sinh vật, chiêu, **Decision Card**), phiên bản nội dung, mốc trước và sau, mức chấm, ngày đến hạn, lúc hiện câu hỏi, lúc bấm "Reveal", lúc chấm, câu đã gõ (nếu có), lựa chọn và Reason (Decision Card) | Tháng 3 kiểm tra FSRS. Phát hiện chấm vội. Tỉ lệ đúng Decision Card |
| `catch_events` | Bài nào, phiên bản nội dung, câu trả lời, đúng hay sai, **lần thử thứ mấy (1 hoặc 2)**, mức tự tin | Biết khái niệm nào khó bắt |
| `battle_turns` | Trận nào, loại trận, tình huống, lượt số mấy, Constraint, chiêu đã chọn, sát thương, **có phải chiêu tốt nhất không**, Reason đã chọn, Reason đúng hay sai, HP bạn mất, Skill được gắn, câu gõ thêm (nếu có), mức tự tin | Tỉ lệ chọn chiêu tốt nhất theo Constraint. Trainer Card |
| `battles` | Loại trận, tình huống, đội 3 sinh vật, kết quả, số lượt, số sinh vật Faint, số ý tự đánh dấu, đã bấm "Discuss in Claude" chưa, 2 câu viết lại | Tracking theo thành phố |
| `sessions` | Mức đã chọn (3/15/45), lúc bắt đầu, lần cuối thấy hoạt động, số giây học (ghi mỗi 60 giây), thiết bị | Tỉ lệ 30 ngày, số phút mỗi tuần, lời nhắc 20:00, đo thời gian thật để giữ 3/15/45 |
| `feedback` | Lời nhắn, màn hình đang mở, thời điểm, trạng thái | Agent đọc mỗi tuần |

Mọi dòng đều có: người dùng, thời điểm thật (có múi giờ), ngày học (tính theo mốc 04:00), buổi học, và **mã chống bấm 2 lần** (`client_event_id`).

- "Có phải chiêu tốt nhất không" và "Reason đúng hay sai" được ghi lại ngay lúc đấu. Sau này sửa bảng chiêu thì lịch sử vẫn đúng.
- **Đổi thiết kế không xóa dữ liệu cũ.** Cột cũ (ví dụ câu "why" đã gõ) giữ nguyên. Cột mới được thêm vào. Đây là cửa một chiều: agent chọn cách giữ mọi dữ liệu, và ghi trong PR (mục 16).
- **Phiên bản nội dung** (`content_hash`) được tính tự động lúc build và ghi vào mọi dòng.
- **Bấm 2 lần chỉ ghi 1 lần.**
- **Tóm tắt Chủ nhật** được lưu như một ảnh chụp. Số liệu tuần trước không tự đổi khi bạn sửa nội dung.

### 12.3 Nội dung: JSON trong git, ID không bao giờ đổi

- Nội dung là file JSON trong git, được gói vào app lúc build. Có schema và chương trình kiểm tra tự động.
- **ID là tên ngắn, không bao giờ đổi:** `cache`, `cache.ttl`, `t01-black-friday`. Tên hiển thị thì đổi được.
- **Không bao giờ xóa.** Nội dung bỏ đi được đánh dấu `"retired": true` và vẫn nằm trong file.
- Có 1 file ghi lại mọi ID đã từng phát hành. Thiếu 1 ID thì build báo lỗi.
- Chương trình kiểm tra bắt buộc các luật:
  1. Mỗi lượt đấu có **đúng 1 chiêu** có sát thương cao nhất. Không có hòa.
  2. Mọi chiêu trong bảng chiêu đều phải là chiêu có thật, bắt được.
  3. Mỗi lượt có **đúng 3 Reason**, đúng 1 Reason đúng.
  4. Mỗi lượt có 1 Constraint.
  5. Mỗi Lesson có 1 link nguồn. Mỗi màn Lesson tối đa 50 từ.
- **"Report wrong":** lưu bài nào, phiên bản nội dung, lời nhắn, màn hình, trạng thái. Sửa xong thì đổi trạng thái thành `done`.

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
1. Nút **"Download my data"** trong Settings: tải về 1 file JSON nhật ký thô.
2. **Export tự động mỗi thứ Hai** (GitHub Actions), có mã hóa. Giữ file lâu hơn 90 ngày.
3. **Chương trình khôi phục:** đưa file export vào một database trống.
4. Settings hiện **"Last backup: <ngày>"**.
5. Khi bạn bè tham gia: chuyển sang gói Pro của Supabase để có backup hằng ngày và không bị tạm dừng (giá chưa kiểm tra).
6. **Trước mọi thay đổi database thật** cho v1.5: export trước.

### 12.7 Các luật khác

| Luật | Bạn thấy gì |
|---|---|
| Link dùng tên nội dung, ví dụ `/battle/t01-black-friday`. Không có ID người dùng trong link | Link trong thông báo không bị hỏng |
| Database khi code chạy trên Mac. Không bao giờ đăng nhập thử trên database thật | Dữ liệu thử không lẫn vào ngày học thật |
| Cả app này và `franklin-os` đều export được "số ngày học trong 30 ngày", cùng luật ≥ 3 phút | So sánh được cho luật 6 (mục 14) |

## 13. Thứ tự build

Sprint 1–4 đã ship (Sprint 4: PR #90, 2026-10-20). Milestone Sprint 5 đã có, đang giữ ticket #91.

| Bước | Build | Bạn làm gì |
|---|---|---|
| **0. Kiểm lại ticket đang mở** | Ticket nào còn mở (ví dụ #91) và còn hợp với v1.5 thì giữ trong Sprint 5, còn lại đóng | Học bằng app như hiện tại |
| **1. Prototype gameplay** ✅ | Đã duyệt 2026-10-21: bố cục C, bộ quái vật 64 px, chân dung người, Field Guide 30 loài | Xong |
| **Sprint 5** | Âm thanh (thêm tiếng, nhạc nền, nút loa, nhắc nút im lặng). Nút Feedback + agent đọc mỗi tuần. Màn Lesson và Town Intro. Agent kiểm tra nội dung độc lập | Kiểm tra trên iPhone cuối sprint |
| **Sprint 6** | Battle mới: hình và nền (CC0), HP hai bên, Faint, Constraint, Reason, màn tổng kết cuối trận, Meeting Battle, Agent Diff Battle. Nhật ký trận mới (giữ dữ liệu cũ) | Kiểm tra trên iPhone cuối sprint |
| **Sprint 7** | Decision Card trong Ôn. Tiến hóa Dạng 3. Trainer Card. System Map. Gym với Constraint đảo ngược. Bản đồ pixel. Ôn có hình, tiếng, hiệu ứng. Tóm tắt Chủ nhật mới | Kiểm tra trên iPhone cuối sprint |
| **Song song** | Viết lại nội dung Town 1 và Town 2 theo dạng mới, kèm Skill của từng thành phố. Agent độc lập kiểm tra trước khi merge | Đọc nếu muốn học |
| Tháng 2–3 | Khi bạn quyết định mời bạn bè: thêm email vào `allowed_emails`, chuyển Supabase sang gói Pro. Checklist Champion | Bạn quyết định ngày mời |
| Tháng 10 | Interview Tower | Bạn |

Ngày của từng sprint do milestone trên GitHub quyết định.
Trong lúc build, bạn vẫn học mỗi ngày bằng bản đang có (luật 1, mục 14).

## 14. Luật bảo vệ

1. Mỗi ngày học 15 phút **trước** khi mở code của app.
2. App được đo bằng **số ngày học**, không đo bằng số tính năng.
3. Ngày thứ 8 mà chưa học được bằng app: dừng build, học bằng bản đang có.
4. Chỉ tạo nội dung cho 2 thành phố: thành phố hiện tại và thành phố kế tiếp.
5. Mục tiêu mới giữa năm thì ghi vào danh sách "Later" trong app. Không tạo lộ trình mới.
6. Sau 30 ngày, so tỉ lệ ngày dùng trong 30 ngày của app này và `franklin-os`. App nào dưới 50% thì tạm dừng.
7. Sau 4 tuần: nếu bạn mở app ít hơn 5 ngày mỗi tuần, thử thêm "days learned this week". Vẫn không có chuỗi streak.
8. Giữ màn hình "Quay lại" và ngày 3 phút ít nhất đến **tuần 12**. Thói quen có thể cần 2–5 tháng (`research/learning-science.md`, mục 4).

Lý do dừng thật trước đây (v1.4, Q27): đổi mục tiêu, bận việc công ty, đang học AI song song, ít năng lượng.

## 15. Later và các điểm kiểm tra

| Mục | Khi nào |
|---|---|
| Đổi sang FSRS nếu: tỉ lệ ôn đúng ở 1 mốc dưới 80% hoặc trên 97% (ít nhất 100 lần ôn), hoặc hàng ôn chạm giới hạn 8 trong 10+ ngày của 4 tuần, hoặc đã có 500+ lần ôn | Kiểm tra ở tháng 3 |
| Supabase gói Pro | Khi bạn bè tham gia |
| AI chấm Gym (API), nếu tự đánh dấu quá dễ dãi | Sau 1 tháng |
| Chơi với bạn bè (thấy nhau, đấu với nhau) | Later |
| Chạy khi không có mạng (Ôn và Bắt) | Sau Sprint 7 |
| Interview Tower bằng giọng nói hay bằng chữ | Tháng 10 |

Đã bỏ khỏi Later vì giờ đã nằm trong kế hoạch: nhạc nền (Sprint 5).

## 16. Factory: agent build app thế nào

| Phần | Quyết định | Câu |
|---|---|---|
| Mức tự động | Agent tự viết code, test, review, sửa, mở PR, merge vào nhánh sprint, deploy bản thử, và tự ship khi sprint hết ticket. Trước khi đổi database thật: luôn backup trước | v1.4: Q53, 2026-10-20 |
| Bạn kiểm tra khi nào | **Cuối mỗi sprint hoặc mỗi tính năng lớn**, trên iPhone. Không phải mỗi ticket. Agent gom 1 danh sách kiểm tra cho mỗi sprint | 2026-10-21 |
| Prototype | Prototype gameplay phải được bạn duyệt trên iPhone trước khi build Sprint 5 | Q8, 2026-10-21 |
| Ngân sách | Không giới hạn số ticket mỗi ngày. Ticket này merge xong thì làm ticket tiếp | v1.4: Q55, 2026-10-20 |
| Tài khoản | Claude Code: tài khoản bạn đang dùng. GitHub: `lam-valamorgulis`, repo private | v1.4: Q55 |
| Tài liệu | Mọi tài liệu của project được commit lên GitHub | v1.4: Q54 |
| Tracker | GitHub Issues, 5 nhãn mặc định. Spec là issue #1 | Setup |
| Sprint | Milestone + bảng Kanban (project #2): Todo → In progress → In review → Done | v1.4: Q56 |
| Nhánh | Mỗi ticket 1 nhánh, 1 PR vào nhánh `sprint-N`. "ship" = merge `sprint-N` vào `main` | v1.4: Q53 |
| Thay đổi khó sửa | Dữ liệu, ID, luật game, luật bảo vệ ở mục 14 → agent chọn cách an toàn hơn, build luôn, và ghi lựa chọn cùng lý do trong PR (phần "Choices made"). Không chờ bạn | v1.4: Q53, 2026-10-20 |
| Thay đổi dễ sửa | Chi tiết UI, câu chữ, khoảng cách → agent làm luôn trong PR và ghi chú trong PR | v1.4: Q53 |
| Feedback | Mỗi tuần agent đọc bảng `feedback`, gom các ý giống nhau, tạo GitHub issue nhãn `needs-triage` | Q7 |
| Việc chỉ bạn làm | Chạy wizard và thêm secret. Dùng app thật trên iPhone và báo lỗi. Duyệt prototype gameplay | 2026-10-20, 2026-10-21 |
| Luật cho agent | Nằm trong `CLAUDE.md` và `docs/agents/factory.md` | — |

Lỗi trên app thật được sửa trước mọi ticket khác.

## 17. Lịch nội dung

Sau Sprint 7, app chuyển sang chế độ **"mỗi tháng thêm nội dung"**. Ticket cho từng việc được tạo khi tới lúc, không tạo trước.

| Khi nào | Việc |
|---|---|
| **Tuần 1 của mỗi tháng N** (tính theo ngày bắt đầu của bạn) | Tạo ticket cho thành phố N+1: Town Intro, Lesson, câu hỏi, Decision Card, câu trade-off khó, Battle, Meeting Battle, Agent Diff Battle, cơ chế chơi mới, Skill của thành phố. Agent độc lập kiểm tra rồi merge. Thành phố N+1 sẵn sàng trước ngày đầu tháng N+1 |
| Trong Sprint 5–7 | Viết lại Town 1 và Town 2 theo dạng mới |
| Tháng 2–3 | Mời bạn bè: thêm email vào `allowed_emails`, chuyển Supabase sang gói Pro. Checklist Champion |
| Tháng 3 | Kiểm tra có cần đổi sang FSRS không (mục 15) |
| Tháng 10 | Interview Tower: chốt cách làm (giọng nói hay chữ), rồi build |
| Mỗi tuần | Agent đọc Feedback và tạo issue `needs-triage` |
| Bất kỳ lúc nào | Sửa lỗi từ "Report wrong" |

Luật 4 ở mục 14 vẫn giữ: lúc nào cũng chỉ có nội dung của thành phố hiện tại và thành phố kế tiếp.
