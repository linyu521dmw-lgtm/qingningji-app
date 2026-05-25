# 青柠集数据库规划

## 1. 当前数据问题

青柠集当前是本地可运行原型，数据主要由 `products.json`、`transactions.json` 和浏览器 `localStorage` 保存，商品图片以 Base64 的 `imageData` 形式存入商品数据中。这种方式适合课程展示和快速验证功能，但不适合多人真实使用。

### `products.json` 的局限

- 只能作为本地文件保存商品数据，不适合多人同时发布、编辑和删除商品。
- 缺少用户身份关联，无法判断某个商品到底属于哪个真实用户。
- 权限控制困难，例如谁可以编辑、删除商品，当前无法严谨判断。
- 文件读写容易受并发影响，不适合云端部署后的多人访问。

### `transactions.json` 的局限

- 只能记录本地状态变化，不适合长期保存真实交易历史。
- 缺少完整的用户、商品和操作人关系。
- 后期如果需要筛选、统计、分页或导出，JSON 文件会比较吃力。

### `localStorage` 的局限

- 收藏和消息会话保存在浏览器本地，换设备或清理浏览器后就会丢失。
- 不能在不同用户之间同步数据。
- 不适合真实消息、未读状态和跨设备会话同步。

### Base64 `imageData` 的局限

- Base64 会让图片数据体积变大，直接放进 JSON 文件会让商品数据越来越重。
- 不适合真实图片存储、图片压缩策略和 CDN 加速。
- 后期迁移到云端时，应该改成图片文件或对象存储地址，例如 `imageUrl`。

## 2. 真实 MVP 需要的数据表

如果青柠集要从本地原型升级为真实可用的校园闲置交换软件，建议至少设计以下数据表：

- `users` 用户表
- `products` 商品表
- `favorites` 收藏表
- `conversations` 会话表
- `messages` 消息表
- `transactions` 交易记录表

这些表能覆盖用户身份、商品发布、收藏关系、聊天沟通和商品状态变化记录。

## 3. 每张表的字段

### users 用户表

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer / uuid | 用户唯一 ID |
| `name` | text | 用户昵称或显示名称 |
| `email` | text | 邮箱，用于登录或校园认证 |
| `avatarUrl` | text | 用户头像地址 |
| `campus` | text | 校区或学校信息 |
| `major` | text | 专业或院系 |
| `createdAt` | datetime | 注册时间 |
| `updatedAt` | datetime | 用户资料更新时间 |

### products 商品表

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer / uuid | 商品唯一 ID |
| `title` | text | 商品名称 |
| `price` | decimal / integer | 商品价格 |
| `category` | text | 商品分类 |
| `location` | text | 校内交易地点 |
| `sellerId` | integer / uuid | 卖家用户 ID，关联 `users.id` |
| `status` | text | 商品状态：在售 / 已预定 / 已出 |
| `imageUrl` | text | 商品图片地址 |
| `description` | text | 商品补充描述，后续可选 |
| `createdAt` | datetime | 发布时间 |
| `updatedAt` | datetime | 商品更新时间 |

### favorites 收藏表

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer / uuid | 收藏记录唯一 ID |
| `userId` | integer / uuid | 收藏用户 ID，关联 `users.id` |
| `productId` | integer / uuid | 被收藏商品 ID，关联 `products.id` |
| `createdAt` | datetime | 收藏时间 |

建议对 `userId + productId` 做唯一约束，避免同一用户重复收藏同一商品。

### conversations 会话表

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer / uuid | 会话唯一 ID |
| `productId` | integer / uuid | 对应商品 ID，关联 `products.id` |
| `buyerId` | integer / uuid | 买家用户 ID，关联 `users.id` |
| `sellerId` | integer / uuid | 卖家用户 ID，关联 `users.id` |
| `lastMessageText` | text | 最后一条消息内容，用于会话列表展示 |
| `lastMessageAt` | datetime | 最后一条消息时间 |
| `createdAt` | datetime | 会话创建时间 |
| `updatedAt` | datetime | 会话更新时间 |

建议对 `productId + buyerId + sellerId` 做唯一约束，避免同一个买家对同一个商品重复创建会话。

### messages 消息表

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer / uuid | 消息唯一 ID |
| `conversationId` | integer / uuid | 所属会话 ID，关联 `conversations.id` |
| `senderId` | integer / uuid | 发送者用户 ID，系统消息可为空 |
| `senderRole` | text | buyer / seller / system |
| `content` | text | 消息内容 |
| `isRead` | boolean | 是否已读 |
| `createdAt` | datetime | 发送时间 |

