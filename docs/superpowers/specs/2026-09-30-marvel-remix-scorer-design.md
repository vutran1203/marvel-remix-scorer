# Marvel: Remix — Web tính điểm (Design Spec)

Ngày: 2026-09-30
Trạng thái: chờ duyệt

## 1. Mục tiêu

Web tĩnh giúp tính điểm board game **Marvel: Remix** (WizKids, 2–6 người) khi chơi ngoài đời.
Cuối ván (hoặc trong ván để tính thử), mỗi người chọn các lá đang cầm; web tự tính toàn bộ
điểm (base power + bonus + blank/transform/lựa chọn), giải thích từng lá và xếp hạng.

**Thành công khi:**
- Ví dụ trang 7 sách hướng dẫn ra đúng **77** điểm; các ví dụ FAQ ra đúng số.
- Nhập tay bài 7 lá trên điện thoại trong < 30 giây/người.
- Mở được bằng link trên điện thoại, không cần đăng nhập, không cần mạng sau khi tải.

**Ngoài phạm vi (bản đầu):** lịch sử các ván, trang tra cứu bộ bài riêng, nhận diện ảnh,
đồng bộ nhiều thiết bị, backend.

## 2. Quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Nhập tay bài | Chọn lá từ danh sách/lưới ảnh; web tự tính mọi bonus |
| Thiết bị | Dùng chung 1 máy, nhập lần lượt từng người |
| Lựa chọn của người chơi | Web tự thử mọi phương án, lấy điểm cao nhất, hiển thị lựa chọn đã dùng |
| Loki | Người chơi nhập lá đã rút (chọn lá hoặc gõ số power) |
| Hiển thị lá | Ảnh thật đã xử lý (cắt nền, xoay thẳng, nén WebP) |
| Ngôn ngữ | Giao diện tiếng Việt; tên lá + text luật giữ tiếng Anh |
| Tính năng thêm | Chặn chọn trùng lá giữa người chơi; điểm tạm tính cập nhật trực tiếp; thư viện lá chia tab theo loại + tìm theo tên |
| Kiến trúc luật | Dữ liệu tĩnh + luật viết bằng TypeScript ghép từ hàm trợ giúp |
| Stack | Vite + React + TypeScript, Vitest, deploy GitHub Pages qua GitHub Actions |

## 3. Luật game (tóm tắt từ sách)

- Bộ bài: 61 lá REMIX (không có VILLAIN) + 18 lá VILLAIN. Mỗi người giữ 7 lá cuối ván.
- Loại: HERO, ALLY, CONDITION, EQUIPMENT, LOCATION, MANEUVER, VILLAIN.
- 13 tag: Tech, Intel, Strength, Agility, Flight, Range, Wakanda, Asgard, Mutant, Gamma, Worthy, Urban, Boss.
  Một lá có thể có nhiều tag giống nhau (Hawkeye có 2 Range) — mỗi cái tính riêng.
- Tay bài phải có ≥1 HERO/ALLY **và** ≥1 VILLAIN không bị blank, nếu không tổng = 0.
- Tổng = Σ base power các lá không bị blank (có thể âm; `*` = 0) + Σ bonus.
- **WITH**: bonus nhận tối đa 1 lần. **FOR EACH**: nhận 1 lần cho mỗi lá/tag phù hợp.
- **Blank**: lá bị blank không có điểm, không cho điểm lá khác, không ảnh hưởng tay bài
  (tag của nó không tính, hiệu ứng của nó không áp dụng). Khi nhiều lá blank lẫn nhau,
  người chơi chọn thứ tự kích hoạt.
- **Blanked unless with**: lá tự blank trừ khi thỏa điều kiện.
- **Transform with**: đủ điều kiện thì bắt buộc lật; chỉ dùng thông tin của mặt mới.
- Bài của người khác không ảnh hưởng tay bài mình. Hòa thì cùng thắng.
- FAQ: Loki trừ base power lá rút được, vẫn áp dụng kể cả khi Loki bị blank; lá rút không tương tác với tay bài.

