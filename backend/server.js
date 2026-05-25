const http = require("http");
const fs = require("fs");
const path = require("path");
const store = require("./sqlite-store");

const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0";
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : DEFAULT_ALLOWED_ORIGINS;
const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const DEMO_PRODUCTS_FILE = path.join(DATA_DIR, "demoProducts.json");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");

const categories = [
  { id: 1, name: "教材资料" },
  { id: 2, name: "设计生专区" },
  { id: 3, name: "数码电子" },
  { id: 4, name: "宿舍生活" },
  { id: 5, name: "免费赠送" }
];

const productStatuses = ["在售", "已预定", "已出"];
const defaultProductStatus = "在售";

function normalizeProducts(storedProducts) {
  if (!Array.isArray(storedProducts)) {
    throw new Error("products data must contain an array");
  }

  return storedProducts.map((product) => ({
    ...product,
    status: productStatuses.includes(product.status) ? product.status : defaultProductStatus,
    imageData: typeof product.imageData === "string" ? product.imageData : ""
  }));
}

function readProductsFile(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const storedProducts = JSON.parse(fileContent);
  return normalizeProducts(storedProducts);
}

store.initializeDatabase(PRODUCTS_FILE, TRANSACTIONS_FILE);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    ...corsHeaders(res.req),
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function corsHeaders(req) {
  const origin = req && req.headers ? req.headers.origin : "";
  const allowOrigin = !origin || allowedOrigins.includes(origin) ? (origin || "*") : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin"
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...corsHeaders(req),
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "qingningji-backend"
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/categories") {
    sendJson(res, 200, { data: categories });
    return;
  }

  if (req.method === "GET" && pathname === "/api/products") {
    sendJson(res, 200, { data: store.listProducts() });
    return;
  }

  if (req.method === "GET" && pathname === "/api/transactions") {
    sendJson(res, 200, { data: store.listTransactions() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/reset-demo-products") {
    try {
      readProductsFile(DEMO_PRODUCTS_FILE);
      const demoProducts = store.resetProducts(DEMO_PRODUCTS_FILE);
      sendJson(res, 200, { data: demoProducts });
    } catch (error) {
      sendJson(res, 500, { error: "重置演示数据失败" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/products") {
    let body;

    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "请求体必须是有效的 JSON" });
      return;
    }

    const requiredFields = ["title", "price", "category", "location", "seller"];
    const missingFields = requiredFields.filter((field) => {
      const value = body[field];
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      sendJson(res, 400, {
        error: "缺少必要字段",
        missingFields
      });
      return;
    }

    const newProduct = {
      title: body.title,
      price: body.price,
      category: body.category,
      location: body.location,
      seller: body.seller,
      status: defaultProductStatus,
      imageData: typeof body.imageData === "string" ? body.imageData : ""
    };

    sendJson(res, 201, { data: store.createProduct(newProduct) });
    return;
  }

  const productMatch = pathname.match(/^\/api\/products\/(\d+)$/);
  const productStatusMatch = pathname.match(/^\/api\/products\/(\d+)\/status$/);

  if (req.method === "PATCH" && productStatusMatch) {
    let body;

    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "请求体必须是有效的 JSON" });
      return;
    }

    if (!productStatuses.includes(body.status)) {
      sendJson(res, 400, {
        error: "商品状态不合法",
        allowedStatuses: productStatuses
      });
      return;
    }

    const productId = Number(productStatusMatch[1]);
    const product = store.updateProductStatus(productId, body.status);

    if (!product) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    sendJson(res, 200, { data: product });
    return;
  }

  if (req.method === "PATCH" && productMatch) {
    let body;

    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "请求体必须是有效的 JSON" });
      return;
    }

    const productId = Number(productMatch[1]);
    const currentProduct = store.getProduct(productId);

    if (!currentProduct) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    if (body.status !== undefined) {
      if (!productStatuses.includes(body.status)) {
        sendJson(res, 400, {
          error: "商品状态不合法",
          allowedStatuses: productStatuses
        });
        return;
      }
    }

    const editableFields = ["title", "price", "category", "location", "seller"];
    const updates = {};
    editableFields.forEach((field) => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    if (body.status !== undefined) {
      updates.status = body.status;
    }

    const product = store.updateProduct(productId, updates);
    sendJson(res, 200, { data: product });
    return;
  }

  if (req.method === "GET" && productMatch) {
    const productId = Number(productMatch[1]);
    const product = store.getProduct(productId);

    if (!product) {
      sendJson(res, 404, { error: "Product Not Found" });
      return;
    }

    sendJson(res, 200, { data: product });
    return;
  }

  if (req.method === "DELETE" && productMatch) {
    const productId = Number(productMatch[1]);
    const deletedProduct = store.deleteProduct(productId);

    if (!deletedProduct) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    sendJson(res, 200, { data: deletedProduct });
    return;
  }

  if (["/health", "/api/categories", "/api/products", "/api/transactions", "/api/reset-demo-products"].includes(pathname) || productMatch || productStatusMatch) {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  sendJson(res, 404, { error: "Not Found" });
}

const server = http.createServer((req, res) => {
  res.req = req;
  handleRequest(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Qingningji backend API is running at http://${HOST}:${PORT}`);
});
