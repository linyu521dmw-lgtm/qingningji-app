const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const productStatuses = ["在售", "已预定", "已出"];
const defaultProductStatus = "在售";
const orderStatuses = ["待支付", "待自取", "已完成", "已取消"];
const paymentStatuses = ["未支付", "已支付"];
const pickupStatuses = ["待自取", "已自取"];

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

function toCamelOrder(order) {
  if (!order) {
    return null;
  }

  return {
    id: order.id,
    productId: order.product_id,
    buyerId: order.buyer_id || "",
    buyerEmail: order.buyer_email || "",
    sellerId: order.seller_id || "",
    sellerEmail: order.seller_email || "",
    productTitle: order.product_title || "未命名商品",
    price: order.price ?? 0,
    orderStatus: orderStatuses.includes(order.order_status) ? order.order_status : "待支付",
    paymentStatus: paymentStatuses.includes(order.payment_status) ? order.payment_status : "未支付",
    pickupStatus: pickupStatuses.includes(order.pickup_status) ? order.pickup_status : "待自取",
    meetLocation: order.meet_location || "",
    note: order.note || "",
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    paidAt: order.paid_at || "",
    completedAt: order.completed_at || "",
    cancelledAt: order.cancelled_at || "",
    paymentProvider: order.paymentProvider || "",
    latestPayment: order.latestPayment || null
  };
}

