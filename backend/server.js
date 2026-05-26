const http = require("http");
const fs = require("fs");
const path = require("path");
const sqliteStore = require("./sqlite-store");
const supabaseStore = require("./supabase-store");

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
const ALLOWED_HEADERS = "Content-Type, Authorization, x-admin-token";
const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const DEMO_PRODUCTS_FILE = path.join(DATA_DIR, "demoProducts.json");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");
const useSupabase = supabaseStore.isEnabled();
const store = useSupabase ? supabaseStore : sqliteStore;
const PRODUCT_IMAGES_BUCKET = "product-images";
const supabaseStorageClient = useSupabase
  ? require("@supabase/supabase-js").createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

const categories = [
  { id: 1, name: "教材资料" },
  { id: 2, name: "设计生专区" },
  { id: 3, name: "数码电子" },
  { id: 4, name: "宿舍生活" },
  { id: 5, name: "免费赠送" }
];

const productStatuses = ["在售", "已预定", "已出"];
const defaultProductStatus = "在售";
const productCategoryNames = ["教材资料", "数码电子", "宿舍生活", "运动户外", "设计生专区"];
const productCategoryAliases = {
  教材: "教材资料",
  数码: "数码电子",
  生活: "宿舍生活",
  运动: "运动户外",
  设计: "设计生专区"
};
const maxImageBase64Length = 2 * 1024 * 1024;

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

if (!useSupabase) {
  sqliteStore.initializeDatabase(PRODUCTS_FILE, TRANSACTIONS_FILE);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    ...corsHeaders(res.req),
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
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

function getUploadableImageData(imageData) {
  if (typeof imageData !== "string" || imageData.trim() === "") {
    return null;
  }

  const match = imageData.match(/^data:image\/(png|jpe?g|webp);base64,([\s\S]+)$/i);
  if (!match) {
    return null;
  }

  const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  return {
    base64: match[2].replace(/\s/g, ""),
    contentType: `image/${extension === "jpg" ? "jpeg" : extension}`
  };
}

function isUploadableProductImage(imageData) {
  return Boolean(getUploadableImageData(imageData));
}

function validateLength(value, minLength, maxLength, emptyMessage, lengthMessage) {
  if (value === undefined || value === null) {
    return { error: emptyMessage };
  }

  const trimmedValue = String(value).trim();
  if (trimmedValue.length < minLength) {
    return { error: emptyMessage };
  }

  if (trimmedValue.length > maxLength) {
    return { error: lengthMessage };
  }

  return { value: trimmedValue };
}

function normalizeCategory(category) {
  const normalizedCategory = String(category || "").trim();
  return productCategoryAliases[normalizedCategory] || normalizedCategory;
}

function validateProductImageData(imageData) {
  if (imageData === undefined) {
    return { value: undefined };
  }

  if (imageData === null || imageData === "") {
    return { value: "" };
  }

  if (typeof imageData !== "string") {
    return { error: "图片数据不合法" };
  }

  if (!imageData.startsWith("data:image/")) {
    return { value: imageData };
  }

  const match = imageData.match(/^data:image\/(png|jpe?g|webp);base64,([\s\S]+)$/i);
  if (!match) {
    return { error: "图片格式只支持 jpg、png、webp" };
  }

  const base64Data = match[2].replace(/\s/g, "");
  if (!base64Data || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
    return { error: "图片数据不合法" };
  }

  if (base64Data.length > maxImageBase64Length) {
    return { error: "图片不能超过 2MB" };
  }

  return { value: imageData };
}

function validateProductInput(input) {
  const body = input && typeof input === "object" ? input : {};
  const validated = {};

  const title = validateLength(body.title, 1, 40, "商品名称不能为空", "商品名称不能超过 40 个字");
  if (title.error) return { error: title.error };
  validated.title = title.value;

  if (body.price === undefined || body.price === null || body.price === "") {
    return { error: "价格必须是 0 到 9999 之间的数字" };
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0 || price > 9999) {
    return { error: "价格必须是 0 到 9999 之间的数字" };
  }
  validated.price = price;

  const category = validateLength(body.category, 1, 40, "分类不能为空", "分类不合法");
  if (category.error) return { error: category.error };
  const normalizedCategory = normalizeCategory(category.value);
  if (!productCategoryNames.includes(normalizedCategory)) {
    return { error: "分类不合法" };
  }
  validated.category = normalizedCategory;

  const location = validateLength(body.location, 1, 40, "地点不能为空", "地点不能超过 40 个字");
  if (location.error) return { error: location.error };
  validated.location = location.value;

  const seller = validateLength(body.seller, 1, 30, "卖家不能为空", "卖家不能超过 30 个字");
  if (seller.error) return { error: seller.error };
  validated.seller = seller.value;

  if (body.status !== undefined) {
    if (!productStatuses.includes(body.status)) {
      return { error: "商品状态不合法" };
    }
    validated.status = body.status;
  }

  const imageData = validateProductImageData(body.imageData);
  if (imageData.error) return { error: imageData.error };
  if (imageData.value !== undefined) {
    validated.imageData = imageData.value;
  }

  return { data: validated };
}

async function uploadProductImage(imageData, productId) {
  if (typeof imageData !== "string" || imageData.trim() === "") {
    return "";
  }

  const uploadableImage = getUploadableImageData(imageData);
  if (!uploadableImage || !supabaseStorageClient) {
    return imageData;
  }

  const filePath = `products/${productId}-${Date.now()}.jpg`;
  const { error } = await supabaseStorageClient.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(filePath, Buffer.from(uploadableImage.base64, "base64"), {
      contentType: uploadableImage.contentType,
      upsert: false
    });

  if (error) {
    throw new Error(error.message || "上传商品图片失败");
  }

  const { data } = supabaseStorageClient.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(filePath);
  return data.publicUrl || "";
}

async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match || !supabaseStorageClient) {
    return null;
  }

  const { data, error } = await supabaseStorageClient.auth.getUser(match[1]);

  if (error || !data || !data.user) {
    return null;
  }

  return data.user;
}

