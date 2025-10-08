## Goat Bot – Messenger Automation

This repository contains a Node.js-based Facebook Messenger bot framework with modular commands, event handlers, and pluggable data storage (SQLite and MongoDB). It ships with a large set of commands under `scripts/cmds` and a custom `fb-chat-api` implementation for interacting with Messenger.

### Key Features
- Modular command system in `scripts/cmds`
- Event handling pipeline in `bot/handler`
- Login flow and token management in `bot/login`
- Data layer with SQLite and MongoDB under `database/`
- Internationalization via `languages/`
- Built-in utilities and logging

### Requirements
- Node.js 16+ (LTS recommended)
- npm (or bun) installed
- Optional: MongoDB instance if using MongoDB models

### Quick Start
1) Install dependencies:
```bash
npm install
```

2) Configure the bot:
- Update `config.json` for global settings (prefix, admins, language, etc.)
- Put Facebook credentials/tokens under `bot/data/tokens.json` or use the login flow in `bot/login/`

3) Run the bot:
```bash
npm start
```
If no start script is defined, you can run:
```bash
node index.js
```

### Configuration
- `config.json`: Main bot configuration (command prefix, global toggles, language)
- `configCommands.json`: Per-command enable/disable and overrides
- `languages/`: Language packs (`en.lang`, `vi.lang`) and helpers

### Data Storage
- `database/data/`: JSON and SQLite data files used by the bot
- `database/models/sqlite` and `database/models/mongodb`: ORM/ODM models
- `database/connectDB/`: Connectors for MongoDB and SQLite

By default, many commands use SQLite/JSON storage. If enabling MongoDB features, ensure `database/connectDB/connectMongoDB.js` is properly configured and your MongoDB is reachable.

### Commands and Events
- Commands live in `scripts/cmds/*.js` and expose `config`, `onStart`, optional `onChat`, and optional `onReply` handlers.
- Events live in `scripts/events/*.js` and are wired through `bot/handler/handlerEvents.js`.

Common commands include `help`, `menu`, `prefix`, `bank`, `kick`, `translate`, `weather`, `top`, and more. See the `scripts/cmds` folder for the full list.

Notable change: `scripts/cmds/top.js` now batches message counts in memory and flushes to disk periodically, improving performance and preventing large JSON write errors.

### Project Structure
```
bot/                  # Handlers and login
database/             # Connectors, models, and data files
fb-chat-api/          # Messenger API implementation
languages/            # i18n resources
logger/               # Logging utilities
scripts/              # Commands and events
utils/                # Shared utilities
Goat.js, index.js     # Entrypoints/initializers
config.json           # Main config
configCommands.json   # Per-command config
```

### Running, Debugging, and Logs
- Default entry is `index.js` which initializes the bot (see `Goat.js` for internals).
- Logs are emitted via `logger/` modules.
- If using Windows PowerShell, run from the project root: `node index.js`.

### Troubleshooting
- Login issues: Check `bot/login/*` and ensure tokens/cookies are valid in `bot/data/tokens.json`.
- Database errors: Confirm file paths in `database/data/` exist and are writable; for MongoDB, verify connection string and network access.
- Command not responding: Ensure it’s enabled in `configCommands.json` and not role-restricted in `config.json`.
- Large JSON errors: The `top` command already mitigates this by batching writes; ensure you’re on the latest version.

### Security Notes
- Keep `account.txt` and `bot/data/tokens.json` private.
- Do not commit secrets; use `.gitignore` appropriately.
- Consider environment variables for credentials if deploying.

### Contributing
- Open issues or PRs with a clear description.
- Follow the existing code style and structure; prefer clarity and maintainability.

---

## Goat Bot – Tự động hóa Messenger (Tiếng Việt)

Dự án này là một framework bot Facebook Messenger viết bằng Node.js, có hệ thống lệnh mô-đun, pipeline xử lý sự kiện, và lớp lưu trữ dữ liệu linh hoạt (SQLite và MongoDB). Kho lệnh phong phú nằm trong `scripts/cmds`, cùng một triển khai `fb-chat-api` để tương tác với Messenger.