function toCamelPaymentRecord(payment) {
  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    orderId: payment.order_id,
    productId: payment.product_id,
    payerId: payment.payer_id || "",
    payerEmail: payment.payer_email || "",
    provider: payment.provider || "mock",
    outTradeNo: payment.out_trade_no || "",
    providerTradeNo: payment.provider_trade_no || "",
    amount: payment.amount ?? 0,
    paymentStatus: payment.payment_status || "未支付",
    payUrl: payment.pay_url || "",
    notifyPayload: payment.notify_payload || null,
    rawResponse: payment.raw_response || null,
    createdAt: payment.created_at,
    paidAt: payment.paid_at || "",
    failedAt: payment.failed_at || ""
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

function toSnakeOrder(order) {
  const currentTime = nowIso();
  return {
    product_id: order.productId,
    buyer_id: order.buyerId,
    buyer_email: order.buyerEmail || "",
    seller_id: order.sellerId,
    seller_email: order.sellerEmail || "",
    product_title: order.productTitle || "未命名商品",
    price: order.price ?? 0,
    order_status: order.orderStatus || "待支付",
    payment_status: order.paymentStatus || "未支付",
    pickup_status: order.pickupStatus || "待自取",
    meet_location: order.meetLocation || "",
    note: order.note || "",
    created_at: order.createdAt || currentTime,
    updated_at: order.updatedAt || currentTime,
    paid_at: order.paidAt || null,
    completed_at: order.completedAt || null,
    cancelled_at: order.cancelledAt || null
  };
}

function makeMockOutTradeNo(orderId) {
  const compactTime = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `QN${compactTime}${String(orderId).replace(/[^A-Za-z0-9]/g, "")}`;
}

function attachLatestPayments(orders, paymentRecords) {
  const latestByOrderId = new Map();

  for (const paymentRecord of paymentRecords) {
    const orderId = String(paymentRecord.orderId || "");
    const current = latestByOrderId.get(orderId);
    const currentTime = current ? Date.parse(current.createdAt || "") || 0 : 0;
    const nextTime = Date.parse(paymentRecord.createdAt || "") || 0;

    if (!current || nextTime >= currentTime) {
      latestByOrderId.set(orderId, paymentRecord);
    }
  }

  return orders.map((order) => {
    const latestPayment = latestByOrderId.get(String(order.id));
    if (!latestPayment) {
      return order;
    }

    return {
      ...order,
      paymentProvider: latestPayment.provider,
      paymentStatus: latestPayment.paymentStatus || order.paymentStatus,
      latestPayment
    };
  });
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

async function createOrder(user, product) {
  ensureSupabase();
  const currentTime = nowIso();
  const { data, error } = await supabase
    .from("orders")
    .insert(
      toSnakeOrder({
        productId: product.id,
        buyerId: user.id,
        buyerEmail: user.email || "",
        sellerId: product.ownerId,
        sellerEmail: product.ownerEmail || "",
        productTitle: product.title || "未命名商品",
        price: product.price,
        orderStatus: "待支付",
        paymentStatus: "未支付",
        pickupStatus: "待自取",
        meetLocation: product.location || "校内",
        createdAt: currentTime,
        updatedAt: currentTime
      })
    )
    .select("*")
    .single();
  throwIfError(error);
  return toCamelOrder(data);
}

async function listOrdersForUser(userId) {
  ensureSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  throwIfError(error);
  const orders = (data || []).map(toCamelOrder);
  if (!orders.length) {
    return orders;
  }

  const { data: paymentData, error: paymentError } = await supabase
    .from("payment_records")
    .select("*")
    .in("order_id", orders.map((order) => order.id))
    .order("created_at", { ascending: false });
  throwIfError(paymentError);

  return attachLatestPayments(orders, (paymentData || []).map(toCamelPaymentRecord));
}

async function getOrder(id) {
  ensureSupabase();
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return toCamelOrder(data);
}

async function getActiveOrderForProduct(productId) {
  ensureSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("product_id", productId)
    .in("order_status", ["待支付", "待自取"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return toCamelOrder(data);
}

async function updateOrder(id, updates) {
  ensureSupabase();
  const nextUpdates = {
    updated_at: nowIso()
  };

  if (updates.orderStatus !== undefined) nextUpdates.order_status = updates.orderStatus;
  if (updates.paymentStatus !== undefined) nextUpdates.payment_status = updates.paymentStatus;
  if (updates.pickupStatus !== undefined) nextUpdates.pickup_status = updates.pickupStatus;
  if (updates.paidAt !== undefined) nextUpdates.paid_at = updates.paidAt || null;
  if (updates.completedAt !== undefined) nextUpdates.completed_at = updates.completedAt || null;
  if (updates.cancelledAt !== undefined) nextUpdates.cancelled_at = updates.cancelledAt || null;

  const { data, error } = await supabase.from("orders").update(nextUpdates).eq("id", id).select("*").maybeSingle();
  throwIfError(error);
  return toCamelOrder(data);
}

async function createOrUpdateMockPaymentRecord(order, user, paidAt = nowIso()) {
  ensureSupabase();
  const { data: existingRecords, error: selectError } = await supabase
    .from("payment_records")
    .select("*")
    .eq("order_id", order.id)
    .eq("provider", "mock")
    .order("created_at", { ascending: false })
    .limit(1);
  throwIfError(selectError);

  const existingRecord = (existingRecords || [])[0];
  const rawResponse = {
    provider: "mock",
    action: "pay-simulate",
    result: "success",
    message: "mock payment success",
    orderId: order.id,
    productId: order.productId,
    outTradeNo: existingRecord && existingRecord.out_trade_no ? existingRecord.out_trade_no : makeMockOutTradeNo(order.id),
    paidAt
  };
  const outTradeNo = rawResponse.outTradeNo;
  const paymentPayload = {
    order_id: order.id,
    product_id: order.productId,
    payer_id: user.id,
    payer_email: user.email || "",
    provider: "mock",
    out_trade_no: outTradeNo,
    provider_trade_no: null,
    amount: order.price ?? 0,
    payment_status: "已支付",
    pay_url: null,
    notify_payload: null,
    raw_response: rawResponse,
    paid_at: paidAt,
    failed_at: null
  };

  if (existingRecord) {
    const { data, error } = await supabase
      .from("payment_records")
      .update(paymentPayload)
      .eq("id", existingRecord.id)
      .select("*")
      .single();
    throwIfError(error);
    return toCamelPaymentRecord(data);
  }

  const { data, error } = await supabase
    .from("payment_records")
    .insert({
      ...paymentPayload,
      created_at: paidAt
    })
    .select("*")
    .single();
  throwIfError(error);
  return toCamelPaymentRecord(data);
}

async function simulatePayOrder(order, user) {
  ensureSupabase();
  const currentTime = nowIso();
  const paymentRecord = await createOrUpdateMockPaymentRecord(
    order,
    {
      id: user && user.id ? user.id : order.buyerId,
      email: user && user.email ? user.email : order.buyerEmail || ""
    },
    currentTime
  );
  const updatedOrder = await updateOrder(order.id, {
    paymentStatus: "已支付",
    orderStatus: "待自取",
    paidAt: currentTime
  });

  const { error } = await supabase
    .from("products")
    .update({
      status: "已预定",
      updated_at: currentTime
    })
    .eq("id", order.productId);
  throwIfError(error);

  return {
    ...updatedOrder,
    paymentProvider: paymentRecord.provider,
    latestPayment: paymentRecord
  };
}

async function listPaymentsForUser(userId) {
  ensureSupabase();
  const { data, error } = await supabase
    .from("payment_records")
    .select("*")
    .eq("payer_id", userId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data || []).map(toCamelPaymentRecord);
}

async function listPaymentsForOrder(orderId) {
  ensureSupabase();
  const { data, error } = await supabase
    .from("payment_records")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data || []).map(toCamelPaymentRecord);
}

async function completeOrder(order, actor = {}) {
  ensureSupabase();
  const currentTime = nowIso();
  const currentProduct = await getProduct(order.productId);
  const updatedOrder = await updateOrder(order.id, {
    orderStatus: "已完成",
    pickupStatus: "已自取",
    completedAt: currentTime
  });

  const { error } = await supabase
    .from("products")
    .update({
      status: "已出",
      updated_at: currentTime
    })
    .eq("id", order.productId);
  throwIfError(error);

  if (currentProduct && currentProduct.status !== "已出") {
    const { error: transactionError } = await supabase.from("transactions").insert(
      toSnakeTransaction({
        productId: currentProduct.id,
        title: currentProduct.title,
        price: currentProduct.price,
        fromStatus: currentProduct.status,
        toStatus: "已出",
        seller: currentProduct.seller,
        location: currentProduct.location,
        actorId: actor.id,
        actorEmail: actor.email,
        createdAt: currentTime
      })
    );
    throwIfError(transactionError);
  }

  return updatedOrder;
}

async function cancelOrder(order) {
  ensureSupabase();
  const currentTime = nowIso();
  const shouldReleaseProduct = ["待支付", "待自取"].includes(order.orderStatus);
  const updatedOrder = await updateOrder(order.id, {
    orderStatus: "已取消",
    cancelledAt: currentTime
  });
  const currentProduct = await getProduct(order.productId);

  if (shouldReleaseProduct && currentProduct && currentProduct.status === "已预定") {
    const { error } = await supabase
      .from("products")
      .update({
        status: "在售",
        updated_at: currentTime
      })
      .eq("id", order.productId);
    throwIfError(error);
  }

  return updatedOrder;
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
  createOrder,
  listOrdersForUser,
  getOrder,
  getActiveOrderForProduct,
  simulatePayOrder,
  listPaymentsForUser,
  listPaymentsForOrder,
  completeOrder,
  cancelOrder,
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
