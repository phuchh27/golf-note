# Golf-Note - Đặc tả chức năng và lộ trình triển khai

## 1. Mục tiêu ứng dụng

Golf-Note là ứng dụng quản lý vận hành cho sân golf, tập trung vào:

- Quản lý người dùng, đăng nhập và phân quyền.
- Quản lý vật phẩm trong kho.
- Ghi nhận bán hàng và khách mua.
- Theo dõi bàn giao giữa các ca.
- Quản lý các công việc cần xử lý.
- Tạo báo cáo cuối ca về bán hàng, tồn kho và nội dung bàn giao.

Thứ tự ưu tiên triển khai:

1. Hoàn thiện Inventory.
2. Xây dựng Sale dựa trên dữ liệu Inventory.
3. Xây dựng Report cuối ca.
4. Hoàn thiện Handover và hệ thống task vận hành.

---

## 2. Trạng thái hiện tại

### 2.1. Authentication và người dùng - đã hoàn thành nền tảng

- Đăng nhập bằng username và password.
- Mật khẩu được hash và kiểm tra an toàn.
- Tạo session phía server và lưu token trong HttpOnly cookie.
- Kiểm tra session hiện tại qua endpoint xác thực.
- Đăng xuất và thu hồi session.
- Bảo vệ route bằng authentication guard.
- Phân quyền theo role và permission.
- Có các role nền tảng như `USER`, `ADMIN`, `SUPER_ADMIN`, `MANAGER`.
- Admin/Super Admin có thể tạo người dùng mới và gán role.

### 2.2. Giao diện nền - đã hoàn thành một phần

- Trang đăng nhập.
- Dashboard shell sau khi đăng nhập.
- Navigation cho các khu vực Home, Handover, Inventory, Sales, Reports, Manager và Admin.
- Navigation mobile dạng bottom navigation.
- Toast notification và loading state.
- Trang Admin có form tạo người dùng.

Các mục navigation như Handover, Inventory, Sales và Reports hiện mới là khung định tuyến/giao diện, chưa có đầy đủ chức năng nghiệp vụ.

### 2.3. Database và Inventory foundation - đã hoàn thành nền tảng

Đã có Prisma schema và migration cho:

- `Category`: loại vật phẩm.
- `Item`: vật phẩm, SKU, đơn vị, giá vốn, giá bán và trạng thái.
- `StockBalance`: số lượng tồn hiện tại của từng vật phẩm.
- `StockMovement`: lịch sử nhập, xuất, điều chỉnh và các thay đổi tồn kho.

Các loại vật phẩm dự kiến gồm:

- Vật phẩm golf và thiết bị.
- Nước uống.
- Bia/rượu/nước giải khát.
- Các vật phẩm vận hành khác.

Đã có seed dữ liệu mẫu cho category, item và số lượng tồn ban đầu.

### 2.4. Category API - đã hoàn thành

Đã có các thao tác:

- Liệt kê category.
- Tìm kiếm theo mã hoặc tên.
- Lọc category đang active/inactive.
- Phân trang.
- Xem category theo ID.
- Tạo category.
- Cập nhật category.
- Deactivate category thay vì xóa cứng.
- Kiểm tra trùng mã category.

Endpoint hiện có:

- `GET /api/v1/inventory/categories`
- `GET /api/v1/inventory/categories/:id`
- `POST /api/v1/inventory/categories`
- `PATCH /api/v1/inventory/categories/:id`
- `PATCH /api/v1/inventory/categories/:id/deactivate`

---

## 3. Inventory - ưu tiên triển khai đầu tiên

### 3.1. Mục tiêu

Inventory phải cho phép nhân viên quản lý toàn bộ vật phẩm, xem số lượng tồn hiện tại, tra cứu lịch sử nhập/xuất/điều chỉnh và theo dõi hạn sử dụng đối với nhóm vật phẩm có hạn, đặc biệt là nước uống.

### 3.2. Phân loại vật phẩm

Mỗi vật phẩm thuộc một category. Category có thể bao gồm:

