# 青柠集 - 校园闲置交换 App 原型

## 项目定位

青柠集是一个面向校园学生的闲置物品交换与发布平台，支持商品浏览、分类筛选、搜索、发布、删除、详情查看、联系卖家、消息会话、我的发布管理。

## 当前已完成的功能

- 后端商品数据接口
- 本地数据持久化 `data/products.json`
- 电脑版页面 `index.html`
- 手机 App 页面 `mobile.html`
- 商品列表展示
- 商品详情弹窗
- 搜索功能
- 分类筛选
- 发布商品
- 删除商品
- 消息页会话生成
- 我的发布管理
- 底部导航 Tab 切换

## 项目文件结构说明

- `backend/server.js`：后端服务入口，提供商品数据接口等能力。
- `backend/data/products.json`：本地商品数据持久化文件。
- `backend/package.json`：后端依赖、脚本和项目配置。
- `backend/README.md`：后端相关说明文档。
- `frontend/index.html`：电脑版页面入口。
- `frontend/mobile.html`：手机 App 原型页面入口。

## 启动方式

后端：

```bash
cd /mnt/d/桌面/DProjectsqingningji-app/backend
npm run dev
```

前端：

```bash
cd /mnt/d/桌面/DProjectsqingningji-app/frontend
python3 -m http.server 5173
```

## 访问地址

- 后端健康检查：http://localhost:3001/health
- 商品接口：http://localhost:3001/api/products
- 电脑版：http://localhost:5173
- 手机版：http://localhost:5173/mobile.html

## 当前项目状态

v0.2 可运行原型，可以用于课程展示和后续继续开发。

## 当前不足

- 还没有真实用户登录
- 还没有图片上传
- 消息会话暂未持久化
- 仍是本地运行，未部署到云端
- 手机端视觉还可以继续精修
- 数据库暂时用本地 JSON 文件模拟

## 下一步建议

- 精修 `mobile.html` 首页视觉
- 增加商品图片上传占位
- 准备课程展示 PPT
- 后期考虑云端部署
- 后期考虑数据库和登录系统