function isProductOwner(product, user) {
  return Boolean(product && user && product.ownerId && product.ownerId === user.id);
}

function canResetDemoProducts(req) {
  if (process.env.ALLOW_DEMO_RESET === "true") {
    return true;
  }

  const adminResetToken = process.env.ADMIN_RESET_TOKEN || "";
  const requestToken = req.headers["x-admin-token"] || "";

  return Boolean(adminResetToken && requestToken && requestToken === adminResetToken);
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...corsHeaders(req),
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": ALLOWED_HEADERS
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
    try {
      sendJson(res, 200, { data: await store.listProducts() });
    } catch (error) {
      sendJson(res, 500, { error: "获取商品列表失败" });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/transactions") {
    try {
      sendJson(res, 200, { data: await store.listTransactions() });
    } catch (error) {
      sendJson(res, 500, { error: "获取交易记录失败" });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/favorites") {
    const user = await getUserFromRequest(req);

    if (!user) {
      sendJson(res, 401, { error: "请先登录后收藏" });
      return;
    }

    try {
      sendJson(res, 200, { data: await store.listFavoriteProducts(user.id) });
    } catch (error) {
      sendJson(res, 500, { error: "获取收藏列表失败" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/favorites") {
    let body;
    const user = await getUserFromRequest(req);

    if (!user) {
      sendJson(res, 401, { error: "请先登录后收藏" });
      return;
    }

    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "请求体必须是有效的 JSON" });
      return;
    }

    const productId = Number(body.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      sendJson(res, 400, { error: "商品不存在" });
      return;
    }

    try {
      const product = await store.getProduct(productId);
      if (!product) {
        sendJson(res, 404, { error: "商品不存在" });
        return;
      }

      sendJson(res, 200, { data: await store.createFavorite(user, productId) });
    } catch (error) {
      sendJson(res, 500, { error: "收藏商品失败" });
    }
    return;
  }

  const favoriteMatch = pathname.match(/^\/api\/favorites\/(\d+)$/);

  if (req.method === "DELETE" && favoriteMatch) {
    const user = await getUserFromRequest(req);
    const productId = Number(favoriteMatch[1]);

    if (!user) {
      sendJson(res, 401, { error: "请先登录后收藏" });
      return;
    }

    try {
      sendJson(res, 200, { data: await store.deleteFavorite(user.id, productId) });
    } catch (error) {
      sendJson(res, 500, { error: "取消收藏失败" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/reset-demo-products") {
    if (!canResetDemoProducts(req)) {
      sendJson(res, 403, { error: "Demo reset is disabled in production" });
      return;
    }

    try {
      const demoProducts = readProductsFile(DEMO_PRODUCTS_FILE);
      const resetProducts = useSupabase ? await store.resetProducts(demoProducts) : await store.resetProducts(DEMO_PRODUCTS_FILE);
      sendJson(res, 200, { data: resetProducts });
    } catch (error) {
      sendJson(res, 500, { error: "重置演示数据失败" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/products") {
    let body;
    const user = await getUserFromRequest(req);

    if (!user) {
      sendJson(res, 401, { error: "请先登录后发布" });
      return;
    }

    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "请求体必须是有效的 JSON" });
      return;
    }

    const validation = validateProductInput(body);
    if (validation.error) {
      sendJson(res, 400, { error: validation.error });
      return;
    }

    const productInput = validation.data;
    const submittedImageData = typeof productInput.imageData === "string" ? productInput.imageData : "";
    const shouldUploadImage = useSupabase && isUploadableProductImage(submittedImageData);
    const newProduct = {
      title: productInput.title,
      price: productInput.price,
      category: productInput.category,
      location: productInput.location,
      seller: productInput.seller,
      status: defaultProductStatus,
      imageData: shouldUploadImage ? "" : submittedImageData,
      ownerId: user.id,
      ownerEmail: user.email || ""
    };

    try {
      let product = await store.createProduct(newProduct);

      if (shouldUploadImage) {
        const publicUrl = await uploadProductImage(submittedImageData, product.id);
        product = await store.updateProduct(product.id, {
          imageData: "",
          imageUrl: publicUrl
        });
      }

      sendJson(res, 201, { data: product });
    } catch (error) {
      sendJson(res, 500, { error: "创建商品失败" });
    }
    return;
  }

  const productMatch = pathname.match(/^\/api\/products\/(\d+)$/);
  const productStatusMatch = pathname.match(/^\/api\/products\/(\d+)\/status$/);

  if (req.method === "PATCH" && productStatusMatch) {
    let body;
    const user = await getUserFromRequest(req);

    if (!user) {
      sendJson(res, 401, { error: "请先登录后操作" });
      return;
    }

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
    let currentProduct;
    let product;

    try {
      currentProduct = await store.getProduct(productId);
    } catch (error) {
      sendJson(res, 500, { error: "获取商品失败" });
      return;
    }

    if (!currentProduct) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    if (!isProductOwner(currentProduct, user)) {
      sendJson(res, 403, { error: "只能操作自己发布的商品" });
      return;
    }

    try {
      product = await store.updateProductStatus(productId, body.status, {
        id: user.id,
        email: user.email || ""
      });
    } catch (error) {
      sendJson(res, 500, { error: "更新商品状态失败" });
      return;
    }

    if (!product) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    sendJson(res, 200, { data: product });
    return;
  }

  if (req.method === "PATCH" && productMatch) {
    let body;
    const user = await getUserFromRequest(req);

    if (!user) {
      sendJson(res, 401, { error: "请先登录后操作" });
      return;
    }

    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "请求体必须是有效的 JSON" });
      return;
    }

    const productId = Number(productMatch[1]);
    let currentProduct;

    try {
      currentProduct = await store.getProduct(productId);
    } catch (error) {
      sendJson(res, 500, { error: "获取商品失败" });
      return;
    }

    if (!currentProduct) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    if (!isProductOwner(currentProduct, user)) {
      sendJson(res, 403, { error: "只能操作自己发布的商品" });
      return;
    }

    const validation = validateProductInput(body);
    if (validation.error) {
      sendJson(res, 400, { error: validation.error });
      return;
    }

    const productInput = validation.data;
    const editableFields = ["title", "price", "category", "location", "seller"];
    const updates = {};
    editableFields.forEach((field) => {
      if (productInput[field] !== undefined) {
        updates[field] = productInput[field];
      }
    });

    if (productInput.status !== undefined) {
      updates.status = productInput.status;
    }

    if (productInput.imageData !== undefined) {
      if (useSupabase && isUploadableProductImage(productInput.imageData)) {
        try {
          updates.imageUrl = await uploadProductImage(productInput.imageData, productId);
          updates.imageData = "";
        } catch (error) {
          sendJson(res, 500, { error: "上传商品图片失败" });
          return;
        }
      } else if (!useSupabase) {
        updates.imageData = typeof productInput.imageData === "string" ? productInput.imageData : "";
      }
    }

    let product;

    try {
      product = await store.updateProduct(productId, updates);
    } catch (error) {
      sendJson(res, 500, { error: "更新商品失败" });
      return;
    }

    if (!product) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    sendJson(res, 200, { data: product });
    return;
  }

  if (req.method === "GET" && productMatch) {
    const productId = Number(productMatch[1]);
    let product;

    try {
      product = await store.getProduct(productId);
    } catch (error) {
      sendJson(res, 500, { error: "获取商品失败" });
      return;
    }

    if (!product) {
      sendJson(res, 404, { error: "Product Not Found" });
      return;
    }

    sendJson(res, 200, { data: product });
    return;
  }

  if (req.method === "DELETE" && productMatch) {
    const productId = Number(productMatch[1]);
    const user = await getUserFromRequest(req);
    let currentProduct;
    let deletedProduct;

    if (!user) {
      sendJson(res, 401, { error: "请先登录后操作" });
      return;
    }

    try {
      currentProduct = await store.getProduct(productId);
    } catch (error) {
      sendJson(res, 500, { error: "获取商品失败" });
      return;
    }

    if (!currentProduct) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    if (!isProductOwner(currentProduct, user)) {
      sendJson(res, 403, { error: "只能操作自己发布的商品" });
      return;
    }

    try {
      deletedProduct = await store.deleteProduct(productId);
    } catch (error) {
      sendJson(res, 500, { error: "删除商品失败" });
      return;
    }

    if (!deletedProduct) {
      sendJson(res, 404, { error: "商品不存在" });
      return;
    }

    sendJson(res, 200, { data: deletedProduct });
    return;
  }

  if (["/health", "/api/categories", "/api/products", "/api/transactions", "/api/favorites", "/api/reset-demo-products"].includes(pathname) || productMatch || productStatusMatch || favoriteMatch) {
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