- `GOLF_EQUIPMENT`: gậy, bóng, dụng cụ golf.
- `BEVERAGE`: nước uống, bia, nước ngọt.
- `FOOD`: đồ ăn nếu phát sinh.
- `OPERATIONAL`: vật phẩm phục vụ vận hành.
- Các category khác do quản trị viên tạo thêm.

Category không được xóa cứng nếu đã có item tham chiếu. Khi không còn sử dụng, category phải được deactivate.

### 3.3. Thông tin vật phẩm

Thông tin tối thiểu của một item:

- Mã vật phẩm/SKU duy nhất.
- Tên vật phẩm.
- Mô tả.
- Category.
- Đơn vị tính: chai, lon, hộp, cái, bộ...
- Giá nhập hoặc giá vốn tham khảo.
- Giá bán hiện tại.
- Trạng thái: active, inactive hoặc discontinued.
- Có theo dõi hạn sử dụng hay không.
- Ngày tạo và ngày cập nhật.

Đối với vật phẩm có hạn sử dụng, đặc biệt là nước uống, cần lưu thêm:

- Ngày nhập hàng.
- Ngày sản xuất nếu nhà cung cấp cung cấp.
- Ngày hết hạn.
- Số lô/batch nếu có.
- Số lượng của lô.
- Ghi chú nhập hàng.

### 3.4. Quy tắc tồn kho

- Mỗi item có số lượng tồn hiện tại.
- Mọi thay đổi tồn kho phải tạo một stock movement.
- Không được cập nhật số lượng tồn mà không lưu lịch sử thay đổi.
- Mỗi movement phải lưu tối thiểu:
  - Item.
  - Loại thay đổi.
  - Số lượng thay đổi.
  - Tồn trước thay đổi.
  - Tồn sau thay đổi.
  - Thời gian thực hiện.
  - Người thực hiện.
  - Ghi chú.
- Không cho phép tồn kho âm, trừ khi có quyết định nghiệp vụ rõ ràng sau này.
- Khi nhập hàng, số lượng tồn tăng.
- Khi bán hàng, số lượng tồn giảm.
- Khi điều chỉnh tăng/giảm, số lượng tồn thay đổi theo lý do được ghi nhận.
- Khi xuất hiện sai lệch thực tế, người dùng phải nhập lý do điều chỉnh.

### 3.5. Lô hàng và hạn sử dụng

Để tra cứu chính xác ngày nhập và ngày hết hạn của từng vật phẩm, inventory cần quản lý theo lô đối với những item có hạn sử dụng.

Quy tắc mặc định:

- Một lần nhập hàng tạo một lô hàng riêng.
- Một item có thể có nhiều lô đang còn tồn.
- Khi bán vật phẩm có hạn, ưu tiên xuất lô hết hạn trước theo nguyên tắc FEFO.
- Hệ thống cảnh báo vật phẩm sắp hết hạn.
- Hệ thống cảnh báo vật phẩm đã hết hạn nhưng vẫn còn tồn.
- Có thể tra cứu lịch sử theo item, mã lô, ngày nhập hoặc ngày hết hạn.

> Ghi chú thiết kế: schema hiện tại mới có `Item`, `StockBalance` và `StockMovement`. Để lưu ngày nhập/ngày hết hạn theo từng lô, cần bổ sung entity `StockLot` hoặc `InventoryBatch` và liên kết movement/sale với lô.

### 3.6. Các màn hình Inventory cần có

1. **Inventory overview**
   - Tổng số item.
   - Tổng số lượng tồn.
   - Item sắp hết hàng.
   - Item sắp hết hạn.
   - Item đã hết hạn.

2. **Item list**
   - Tìm kiếm theo SKU/tên.
   - Lọc theo category, trạng thái và loại có hạn.
   - Hiển thị số lượng tồn, đơn vị, giá bán và hạn gần nhất.

3. **Create item**
   - Tạo item mới.
   - Chọn category.
   - Nhập thông tin giá và đơn vị.
   - Chọn item có quản lý hạn sử dụng hay không.

4. **Item detail**
   - Thông tin item.
   - Tồn hiện tại.
   - Danh sách lô hàng.
   - Lịch sử stock movement.
   - Tổng nhập, tổng xuất và tổng điều chỉnh.

