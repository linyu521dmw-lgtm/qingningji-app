# 青柠集运行笔记

## 如何启动后端

进入后端目录：

```bash
cd /mnt/d/桌面/DProjectsqingningji-app/backend
```

启动后端服务：

```bash
npm run dev
```

也可以直接运行：

```bash
node server.js
```

后端默认运行在 `http://localhost:3001`。

## 如何启动前端

进入前端目录：

```bash
cd /mnt/d/桌面/DProjectsqingningji-app/frontend
```

启动本地静态服务：

```bash
python3 -m http.server 5173
```

前端默认运行在 `http://localhost:5173`。

## 常用访问地址

- 后端健康检查：http://localhost:3001/health
- 商品列表接口：http://localhost:3001/api/products
- 分类接口：http://localhost:3001/api/categories
- 交易记录接口：http://localhost:3001/api/transactions
- 电脑端展示页：http://localhost:5173/index.html
- 手机端 App 页面：http://localhost:5173/mobile.html

## 如何检查后端是否正常

浏览器打开：

```text
http://localhost:3001/health
```

如果看到类似下面的内容，说明后端已经启动：

```json
{
  "status": "ok",
  "app": "青柠集 backend"
}
```

也可以在终端检查：

```bash
curl http://localhost:3001/health
```

## 如何检查商品数据

浏览器打开：

```text
http://localhost:3001/api/products
```

如果返回 JSON 商品数组，说明商品接口正常。

商品数据文件位置：

```text
backend/data/products.json
```

演示数据文件位置：

```text
backend/data/demoProducts.json
```

交易记录文件位置：

```text
backend/data/transactions.json
```

## 常见问题

### 3001 端口被占用

说明后端端口已经被其它程序占用。可以先关闭之前启动的后端终端，或查找占用端口的进程。

常用检查命令：

```bash
lsof -i :3001
```

如果确认是旧的 Node 服务，可以结束对应进程后重新启动后端。

### 前端 5173 打不开

先确认前端静态服务是否已经启动，并且启动目录是 `frontend`。

正确命令：

```bash
cd /mnt/d/桌面/DProjectsqingningji-app/frontend
python3 -m http.server 5173
```

如果 5173 也被占用，可以换一个端口，例如：

```bash
python3 -m http.server 5174
```

然后访问：

```text
http://localhost:5174/mobile.html
```

### 修改后端后要重启

当前后端没有自动热更新。修改 `backend/server.js` 后，需要停止后端服务并重新运行：

```bash
npm run dev
```

### Git 如何保存

查看当前改动：

```bash
git status
```

暂存改动：

```bash
git add .
```

提交版本：

```bash
git commit -m "说明本次修改内容"
```

查看最近提交：

```bash
git log --oneline -5
```

## 常用命令整理

进入项目根目录：

```bash
cd /mnt/d/桌面/DProjectsqingningji-app
```

启动后端：

```bash
cd backend
npm run dev
```

启动前端：

```bash
cd frontend
python3 -m http.server 5173
```

检查后端：

```bash
curl http://localhost:3001/health
```

查看商品：

```bash
curl http://localhost:3001/api/products
```

重置演示数据：

```bash
curl -X POST http://localhost:3001/api/reset-demo-products
```

保存 Git 版本：

```bash
git add .
git commit -m "Update project docs"
```
