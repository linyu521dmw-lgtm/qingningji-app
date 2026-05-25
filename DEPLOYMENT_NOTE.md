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

## 前端如何配置线上 API 地址

前端已经预留 `config.js` 加载位置。部署时可以在 `frontend` 目录下新建：

```text
frontend/config.js
```

内容示例：

```js
window.QINGNINGJI_API_BASE = "https://your-backend-url.onrender.com";
```

仓库中提供了示例文件：

```text
frontend/config.example.js
```

本地开发时可以不创建 `config.js`。如果 `config.js` 不存在，页面会继续使用默认本地后端地址。

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

## 为什么不能长期把 JSON 当真实线上数据库

当前项目已经开始迁移到本地 SQLite，但仓库里仍保留 `products.json`、`transactions.json` 和 `demoProducts.json` 作为初始化来源和演示数据。

JSON 文件不适合作为长期线上数据库，原因包括：

- 多人同时写入时容易产生冲突。
- 缺少查询、索引、事务和权限控制。
- 不适合保存大量商品、交易和消息数据。
- 图片如果以 Base64 保存在 JSON 中，文件会快速变大。
- 云端平台可能重启或重建容器，本地文件不一定稳定持久。

真实线上版本应该使用云数据库保存结构化数据，用对象存储保存图片文件。

## 下一步要接 Supabase

下一阶段建议接入 Supabase：

- Supabase Postgres：保存商品、交易记录、收藏、会话、消息等结构化数据。
- Supabase Auth：处理真实用户登录和校园身份。
- Supabase Storage：保存商品图片，前端和数据库只保存图片 URL。

迁移顺序建议：

1. 先把 `products` 和 `transactions` 从 SQLite 迁移到 Supabase Postgres。
2. 再加入 `users`、`favorites`、`conversations`、`messages` 表。
3. 最后把图片从 `imageData` 改成 `imageUrl`，接入 Supabase Storage。
