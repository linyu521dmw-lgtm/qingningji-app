# 青柠集后端

这是一个纯 Node.js 后端服务，不使用 Express、TypeScript 或任何第三方依赖。

## 运行方式

不需要执行 `npm install`。

直接运行：

```bash
npm run dev
```

也可以直接运行：

```bash
node server.js
```

服务默认运行在 `http://localhost:3001`。

## 数据持久化

商品数据保存在 `data/products.json`。

后端启动时会优先读取该文件中的商品列表；如果文件不存在，会自动创建并写入默认商品数据。通过 `POST /api/products` 新发布的商品会写回 `data/products.json`，后端重启后仍会保留。

## 接口

- `GET /health`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `DELETE /api/products/:id`

## 发布商品

`POST /api/products` 用于新增商品。请求体必须是 JSON，并包含以下字段：

- `title` 商品名称
- `price` 价格
- `category` 分类
- `location` 交易地点
- `seller` 卖家

缺少任意必要字段时会返回 `400`。创建成功时返回 `201` 和新商品数据。

示例：

```bash
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "二手画板",
    "price": 35,
    "category": "设计生专区",
    "location": "教学楼A座",
    "seller": "视觉传达 小周"
  }'
```

## 删除商品

`DELETE /api/products/:id` 用于根据商品 id 删除商品。

商品不存在时返回 `404`，提示“商品不存在”。删除成功时返回 `200` 和被删除的商品数据。

示例：

```bash
curl -X DELETE http://localhost:3001/api/products/1
```