5. **Stock receiving**
   - Chọn item/lô.
   - Nhập ngày nhập hàng.
   - Nhập ngày hết hạn.
   - Nhập số lượng và giá nhập.
   - Ghi chú và người thực hiện.

6. **Stock adjustment**
   - Điều chỉnh tăng hoặc giảm.
   - Bắt buộc nhập lý do.
   - Hiển thị tồn trước và tồn sau trước khi xác nhận.

### 3.7. API Inventory cần triển khai tiếp

#### Item API

- `GET /api/v1/inventory/items`
- `GET /api/v1/inventory/items/:id`
- `POST /api/v1/inventory/items`
- `PATCH /api/v1/inventory/items/:id`
- `PATCH /api/v1/inventory/items/:id/deactivate`

Hỗ trợ tìm kiếm, phân trang, lọc category, trạng thái và tồn kho.

#### Stock API

- `GET /api/v1/inventory/stock`
- `GET /api/v1/inventory/stock/:itemId`
- `GET /api/v1/inventory/stock/:itemId/movements`
- `POST /api/v1/inventory/stock/receive`
- `POST /api/v1/inventory/stock/adjust`

Các thao tác thay đổi tồn phải chạy theo transaction để `StockBalance` và `StockMovement` luôn đồng bộ.

#### Lot API

- `GET /api/v1/inventory/lots`
- `GET /api/v1/inventory/lots/:id`
- `GET /api/v1/inventory/lots/expiring`
- `POST /api/v1/inventory/lots`

Có thể gộp thao tác tạo lot vào API receiving nếu không cần mở endpoint riêng.

### 3.8. Acceptance criteria cho Inventory

- Nhân viên tạo được item mới và item luôn thuộc một category hợp lệ.
- SKU không được trùng.
- Người dùng xem được số lượng tồn hiện tại của từng item.
- Mọi lần nhập, bán hoặc điều chỉnh đều có lịch sử movement.
- Hệ thống hiển thị đúng tồn trước và tồn sau thay đổi.
- Không thể xác nhận điều chỉnh giảm làm tồn âm.
- Item có hạn sử dụng hiển thị được ngày nhập và ngày hết hạn theo từng lô.
- Có thể tìm kiếm các item sắp hết hạn và đã hết hạn.
- Người không có quyền phù hợp không được tạo hoặc điều chỉnh tồn.
- Category đã có item không bị xóa cứng.

---

## 4. Sale - triển khai sau Inventory

### 4.1. Mục tiêu

Ghi nhận việc bán vật phẩm, tự động trừ tồn kho và lưu thông tin người mua để có thể tra cứu lại.

### 4.2. Thông tin một giao dịch bán

- Mã giao dịch.
- Người thực hiện.
- Ngày giờ bán.
- Nơi mua:
  - Phòng số bao nhiêu.
  - Khách bên ngoài.
  - Hình thức khác nếu cần mở rộng.
- Tên hoặc ghi chú khách hàng nếu có.
- Danh sách item bán.
- Số lượng từng item.
- Đơn giá tại thời điểm bán.
- Thành tiền.
- Ghi chú.
- Lô xuất kho nếu item có hạn sử dụng.

### 4.3. Quy tắc Sale

- Một sale có thể chứa nhiều item.
- Khi xác nhận sale, hệ thống tự động tạo stock movement loại `SALE`.
- Không cho bán vượt quá tồn khả dụng.
- Với item theo lô, xuất theo FEFO mặc định.
- Sale đã xác nhận không được sửa trực tiếp; nếu cần sửa phải tạo thao tác hoàn/điều chỉnh có lịch sử.
- Có thể tra cứu theo ngày, phòng, khách bên ngoài, item và người bán.

### 4.4. Entity dự kiến

- `Sale`.
- `SaleItem`.
- `SaleItemLot` hoặc liên kết tới `StockLot` nếu cần theo dõi lô.

---

## 5. Report cuối ca - ưu tiên sau Inventory và Sale

### 5.1. Ca làm việc

Hệ thống mặc định có hai ca:

- Ca 1 kết thúc lúc `15:15`.
- Ca 2 kết thúc lúc `22:00`.

Thời gian ca cần được cấu hình để có thể thay đổi khi vận hành thực tế.

