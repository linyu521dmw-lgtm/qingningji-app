function nowIso() {
  return new Date().toISOString();
}

function throwIfError(error) {
  if (error) {
    throw new Error(error.message || "Supabase operation failed");
  }
}

const ALIPAY_SANDBOX_ENV_KEYS = [
  "ALIPAY_APP_ID",
  "ALIPAY_PRIVATE_KEY",
  "ALIPAY_PUBLIC_KEY",
  "ALIPAY_GATEWAY",
  "ALIPAY_NOTIFY_URL",
  "ALIPAY_RETURN_URL"
];

function createProviderError(message, statusCode = 400, details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isPaymentProviderError = true;
  Object.assign(error, details);
  return error;
}

function makeMockOutTradeNo(orderId) {
  const compactTime = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const safeOrderId = String(orderId).replace(/[^A-Za-z0-9]/g, "");
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `QN${compactTime}${safeOrderId}${randomSuffix}`;
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

function createProviderPlaceholder(provider, message, params = {}) {
  const order = params.order || {};
  const user = params.user || {};

  return {
    id: "",
    orderId: order.id || "",
    productId: order.productId || "",
    payerId: user.id || order.buyerId || "",
    payerEmail: user.email || order.buyerEmail || "",
    provider,
    outTradeNo: "",
    providerTradeNo: "",
    amount: order.price ?? 0,
    paymentStatus: "待支付",
    payUrl: "",
    message,
    notifyPayload: null,
    rawResponse: {
      provider,
      success: false,
      message
    },
    createdAt: "",
    paidAt: "",
    failedAt: ""
  };
}

function getEnvValue(key) {
  return String(process.env[key] || "").trim();
}

function getAlipaySandboxConfig() {
  return {
    appId: getEnvValue("ALIPAY_APP_ID"),
    privateKeyConfigured: Boolean(getEnvValue("ALIPAY_PRIVATE_KEY")),
    publicKeyConfigured: Boolean(getEnvValue("ALIPAY_PUBLIC_KEY")),
    gateway: getEnvValue("ALIPAY_GATEWAY"),
    notifyUrl: getEnvValue("ALIPAY_NOTIFY_URL"),
    returnUrl: getEnvValue("ALIPAY_RETURN_URL")
  };
}

function checkAlipaySandboxConfig() {
  const missing = ALIPAY_SANDBOX_ENV_KEYS.filter((key) => !getEnvValue(key));

  return {
    ready: missing.length === 0,
    missing
  };
}

async function createMockPaymentRecord(params = {}) {
  const { supabase, order, user } = params;
  const paidAt = params.paidAt || nowIso();

  if (!supabase) {
    throw new Error("Supabase client is required");
  }

  if (!order || !order.id || !order.productId) {
    throw new Error("Order is required");
  }

  if (!user || !user.id) {
    throw new Error("Payer is required");
  }

  const { data: existingRecords, error: selectError } = await supabase
    .from("payment_records")
    .select("*")
    .eq("order_id", order.id)
    .eq("provider", "mock")
    .order("created_at", { ascending: false })
    .limit(1);
  throwIfError(selectError);

  const existingRecord = (existingRecords || [])[0];
  if (existingRecord && existingRecord.payment_status === "已支付") {
    return toCamelPaymentRecord(existingRecord);
  }

  const outTradeNo = existingRecord && existingRecord.out_trade_no
    ? existingRecord.out_trade_no
    : makeMockOutTradeNo(order.id);
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
    raw_response: {
      provider: "mock",
      action: "pay-simulate",
      success: true,
      orderId: order.id,
      productId: order.productId,
      outTradeNo,
      paidAt
    },
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

function createAlipayPaymentPlaceholder(params = {}) {
  const configStatus = checkAlipaySandboxConfig();
  if (!configStatus.ready) {
    throw createProviderError("支付宝沙箱配置未完成", 400, {
      missing: configStatus.missing
    });
  }

  const placeholder = createProviderPlaceholder(
    "alipay",
    "支付宝沙箱支付接口尚未正式接入",
    params
  );

  return {
    ...placeholder,
    rawResponse: {
      ...placeholder.rawResponse,
      mode: "sandbox",
      configReady: true
    }
  };
}

function createWechatPaymentPlaceholder(params = {}) {
  return createProviderPlaceholder("wechat", "wechat provider not implemented", params);
}

async function createPaymentByProvider(provider, params = {}) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();

  if (normalizedProvider === "mock") {
    return createMockPaymentRecord(params);
  }

  if (normalizedProvider === "alipay") {
    const placeholder = createAlipayPaymentPlaceholder(params);
    throw createProviderError("支付宝沙箱支付暂未正式接入", 501, {
      payment: placeholder
    });
  }

  if (normalizedProvider === "wechat") {
    throw createProviderError("真实支付暂未接入", 400);
  }

  throw createProviderError("未知支付方式", 400);
}

module.exports = {
  getAlipaySandboxConfig,
  checkAlipaySandboxConfig,
  createMockPaymentRecord,
  createAlipayPaymentPlaceholder,
  createWechatPaymentPlaceholder,
  createPaymentByProvider
};