## 4. Màn hình

**Thiết lập:** thêm/bớt 2–6 người, sửa tên (mặc định "Người 1"…). Nút "Bắt đầu tính điểm".

**Chọn bài:**
- Tab người chơi ở trên cùng.
- Khay tay bài: 7 ô; bấm lá để bỏ; hiển thị điểm tạm tính cập nhật tức thì.
  Cảnh báo (không chặn) khi thiếu VILLAIN hoặc HERO/ALLY.
- Lá cần input (Loki) có form nhỏ trong khay.
- Thư viện: tab theo 7 loại (kèm số lượng) + ô tìm theo tên + lưới ảnh.
  Lá đang ở tay người khác bị làm mờ, ghi "Đang ở tay <tên>", không chọn được.
  Không cho thêm khi đã đủ 7 lá.

**Kết quả:**
- Bảng xếp hạng (người thắng/đồng hạng được đánh dấu).
- Bấm vào người chơi → bảng giải thích từng lá: base, từng bonus kèm lý do,
  trạng thái Blank/Transform, lựa chọn web đã dùng; dòng tổng. Nếu tổng = 0 do thiếu
  điều kiện thì ghi rõ lý do.
- Nút "Sửa tay bài", "Ván mới".

Ưu tiên giao diện điện thoại. Trạng thái ván lưu tạm localStorage (bọc try/catch; hỏng thì bắt đầu lại).

## 5. Dữ liệu lá bài

```ts
type CardType = 'HERO'|'ALLY'|'CONDITION'|'EQUIPMENT'|'LOCATION'|'MANEUVER'|'VILLAIN'
type Tag = 'Tech'|'Intel'|'Strength'|'Agility'|'Flight'|'Range'|'Wakanda'
         |'Asgard'|'Mutant'|'Gamma'|'Worthy'|'Urban'|'Boss'

interface CardFace { name: string; type: CardType; power: number; powerStar?: boolean; tags: Tag[]; text: string }

interface CardDef extends CardFace {
  id: string              // slug, vd 'captain-america'
  number?: number         // số in góc dưới lá
  deck: 'REMIX' | 'VILLAIN'
  image: string           // 'cards/<id>.webp'
  sourceImage: string     // tên file gốc trong image/
  transform?: CardFace    // mặt sau khi transform
  rule: Rule
}
```

Quy trình: đọc 79 ảnh → ghi `src/data/cards.ts`. Lá không chắc chắn (chữ mờ, icon tag khó
nhận) được liệt kê trong mục **Cần xác nhận** (phụ lục cuối spec, cập nhật khi dựng dữ liệu)
để người dùng kiểm tra trên lá thật. Test dữ liệu: đúng 61 REMIX + 18 VILLAIN, id duy nhất,
tag hợp lệ, không có VILLAIN trong deck REMIX. Nếu 79 ảnh không phủ đủ bộ bài thì báo lại.

**Ảnh:** `scripts/process-images.py` (Pillow + OpenCV): phát hiện viền lá → warp phối cảnh
thẳng đứng → resize ~400px ngang → WebP vào `public/cards/`. Chạy 1 lần, commit kết quả;
lá cắt lỗi thì chỉnh tay (tham số crop thủ công cho file đó).

## 6. Engine tính điểm

TypeScript thuần trong `src/engine/`, không phụ thuộc React.

```ts
interface Rule {
  choices?:   (ctx: Ctx) => Option[]               // Vision chọn tag, Juggernaut chọn lá blank…
  tagMods?:   (ctx: Ctx, choice?: Option) => TagMod[]  // thêm tag / quy đổi (Hack In)
  blank?:     (ctx: Ctx, choice?: Option) => CardId[]  // blank lá khác
  selfBlank?: (ctx: Ctx) => boolean                // "Blanked unless with…"
  transform?: (ctx: Ctx) => boolean                // điều kiện lật mặt
  bonus?:     (ctx: Ctx) => Bonus[]                // { points, reason }, cho phép âm
  input?:     'lokiDraw'
}
```

