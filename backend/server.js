const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3001;
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

const defaultProducts = [
  {
    id: 1,
    title: "二手马克笔套装 60色",
    price: 28,
    category: "设计生专区",
    location: "教学楼A座",
    seller: "艺术学院 小李",
    status: defaultProductStatus,
    imageData: ""
  },
  {
    id: 2,
    title: "Rhino 7 建模教材",
    price: 15,
    category: "教材资料",
    location: "图书馆门口",
    seller: "产品设计 王同学",
    status: defaultProductStatus,
    imageData: ""
  },
  {
    id: 3,
    title: "台灯",
    price: 22,
    category: "宿舍生活",
    location: "2号宿舍楼大厅",
    seller: "宿舍用户 小张",
    status: defaultProductStatus,
    imageData: ""
  },
  {
    id: 4,
    title: "小风扇",
    price: 18,
    category: "宿舍生活",
    location: "食堂一楼",
    seller: "校园用户 小陈",
    status: defaultProductStatus,
    imageData: ""
  }
];

function ensureProductsFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(defaultProducts, null, 2), "utf-8");
  }
}

function ensureTransactionsFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(TRANSACTIONS_FILE)) {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

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

function loadProducts() {
  ensureProductsFile();

  return readProductsFile(PRODUCTS_FILE);
}

function saveProducts() {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf-8");
}

function loadTransactions() {
  ensureTransactionsFile();

  const fileContent = fs.readFileSync(TRANSACTIONS_FILE, "utf-8");
  const storedTransactions = JSON.parse(fileContent);
  if (!Array.isArray(storedTransactions)) {
    throw new Error("transactions data must contain an array");
  }

  return storedTransactions;
}

function saveTransactions() {
  fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), "utf-8");
}

function getNextTransactionId() {
  return transactions.reduce((maxId, transaction) => Math.max(maxId, Number(transaction.id) || 0), 0) + 1;
}

function appendTransaction(product, fromStatus, toStatus) {
  if (fromStatus === toStatus) return null;

  const transaction = {
    id: getNextTransactionId(),
    productId: product.id,
    title: product.title,
    price: product.price,
    fromStatus,
    toStatus,
    seller: product.seller,
    location: product.location,
    createdAt: new Date().toISOString()
  };

  transactions.push(transaction);
  saveTransactions();
  return transaction;
}

const products = loadProducts();
const transactions = loadTransactions();
saveProducts();
saveTransactions();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
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

function getNextProductId() {
  return products.reduce((maxId, product) => Math.max(maxId, product.id), 0) + 1;
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      app: "青柠集 backend"
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/categories") {
    sendJson(res, 200, { data: categories });
    return;
  }

  if (req.method === "GET" && pathname === "/api/products") {
    sendJson(res, 200, { data: products });
    return;
  }

  if (req.method === "GET" && pathname === "/api/transactions") {
    sendJson(res, 200, { data: transactions });
    return;
  }

  if (req.method === "POST" && pathname === "/api/reset-demo-products") {
    try {
      const demoProducts = readProductsFile(DEMO_PRODUCTS_FILE);
      products.splice(0, products.length, ...demoProducts);
      transactions.splice(0, transactions.length);
      saveProducts();
      saveTransactions();
      sendJson(res, 200, { data: products });
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
      id: getNextProductId(),
      title: body.title,
      price: body.price,
      category: body.category,
      location: body.location,
      seller: body.seller,
      status: defaultProductStatus,
      imageData: typeof body.imageData === "string" ? body.imageData : ""
    };

    products.push(newProduct);
    saveProducts();
    sendJson(res, 201, { data: newProduct });
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
    const product = products.find((item) => item.id === productId);

    if (!product) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    const fromStatus = product.status;
    product.status = body.status;
    saveProducts();
    appendTransaction(product, fromStatus, body.status);
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
    const product = products.find((item) => item.id === productId);

    if (!product) {
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
    editableFields.forEach((field) => {
      if (body[field] !== undefined) {
        product[field] = body[field];
      }
    });

    if (body.status !== undefined) {
      product.status = body.status;
    }

    saveProducts();
    sendJson(res, 200, { data: product });
    return;
  }

  if (req.method === "GET" && productMatch) {
    const productId = Number(productMatch[1]);
    const product = products.find((item) => item.id === productId);

    if (!product) {
      sendJson(res, 404, { error: "Product Not Found" });
      return;
    }

    sendJson(res, 200, { data: product });
    return;
  }

  if (req.method === "DELETE" && productMatch) {
    const productId = Number(productMatch[1]);
    const productIndex = products.findIndex((item) => item.id === productId);

    if (productIndex === -1) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    const deletedProduct = products.splice(productIndex, 1)[0];
    saveProducts();
    sendJson(res, 200, { data: deletedProduct });
    return;
  }

  if (["/health", "/api/categories", "/api/products", "/api/transactions", "/api/reset-demo-products"].includes(pathname) || productMatch || productStatusMatch) {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  sendJson(res, 404, { error: "Not Found" });
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Qingningji backend API is running at http://localhost:${PORT}`);
});