### 5.2. Nội dung report cuối ca

Report phải trả lời được:

- Hôm nay đã bán những gì?
- Bán cho ai hoặc phòng nào?
- Bán vào thời gian nào?
- Số lượng và doanh thu của từng item là bao nhiêu?
- Tồn đầu ca là bao nhiêu?
- Trong ca đã nhập thêm bao nhiêu?
- Đã điều chỉnh tăng/giảm bao nhiêu?
- Tồn cuối ca là bao nhiêu?
- Có sai lệch nào giữa số liệu hệ thống và kiểm kê thực tế không?
- Những gì được bàn giao cho ca sau?

### 5.3. So sánh thay đổi tồn

Report phải hiển thị biến động theo dạng dễ kiểm tra, ví dụ:

- `Nước Lavie: 25 -> 24`
- `Bia Saigon: 10 -> 15` do nhập thêm 5.
- `Golf Ball: 20 -> 18` do bán 2.

Mỗi dòng biến động cần có:

- Item.
- Tồn trước.
- Số lượng thay đổi.
- Tồn sau.
- Loại thay đổi.
- Thời gian.
- Người thực hiện.
- Ghi chú.

### 5.4. Quy trình tạo report

1. Nhân viên chọn ngày và ca.
2. Hệ thống tổng hợp các sale, receiving và adjustment trong khoảng thời gian của ca.
3. Hệ thống tính tồn đầu ca và tồn cuối ca.
4. Nhân viên nhập số lượng kiểm kê thực tế nếu cần.
5. Hệ thống hiển thị sai lệch.
6. Nhân viên nhập ghi chú bàn giao.
7. Nhân viên xác nhận report.
8. Report đã xác nhận được khóa nội dung chính; mọi sửa đổi sau đó phải có audit trail.

### 5.5. Entity dự kiến

- `WorkShift` hoặc cấu hình ca.
- `ShiftReport`.
- `ShiftReportItem`.
- `ShiftHandoverNote` nếu cần tách phần bàn giao.

### 5.6. Acceptance criteria cho Report

- Tạo được report cho ca 1 và ca 2 theo ngày.
- Chỉ các sale/movement trong khoảng thời gian của ca được tổng hợp.
- Report hiển thị đúng item, người mua, phòng/khách ngoài và thời gian bán.
- Report hiển thị được tồn đầu, nhập, bán, điều chỉnh và tồn cuối.
- Hiển thị được thay đổi dạng `tồn trước -> tồn sau`.
- Người dùng nhập được số lượng thực tế và xem chênh lệch.
- Report đã xác nhận không bị thay đổi âm thầm.
- Có thể tra cứu lại report theo ngày, ca và người lập.

---

## 6. Handover và task vận hành

### 6.1. Mục tiêu

Handover dùng để ghi nhận các công việc cần sửa lý, việc chưa hoàn thành và các lưu ý bàn giao giữa các ca.

### 6.2. Thông tin task

- Tiêu đề.
- Mô tả chi tiết.
- Người tạo.
- Người phụ trách.
- Khu vực hoặc module liên quan.
- Trạng thái.
- Mức độ ưu tiên.
- Thời gian tạo.
- Hạn xử lý.
- Thời gian hoàn thành.
- Ghi chú cập nhật.
- Hình ảnh hoặc file đính kèm nếu cần sau này.

### 6.3. Trạng thái đề xuất

- `OPEN`: mới tạo.
- `IN_PROGRESS`: đang xử lý.
- `BLOCKED`: bị chặn.
- `DONE`: đã hoàn thành.
- `CANCELLED`: đã hủy.

Mọi thay đổi trạng thái cần lưu thời gian và người thực hiện.

### 6.4. Quy trình bàn giao

- Ca trước tạo task hoặc ghi chú chưa hoàn thành.
- Ca sau xem danh sách task cần tiếp nhận.
- Người phụ trách cập nhật trạng thái và tiến độ.
- Task quá hạn được đánh dấu rõ ràng.
- Khi kết thúc ca, các task chưa hoàn thành được đưa vào report bàn giao.

---

## 7. Quyền truy cập dự kiến