### Tính năng nổi bật
- Hệ thống lệnh mô-đun trong `scripts/cmds`
- Xử lý sự kiện tập trung ở `bot/handler`
- Luồng đăng nhập và quản lý token tại `bot/login`
- Lớp dữ liệu với SQLite và MongoDB trong `database/`
- Đa ngôn ngữ qua thư mục `languages/`
- Tiện ích và hệ thống log sẵn có

### Yêu cầu môi trường
- Node.js 16+ (khuyến nghị dùng LTS)
- npm (hoặc bun)
- Tùy chọn: MongoDB nếu bạn bật các tính năng dùng MongoDB

### Bắt đầu nhanh
1) Cài đặt thư viện:
```bash
npm install
```

2) Cấu hình bot:
- Chỉnh `config.json` (prefix, admin, ngôn ngữ, v.v.)
- Đặt thông tin đăng nhập/token Facebook trong `bot/data/tokens.json` hoặc dùng luồng đăng nhập ở `bot/login/`

3) Chạy bot:
```bash
npm start
```
Nếu chưa cấu hình script start, có thể chạy:
```bash
node index.js
```

### Cấu hình
- `config.json`: Cấu hình chính của bot (prefix, cờ tính năng, ngôn ngữ)
- `configCommands.json`: Bật/tắt và tùy chỉnh theo từng lệnh
- `languages/`: Gói ngôn ngữ (`en.lang`, `vi.lang`) và tiện ích liên quan

### Lưu trữ dữ liệu
- `database/data/`: File JSON và SQLite
- `database/models/sqlite`, `database/models/mongodb`: Định nghĩa models
- `database/connectDB/`: Kết nối MongoDB và SQLite

Mặc định nhiều lệnh dùng SQLite/JSON. Nếu bật MongoDB, hãy cấu hình `database/connectDB/connectMongoDB.js` và đảm bảo kết nối được tới MongoDB.

### Lệnh và sự kiện
- Lệnh nằm trong `scripts/cmds/*.js` với `config`, `onStart`, và tuỳ chọn `onChat`, `onReply`.
- Sự kiện nằm trong `scripts/events/*.js` và được điều phối bởi `bot/handler/handlerEvents.js`.

Ví dụ lệnh phổ biến: `help`, `menu`, `prefix`, `bank`, `kick`, `translate`, `weather`, `top`, v.v. Xem thư mục `scripts/cmds` để biết đầy đủ.

Điểm đáng chú ý: `scripts/cmds/top.js` đã chuyển sang gom số liệu trong bộ nhớ và ghi ra đĩa theo đợt, giúp tăng hiệu năng và tránh lỗi ghi JSON quá lớn.

### Cấu trúc dự án
```
bot/                  # Xử lý sự kiện và đăng nhập
database/             # Kết nối, models, và dữ liệu
fb-chat-api/          # Tương tác với Messenger
languages/            # Đa ngôn ngữ
logger/               # Ghi log
scripts/              # Lệnh và sự kiện
utils/                # Tiện ích dùng chung
Goat.js, index.js     # Điểm khởi chạy
config.json           # Cấu hình chính
configCommands.json   # Cấu hình theo lệnh
```

### Chạy, gỡ lỗi và log
- Mặc định chạy từ `index.js` (tham khảo `Goat.js` để hiểu khởi tạo nội bộ).
- Log được ghi thông qua các module trong `logger/`.
- Với Windows PowerShell, chạy tại thư mục gốc dự án: `node index.js`.

### Xử lý sự cố
- Đăng nhập thất bại: Kiểm tra `bot/login/*` và token/cookie trong `bot/data/tokens.json`.
- Lỗi cơ sở dữ liệu: Kiểm tra quyền ghi thư mục `database/data/`; với MongoDB, kiểm tra chuỗi kết nối và mạng.
- Lệnh không phản hồi: Đảm bảo lệnh đã bật trong `configCommands.json` và không bị giới hạn quyền trong `config.json`.
- Lỗi JSON lớn: Lệnh `top` đã được tối ưu hóa; hãy dùng phiên bản mới nhất.

### Bảo mật
- Giữ kín `account.txt` và `bot/data/tokens.json`.
- Không commit thông tin nhạy cảm; dùng `.gitignore` hợp lý.
- Cân nhắc dùng biến môi trường khi triển khai.

### Đóng góp
- Tạo issue hoặc PR với mô tả rõ ràng.
- Tuân thủ phong cách code hiện có; ưu tiên rõ ràng và dễ bảo trì.


