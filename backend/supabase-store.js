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

function toCamelConversation(conversation) {
  if (!conversation) {
    return null;
  }

  return {
    id: conversation.id,
    productId: conversation.product_id,
    buyerId: conversation.buyer_id || "",
    buyerEmail: conversation.buyer_email || "",
    sellerId: conversation.seller_id || "",
    sellerEmail: conversation.seller_email || "",
    sellerName: conversation.seller_name || "匿名同学",
    productTitle: conversation.product_title || "未命名商品",
    productPrice: conversation.product_price,
    lastMessage: conversation.last_message || "",
    lastMessageAt: conversation.last_message_at || conversation.created_at,
    createdAt: conversation.created_at
  };
}

function toCamelMessage(message) {
  if (!message) {
    return null;
  }

  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id || "",
    senderEmail: message.sender_email || "",
    senderRole: message.sender_role || "buyer",
    content: message.content || "",
    messageType: message.message_type || "text",
    createdAt: message.created_at
  };
}

function toCamelProfile(profile) {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email || "",
    displayName: profile.display_name || "",
    school: profile.school || "",
    major: profile.major || "",
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  };
}

function defaultDisplayName(email) {
  const prefix = String(email || "").split("@")[0].trim();
  return prefix || "校园用户";
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

async function getOrCreateProfile(user) {
  ensureSupabase();
  const userId = user && user.id;

  if (!userId) {
    throw new Error("User is required");
  }

  const email = user.email || "";
  const currentTime = nowIso();
  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  throwIfError(selectError);

  if (existingProfile) {
    return toCamelProfile(existingProfile);
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email,
      display_name: defaultDisplayName(email),
      school: "",
      major: "",
      created_at: currentTime,
      updated_at: currentTime
    })
    .select("*")
    .single();
  throwIfError(error);
  return toCamelProfile(data);
}

async function updateProfile(user, profile) {
  ensureSupabase();
  const currentProfile = await getOrCreateProfile(user);
  const updates = {
    email: user.email || currentProfile.email || "",
    updated_at: nowIso()
  };

  if (profile.displayName !== undefined) updates.display_name = profile.displayName;
  if (profile.school !== undefined) updates.school = profile.school;
  if (profile.major !== undefined) updates.major = profile.major;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("*")
    .single();
  throwIfError(error);
  return toCamelProfile(data);
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

async function listFavoriteProducts(userId) {
  ensureSupabase();
  const { data, error } = await supabase
    .from("favorites")
    .select("product_id, created_at, products(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  throwIfError(error);

  return (data || [])
    .map((favorite) => {
      const product = Array.isArray(favorite.products) ? favorite.products[0] : favorite.products;
      return toCamelProduct(product);
    })
    .filter(Boolean);
}

async function createFavorite(user, productId) {
  ensureSupabase();
  const { error } = await supabase.from("favorites").upsert(
    {
      user_id: user.id,
      user_email: user.email || "",
      product_id: productId
    },
    {
      onConflict: "user_id,product_id",
      ignoreDuplicates: true
    }
  );
  throwIfError(error);

  return {
    productId
  };
}

async function deleteFavorite(userId, productId) {
  ensureSupabase();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
  throwIfError(error);

  return {
    productId
  };
}

async function listConversationsForUser(userId) {
  ensureSupabase();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  throwIfError(error);
  return (data || []).map(toCamelConversation);
}

async function getConversation(id) {
  ensureSupabase();
  const { data, error } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return toCamelConversation(data);
}

async function findConversationByBuyerAndProduct(buyerId, productId) {
  ensureSupabase();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("buyer_id", buyerId)
    .eq("product_id", productId)
    .order("created_at", { ascending: true })
    .limit(1);
  throwIfError(error);
  return toCamelConversation((data || [])[0]);
}

async function createConversation(user, product) {
  ensureSupabase();
  const currentTime = nowIso();
  const systemContent = "会话已创建，可以开始沟通。";
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      product_id: product.id,
      buyer_id: user.id,
      buyer_email: user.email || "",
      seller_id: product.ownerId,
      seller_email: product.ownerEmail || "",
      seller_name: product.seller || "匿名同学",
      product_title: product.title || "未命名商品",
      product_price: product.price,
      last_message: systemContent,
      last_message_at: currentTime,
      created_at: currentTime
    })
    .select("*")
    .single();
  throwIfError(error);

  const conversation = toCamelConversation(data);
  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: null,
    sender_email: "",
    sender_role: "system",
    content: systemContent,
    message_type: "system",
    created_at: currentTime
  });
  throwIfError(messageError);

  return conversation;
}

async function listMessagesForConversation(conversationId) {
  ensureSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  throwIfError(error);
  return (data || []).map(toCamelMessage);
}

async function createMessage(conversation, user, content) {
  ensureSupabase();
  const currentTime = nowIso();
  const senderRole = conversation.sellerId === user.id ? "seller" : "buyer";
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      sender_email: user.email || "",
      sender_role: senderRole,
      content,
      message_type: "text",
      created_at: currentTime
    })
    .select("*")
    .single();
  throwIfError(error);

  const message = toCamelMessage(data);
  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      last_message: content,
      last_message_at: message.createdAt || currentTime
    })
    .eq("id", conversation.id);
  throwIfError(updateError);

  return message;
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
  getOrCreateProfile,
  updateProfile,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  listTransactions,
  listFavoriteProducts,
  createFavorite,
  deleteFavorite,
  listConversationsForUser,
  getConversation,
  findConversationByBuyerAndProduct,
  createConversation,
  listMessagesForConversation,
  createMessage,
  resetProducts
};