- `USER`: xem dữ liệu cần thiết, tạo sale hoặc task theo quyền được cấp.
- `MANAGER`: quản lý inventory, xác nhận điều chỉnh, xem report và quản lý task.
- `ADMIN`: quản lý người dùng, category, item và quyền vận hành.
- `SUPER_ADMIN`: toàn quyền cấu hình và xử lý các trường hợp đặc biệt.

Quyền thực tế nên được kiểm tra ở backend, không chỉ ẩn nút trên giao diện.

---

## 8. Lộ trình triển khai đề xuất

### Giai đoạn 1 - Hoàn thiện Inventory

- [ ] Rà soát và format Prisma schema hiện tại.
- [ ] Bổ sung model lô hàng có ngày nhập/ngày hết hạn.
- [ ] Viết Item repository/service/controller/API.
- [ ] Viết Stock service có transaction.
- [ ] Viết receiving và adjustment API.
- [ ] Thêm kiểm tra quyền cho inventory.
- [ ] Thêm test API cho category, item và stock.
- [ ] Xây dựng Inventory overview, item list và item detail.
- [ ] Xây dựng form nhập hàng và điều chỉnh tồn.
- [ ] Thêm cảnh báo sắp hết hàng/sắp hết hạn.

### Giai đoạn 2 - Sale

- [ ] Tạo model Sale và SaleItem.
- [ ] Tạo sale API.
- [ ] Tự động trừ tồn khi xác nhận bán.
- [ ] Lưu phòng hoặc khách bên ngoài, ngày giờ và người mua.
- [ ] Xây dựng màn hình tạo sale và tra cứu sale.

### Giai đoạn 3 - Report

- [ ] Tạo cấu hình ca 1 và ca 2.
- [ ] Tạo service tổng hợp sale và stock movement theo ca.
- [ ] Tạo report cuối ca.
- [ ] Hiển thị tồn đầu, nhập, bán, điều chỉnh và tồn cuối.
- [ ] Hiển thị chênh lệch kiểm kê.
- [ ] Ghi nhận nội dung bàn giao.
- [ ] Khóa report sau khi xác nhận và lưu lịch sử thay đổi.

### Giai đoạn 4 - Handover

- [ ] Tạo model task và lịch sử trạng thái.
- [ ] Tạo API task.
- [ ] Xây dựng màn hình task theo trạng thái.
- [ ] Liên kết task chưa hoàn thành vào report cuối ca.

---

## 9. Giả định và điểm cần chốt sau

Các quyết định dưới đây đang dùng mặc định để có thể bắt đầu triển khai:

- Có hai ca mặc định: ca 1 kết thúc `15:15`, ca 2 kết thúc `22:00`.
- Khách ngoài phòng được lưu với loại khách `EXTERNAL`; có thể nhập tên hoặc ghi chú tùy chọn.
- Không cho tồn kho âm.
- Vật phẩm có hạn sử dụng được quản lý theo lô.
- Xuất kho theo FEFO đối với vật phẩm có hạn.
- Report cuối ca do nhân viên ca hiện tại tạo và người quản lý có thể xem/xác nhận.
- Mọi thao tác ảnh hưởng tồn kho phải lưu người thực hiện và thời gian.

Các điểm cần xác nhận trước khi khóa thiết kế:

1. Có cần quản lý giá nhập theo từng lô và giá vốn bình quân không?
2. Sale có cần lưu tiền khách trả, phương thức thanh toán và trạng thái thanh toán không?
3. Report có cần in hoặc xuất Excel/PDF không?

---

## 10. Định nghĩa hoàn thành cho Inventory

Inventory được xem là hoàn thành phiên bản đầu khi:

- Quản lý được category và item.
- Tạo/sửa/deactivate item được.
- Nhập kho và điều chỉnh tồn được.
- Số lượng tồn luôn khớp với lịch sử movement.
- Theo dõi được lô, ngày nhập và ngày hết hạn đối với item có hạn.
- Tra cứu được lịch sử tồn kho.
- Có phân quyền backend.
- Có test cho các luồng thành công, dữ liệu sai, không đủ quyền và tồn âm.
- Có giao diện cơ bản để nhân viên dùng được mà không cần thao tác trực tiếp qua API.