`Ctx` chỉ thấy các lá **đang hoạt động** (chưa blank) với **mặt và tag hiện tại**, cung cấp:
`countTag(tag)`, `countType(type, {excludeSelf})`, `has(name)`, `cards`, `self`.

**Hàm trợ giúp** (`helpers.ts`): `forEachTag`, `forEachType`, `withCard`, `withType`, `withTag`,
`blankedUnlessWith`, `blankOne`, `unlessPenalty`, … Lá đặc biệt (Avoid Crossfire, Hack In,
Loki, Mystique…) viết hàm riêng.

**Giải một phương án** (`resolve.ts`):
1. Gắn lựa chọn của phương án vào các lá.
2. Lặp tới khi ổn định (tối đa 10 vòng; không ổn định → lấy trạng thái cuối và ghi cảnh báo):
   a. Tính tag hiện tại từ lá đang hoạt động (gồm `tagMods`).
   b. Áp `selfBlank` và `blank` theo thứ tự blank của phương án; lá đã bị blank không blank được lá khác.
   c. Áp `transform`.
3. Kiểm tra điều kiện HERO/ALLY + VILLAIN → nếu thiếu, tổng = 0 (vẫn trả giải thích).
4. Tổng = Σ power + Σ bonus − Loki.

**Tối ưu** (`score.ts`): liệt kê tích Descartes các lựa chọn × hoán vị thứ tự của những lá có
hiệu ứng blank; giải từng phương án; trả về phương án tổng cao nhất (hòa → phương án đầu tiên)
kèm `breakdown` từng lá và danh sách lựa chọn đã dùng.

## 7. Cấu trúc dự án

```
scripts/process-images.py
public/cards/*.webp
src/data/cards.ts
src/engine/{types,helpers,resolve,score}.ts
src/state/game.ts            # người chơi, tay bài, chặn trùng, localStorage
src/ui/{SetupScreen,PickScreen,HandTray,CardLibrary,ResultScreen}.tsx
src/App.tsx
tests/
```

`image/` và `huongdan/` giữ nguyên, không đưa vào bản build.

## 8. Test

- Ví dụ trang 7: Captain America, Colossus, Valkyrie, Vision, Mystique, Vibranium Shield,
  Falling Debris → **77** (14/6/7/3/14/9/24).
- FAQ: Avoid Crossfire + Lockheed + Storm + Cyclops → bonus **+27**; + Hawkeye + Lockheed → **21**;
  Hack In + Build Gadgets → +13 mỗi tag Tech; Shadowcat + Factory + Hidden Lair → +4 một lần;
  Assembled + Hawkeye + She-Hulk + Wolverine → +12.
- Mỗi lá ≥1 test riêng.
- Trường hợp biên: thiếu VILLAIN → 0; HERO duy nhất bị blank → 0; power `*` = 0; power âm;
  Loki bị blank vẫn trừ.
- Test dữ liệu (mục 5).

## 9. Deploy

GitHub Actions: `npm ci && npm test && npm run build` → GitHub Pages (Vite `base` = tên repo).
Cần repo GitHub (người dùng tạo, hoặc tạo bằng `gh` khi được phép).

## 10. Thứ tự làm

1. Khung dự án (Vite/React/TS/Vitest).
2. Engine + helpers, test với các lá trong ví dụ sách.
3. Dựng dữ liệu 79 lá; người dùng xác nhận danh sách "Cần xác nhận".
4. Xử lý ảnh.
5. Giao diện.
6. Deploy.

## Phụ lục: Cần xác nhận

(Sẽ điền khi dựng dữ liệu lá bài ở bước 3.)