### transactions 交易记录表

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer / uuid | 交易记录唯一 ID |
| `productId` | integer / uuid | 商品 ID，关联 `products.id` |
| `fromStatus` | text | 变化前状态 |
| `toStatus` | text | 变化后状态 |
| `operatorId` | integer / uuid | 操作人用户 ID |
| `buyerId` | integer / uuid | 买家 ID，发起预定或成交时可记录 |
| `sellerId` | integer / uuid | 卖家 ID |
| `createdAt` | datetime | 状态变化时间 |

## 4. 表之间的关系

- 一个用户可以发布多个商品：`users.id -> products.sellerId`。
- 一个用户可以收藏多个商品：`users.id -> favorites.userId`。
- 一个商品可以被多个用户收藏：`products.id -> favorites.productId`。
- 一个商品可以对应一个或多个会话：`products.id -> conversations.productId`。
- 一个会话可以包含多条消息：`conversations.id -> messages.conversationId`。
- 商品状态变化会生成交易记录：`products.id -> transactions.productId`。
- 交易记录可以关联操作人、卖家和买家，方便后续做权限判断和历史追踪。

## 5. 从当前 JSON 到数据库的迁移路线

### 第一步：保持现有 API 不变，后端内部从 JSON 改成数据库

先不要改 `mobile.html` 的请求方式，继续保留当前接口路径，例如：

- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/:id`
- `PATCH /api/products/:id/status`
- `DELETE /api/products/:id`
- `GET /api/transactions`

后端内部把读写 `products.json`、`transactions.json` 改成读写数据库。这样前端不用大改，风险较低。

### 第二步：图片从 Base64 改成文件路径 `imageUrl`

当前商品图片是 Base64 的 `imageData`，后续可以改成：

- 前端上传图片文件
- 后端保存图片到本地 `uploads/` 或云存储
- 数据库只保存图片地址 `imageUrl`

这样商品数据会更轻，也更接近真实产品。

### 第三步：加入真实用户登录和权限

加入用户系统后，商品发布、编辑、删除、收藏、聊天和状态修改都需要和用户身份绑定。

需要补充的权限规则包括：

- 只有卖家可以编辑或删除自己的商品。
- 买家可以收藏商品、联系卖家、发起预定。
- 卖家可以确认商品状态或标记已出。
- 系统要避免未登录用户修改他人数据。

## 6. 本地阶段建议

本地阶段建议先使用 SQLite 作为过渡数据库。

原因：

- 不需要云服务，本地就能运行。
- 学习成本低，适合从 JSON 文件升级。
- 比 JSON 更接近真实数据库，有表、字段、关系和查询能力。
- 项目以后可以再迁移到 Postgres，表结构思路基本可以复用。

推荐本地优先建立：

- `products` 商品表
- `transactions` 交易记录表

这两张表能覆盖当前后端最核心的数据读写，也最容易在不改前端接口的情况下完成迁移。

## 7. 云端阶段建议

后期如果要进一步升级，可以考虑两种路线。

### 方案一：Supabase

使用 Supabase 的：

- Postgres：保存用户、商品、收藏、会话、消息和交易记录。
- Auth：处理注册、登录和用户身份。
- Storage：保存商品图片。

这个方案适合快速做 MVP，因为数据库、登录和存储能力比较集中。

### 方案二：Node.js 后端 + 云数据库 + 图片存储

继续保留自己的 Node.js 后端，数据库可以使用：

- Postgres
- MySQL
- MongoDB

图片可以使用：

- 云对象存储
- 服务器文件存储
- 第三方图片服务

这个方案自由度更高，但需要自己处理更多后端工程问题。

## 8. 风险提醒

真实上线前必须处理以下问题：

- 用户登录：需要明确谁在发布、编辑、收藏和聊天。
- 数据权限：用户不能编辑或删除别人的商品。
- 图片存储大小：需要限制图片大小、格式和数量，避免存储失控。
- 删除权限：删除商品、删除图片和删除消息都要有明确规则。
- 校园认证：如果定位校园平台，需要考虑学校邮箱、学号或校园身份认证。
- 隐私与安全：聊天内容、邮箱、头像等用户信息需要保护。
- 备份和错误恢复：数据库和图片需要备份，避免误删或服务异常导致数据丢失。

## 9. 下一步开发建议

下一步建议先在本地引入 SQLite，建立 `products` 和 `transactions` 两张表，保持前端接口不变。

这样可以在不影响现有 `mobile.html` 使用体验的情况下，把后端从 JSON 文件读写升级为数据库读写。等商品和交易记录稳定后，再逐步加入 `users`、`favorites`、`conversations` 和 `messages` 表。
