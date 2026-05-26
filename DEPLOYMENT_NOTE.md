# 青柠集部署准备说明

## 本地如何运行

初始化本地 SQLite 数据库：

```bash
cd /mnt/d/桌面/DProjectsqingningji-app/backend
npm run init-db
```

启动后端：

```bash
npm run dev
```

后端默认地址：

```text
http://localhost:3001
```

启动前端静态服务：

```bash
cd /mnt/d/桌面/DProjectsqingningji-app/frontend
python3 -m http.server 5173
```

访问页面：

```text
http://localhost:5173/index.html
http://localhost:5173/mobile.html
```

本地不配置 `config.js` 也可以运行，前端会默认请求：

```text
http://当前主机名:3001
```

## 后端部署需要的环境变量

### PORT

云平台通常会自动注入 `PORT`，后端会读取：

```bash
PORT=3001
```

本地默认值是 `3001`。

### ALLOWED_ORIGINS

用于配置允许访问后端 API 的前端域名，多个域名用英文逗号分隔：

```bash
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://your-preview-domain.com
```

如果不配置，开发阶段默认允许常见本地地址，例如：

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:8000`
- `http://127.0.0.1:8000`

### Supabase

Render 部署后端时需要在 Environment 中配置：

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

后端只有在 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 同时存在时才会连接 Supabase。未配置时会继续使用本地 SQLite/JSON 初始化数据，方便本地开发。

不要把 `SUPABASE_SERVICE_ROLE_KEY` 写进前端或提交到代码仓库。

后端会使用 `SUPABASE_SERVICE_ROLE_KEY` 验证 Supabase Auth 的 access token，并在写接口中根据 `products.owner_id` 判断权限。登录后调用发布、编辑、删除和修改状态接口时，请求头需要带上：

```http
Authorization: Bearer <access_token>
```

商品发布时后端会写入：

- `owner_id = user.id`
- `owner_email = user.email`

真实产品阶段商品必须有 `owner_id`。只有 `owner_id` 与当前登录用户 id 一致时，才允许编辑、删除和修改状态；如果商品 `owner_id` 为空，后端会直接返回 403，不再允许编辑、删除、修改状态，也不会自动绑定给当前用户。历史无主商品需要先通过 SQL 修复 `owner_id` / `owner_email`，或直接删除。

### 演示数据重置

线上默认不允许调用：

```text
POST /api/reset-demo-products
```

未开启时会返回：

```json
{ "error": "Demo reset is disabled in production" }
```

本地开发如需恢复演示数据，可以在后端环境变量中显式开启：

```bash
ALLOW_DEMO_RESET=true
```

线上如确实需要管理员重置，不要公开开启 `ALLOW_DEMO_RESET`，而是配置：

```bash
ADMIN_RESET_TOKEN=your-private-admin-token
```

管理员请求时带上：

```http
x-admin-token: your-private-admin-token
```

不要把 `ADMIN_RESET_TOKEN` 写入前端代码或 `frontend/config.js`。

## 前端如何配置线上 API 地址

前端已经预留 `config.js` 加载位置。部署时可以在 `frontend` 目录下新建：

```text
frontend/config.js
```

内容示例：

```js
window.QINGNINGJI_API_BASE = "https://your-backend-url.onrender.com";
window.QINGNINGJI_SUPABASE_URL = "https://your-project.supabase.co";
window.QINGNINGJI_SUPABASE_ANON_KEY = "your-supabase-anon-key";
```

仓库中提供了示例文件：

```text
frontend/config.example.js
```

本地开发时可以不创建 `config.js`。如果 `config.js` 不存在，页面会继续使用默认本地后端地址。

前端只能配置 Supabase anon key，用于邮箱密码注册和登录。不要把 `SUPABASE_SERVICE_ROLE_KEY` 写入 `frontend/config.js`。

## 健康检查

后端健康检查地址：

```text
GET /health
```

返回示例：

```json
{
  "ok": true,
  "service": "qingningji-backend"
}
```

部署到 Render、Railway 等平台时，可以把 `/health` 作为服务健康检查路径。

## Supabase 数据源说明

当前后端已经支持 Supabase Postgres。线上 Render 推荐使用 Supabase 保存 `products` 和 `transactions`，本地未配置 Supabase 环境变量时仍会使用 SQLite，并从仓库里的 JSON 文件初始化演示数据。

Supabase 表字段使用 snake_case，例如：

- `image_data`
- `created_at`
- `updated_at`
- `product_id`
- `from_status`
- `to_status`

后端会转换为前端需要的 camelCase 字段，例如 `imageData`、`createdAt`、`productId`、`fromStatus`。

## 为什么不能长期把 JSON 当真实线上数据库

仓库里仍保留 `products.json`、`transactions.json` 和 `demoProducts.json` 作为本地初始化来源和演示数据。

JSON 文件不适合作为长期线上数据库，原因包括：

- 多人同时写入时容易产生冲突。
- 缺少查询、索引、事务和权限控制。
- 不适合保存大量商品、交易和消息数据。
- 图片如果以 Base64 保存在 JSON 中，文件会快速变大。
- 云端平台可能重启或重建容器，本地文件不一定稳定持久。

真实线上版本应该使用云数据库保存结构化数据，用对象存储保存图片文件。
