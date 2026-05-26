const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const productStatuses = ["在售", "已预定", "已出"];
const defaultProductStatus = "在售";

function isEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function getClient() {
  if (!isEnabled()) {
    return null;
  }

  const { createClient } = require("@supabase/supabase-js");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

const supabase = getClient();

function nowIso() {
  return new Date().toISOString();
}

function normalizeStatus(status) {
  return productStatuses.includes(status) ? status : defaultProductStatus;
}

function toCamelProduct(product) {
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    title: product.title,
    price: product.price,
    category: product.category,
    location: product.location,
    seller: product.seller,
    status: normalizeStatus(product.status),
    imageData: product.image_url || (typeof product.image_data === "string" ? product.image_data : ""),
    imageUrl: product.image_url || "",
    ownerId: product.owner_id || "",
    ownerEmail: product.owner_email || "",
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}

function toCamelTransaction(transaction) {
  if (!transaction) {
    return null;
  }

  return {
    id: transaction.id,
    productId: transaction.product_id,
    title: transaction.title,
    price: transaction.price,
    fromStatus: transaction.from_status,
    toStatus: transaction.to_status,
    seller: transaction.seller,
    location: transaction.location,
    actorId: transaction.actor_id || "",
    actorEmail: transaction.actor_email || "",
    createdAt: transaction.created_at
  };
}

function toSnakeProduct(product) {
  const currentTime = nowIso();

  return {
    id: product.id,
    title: product.title || product.name || product.productName || "未命名商品",
    price: product.price ?? product.amount ?? 0,
    category: product.category || "其他",
    location: product.location || product.place || product.campus || product.address || "校内",
    seller: product.seller || product.sellerName || product.user || product.username || product.owner || "匿名同学",
    status: normalizeStatus(product.status),
    image_data: typeof product.imageData === "string" ? product.imageData : "",
    image_url: product.imageUrl || "",
    owner_id: product.ownerId || product.owner_id || null,
    owner_email: product.ownerEmail || product.owner_email || null,
    created_at: product.createdAt || currentTime,
    updated_at: product.updatedAt || currentTime
  };
}

function toSnakeProductUpdates(product) {
  const updates = {};

  if (product.title !== undefined) updates.title = product.title;
  if (product.price !== undefined) updates.price = product.price;
  if (product.category !== undefined) updates.category = product.category;
  if (product.location !== undefined) updates.location = product.location;
  if (product.seller !== undefined) updates.seller = product.seller;
  if (product.status !== undefined) updates.status = normalizeStatus(product.status);
  if (product.imageData !== undefined) {
    updates.image_data = typeof product.imageData === "string" ? product.imageData : "";
  }
  if (product.imageUrl !== undefined) {
    updates.image_url = typeof product.imageUrl === "string" ? product.imageUrl : "";
  }
  if (Object.keys(updates).length > 0) {
    updates.updated_at = nowIso();
  }

  return updates;
}

function toSnakeTransaction(transaction) {
  return {
    product_id: transaction.productId,
    title: transaction.title || "未命名商品",
    price: transaction.price ?? 0,
    from_status: transaction.fromStatus || defaultProductStatus,
    to_status: transaction.toStatus || defaultProductStatus,
    seller: transaction.seller || "匿名同学",
    location: transaction.location || "校内",
    actor_id: transaction.actorId || null,
    actor_email: transaction.actorEmail || null,
    created_at: transaction.createdAt || nowIso()
  };
}

function ensureSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
}

function throwIfError(error) {
  if (error) {
    throw new Error(error.message || "Supabase operation failed");
  }
}

async function listProducts() {
  ensureSupabase();
  const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
  throwIfError(error);
  return (data || []).map(toCamelProduct);
}

async function getProduct(id) {
  ensureSupabase();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return toCamelProduct(data);
}

async function createProduct(product) {
  ensureSupabase();
  const newProduct = toSnakeProduct({
    ...product,
    status: defaultProductStatus,
    createdAt: nowIso(),
    updatedAt: nowIso()
  });
  delete newProduct.id;

  const { data, error } = await supabase.from("products").insert(newProduct).select("*").single();
  throwIfError(error);
  return toCamelProduct(data);
}

async function updateProduct(id, product) {
  ensureSupabase();
  const updates = toSnakeProductUpdates(product);

  if (Object.keys(updates).length === 0) {
    return getProduct(id);
  }

  const { data, error } = await supabase.from("products").update(updates).eq("id", id).select("*").maybeSingle();
  throwIfError(error);
  return toCamelProduct(data);
}

async function updateProductStatus(id, status, actor = {}) {
  ensureSupabase();
  const currentProduct = await getProduct(id);

  if (!currentProduct) {
    return null;
  }

  const currentTime = nowIso();
  const { data, error } = await supabase
    .from("products")
    .update({
      status,
      updated_at: currentTime
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  throwIfError(error);

  if (currentProduct.status !== status) {
    const { error: transactionError } = await supabase.from("transactions").insert(
      toSnakeTransaction({
        productId: currentProduct.id,
        title: currentProduct.title,
        price: currentProduct.price,
        fromStatus: currentProduct.status,
        toStatus: status,
        seller: currentProduct.seller,
        location: currentProduct.location,
        actorId: actor.id,
        actorEmail: actor.email,
        createdAt: currentTime
      })
    );
    throwIfError(transactionError);
  }

  return toCamelProduct(data);
}

async function deleteProduct(id) {
  ensureSupabase();
  const currentProduct = await getProduct(id);

  if (!currentProduct) {
    return null;
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  throwIfError(error);
  return currentProduct;
}

async function listTransactions() {
  ensureSupabase();
  const { data, error } = await supabase.from("transactions").select("*").order("id", { ascending: true });
  throwIfError(error);
  return (data || []).map(toCamelTransaction);
}

async function resetProducts(demoProducts) {
  ensureSupabase();

  const { error: deleteTransactionsError } = await supabase.from("transactions").delete().gte("id", 0);
  throwIfError(deleteTransactionsError);

  const { error: deleteProductsError } = await supabase.from("products").delete().gte("id", 0);
  throwIfError(deleteProductsError);

  const products = demoProducts.map((product) => ({
    ...toSnakeProduct(product),
    image_data: "",
    image_url: ""
  }));
  const { data, error } = await supabase.from("products").insert(products).select("*").order("id", { ascending: true });
  throwIfError(error);
  return (data || []).map(toCamelProduct);
}

module.exports = {
  isEnabled,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  listTransactions,
  resetProducts
};
