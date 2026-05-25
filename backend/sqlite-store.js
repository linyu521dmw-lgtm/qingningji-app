const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "qingningji.db");

const PYTHON_SCRIPT = String.raw`
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone

with open(sys.argv[1], "r", encoding="utf-8") as payload_file:
    payload = json.load(payload_file)
db_file = payload["dbFile"]
action = payload["action"]
params = payload.get("params") or {}

PRODUCT_STATUSES = {"在售", "已预定", "已出"}
DEFAULT_PRODUCT_STATUS = "在售"

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def connect():
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    return conn

def normalize_product(product):
    current_time = now_iso()
    return {
        "id": product.get("id"),
        "title": product.get("title") or product.get("name") or product.get("productName") or "未命名商品",
        "price": product.get("price", product.get("amount", 0)),
        "category": product.get("category") or "其他",
        "location": product.get("location") or product.get("place") or product.get("campus") or product.get("address") or "校内",
        "seller": product.get("seller") or product.get("sellerName") or product.get("user") or product.get("username") or product.get("owner") or "匿名同学",
        "status": product.get("status") if product.get("status") in PRODUCT_STATUSES else DEFAULT_PRODUCT_STATUS,
        "imageData": product.get("imageData") if isinstance(product.get("imageData"), str) else "",
        "createdAt": product.get("createdAt") or current_time,
        "updatedAt": product.get("updatedAt") or current_time,
    }

def product_row(row):
    if row is None:
        return None
    return {
        "id": row["id"],
        "title": row["title"],
        "price": row["price"],
        "category": row["category"],
        "location": row["location"],
        "seller": row["seller"],
        "status": row["status"] if row["status"] in PRODUCT_STATUSES else DEFAULT_PRODUCT_STATUS,
        "imageData": row["imageData"] or "",
        "ownerId": "",
        "ownerEmail": "",
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
    }

def transaction_row(row):
    if row is None:
        return None
    return {
        "id": row["id"],
        "productId": row["productId"],
        "title": row["title"],
        "price": row["price"],
        "fromStatus": row["fromStatus"],
        "toStatus": row["toStatus"],
        "seller": row["seller"],
        "location": row["location"],
        "actorId": "",
        "actorEmail": "",
        "createdAt": row["createdAt"],
    }

def create_schema(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            title TEXT,
            price REAL,
            category TEXT,
            location TEXT,
            seller TEXT,
            status TEXT,
            imageData TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY,
            productId INTEGER,
            title TEXT,
            price REAL,
            fromStatus TEXT,
            toStatus TEXT,
            seller TEXT,
            location TEXT,
            createdAt TEXT
        )
    """)
    conn.commit()

def insert_products_from_file(conn, file_path):
    if not file_path or not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as handle:
        products = json.load(handle)
    if not isinstance(products, list):
        raise ValueError("products data must contain an array")
    for raw_product in products:
        product = normalize_product(raw_product)
        conn.execute("""
            INSERT OR IGNORE INTO products
            (id, title, price, category, location, seller, status, imageData, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            product["id"], product["title"], product["price"], product["category"], product["location"],
            product["seller"], product["status"], product["imageData"], product["createdAt"], product["updatedAt"]
        ))
    conn.commit()

def insert_transactions_from_file(conn, file_path):
    if not file_path or not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as handle:
        transactions = json.load(handle)
    if not isinstance(transactions, list):
        raise ValueError("transactions data must contain an array")
    for transaction in transactions:
        conn.execute("""
            INSERT OR IGNORE INTO transactions
            (id, productId, title, price, fromStatus, toStatus, seller, location, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            transaction.get("id"), transaction.get("productId"), transaction.get("title") or "未命名商品",
            transaction.get("price", 0), transaction.get("fromStatus") or DEFAULT_PRODUCT_STATUS,
            transaction.get("toStatus") or DEFAULT_PRODUCT_STATUS, transaction.get("seller") or "匿名同学",
            transaction.get("location") or "校内", transaction.get("createdAt") or now_iso()
        ))
    conn.commit()

def all_products(conn):
    return [product_row(row) for row in conn.execute("SELECT * FROM products ORDER BY id").fetchall()]

def all_transactions(conn):
    return [transaction_row(row) for row in conn.execute("SELECT * FROM transactions ORDER BY id").fetchall()]

conn = connect()
try:
    create_schema(conn)

    if action == "init":
        insert_products_from_file(conn, params.get("productsFile"))
        insert_transactions_from_file(conn, params.get("transactionsFile"))
        result = {
            "productCount": conn.execute("SELECT COUNT(*) AS count FROM products").fetchone()["count"],
            "transactionCount": conn.execute("SELECT COUNT(*) AS count FROM transactions").fetchone()["count"],
        }

    elif action == "listProducts":
        result = all_products(conn)

    elif action == "getProduct":
        row = conn.execute("SELECT * FROM products WHERE id = ?", (params["id"],)).fetchone()
        result = product_row(row)

    elif action == "createProduct":
        current_time = now_iso()
        product = normalize_product({
            **params,
            "status": DEFAULT_PRODUCT_STATUS,
            "createdAt": current_time,
            "updatedAt": current_time,
        })
        cursor = conn.execute("""
            INSERT INTO products (title, price, category, location, seller, status, imageData, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            product["title"], product["price"], product["category"], product["location"], product["seller"],
            product["status"], product["imageData"], product["createdAt"], product["updatedAt"]
        ))
        conn.commit()
        row = conn.execute("SELECT * FROM products WHERE id = ?", (cursor.lastrowid,)).fetchone()
        result = product_row(row)

    elif action == "updateProduct":
        product_id = params["id"]
        row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if row is None:
            result = None
        else:
            allowed = ["title", "price", "category", "location", "seller", "status"]
            updates = []
            values = []
            for field in allowed:
                if field in params:
                    updates.append(f"{field} = ?")
                    values.append(params[field])
            if updates:
                updates.append("updatedAt = ?")
                values.append(now_iso())
                values.append(product_id)
                conn.execute(f"UPDATE products SET {', '.join(updates)} WHERE id = ?", values)
                conn.commit()
            result = product_row(conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone())

    elif action == "updateProductStatus":
        product_id = params["id"]
        next_status = params["status"]
        row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if row is None:
            result = None
        else:
            product = product_row(row)
            from_status = product["status"]
            current_time = now_iso()
            conn.execute("UPDATE products SET status = ?, updatedAt = ? WHERE id = ?", (next_status, current_time, product_id))
            if from_status != next_status:
                conn.execute("""
                    INSERT INTO transactions (productId, title, price, fromStatus, toStatus, seller, location, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    product["id"], product["title"], product["price"], from_status, next_status,
                    product["seller"], product["location"], current_time
                ))
            conn.commit()
            result = product_row(conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone())

    elif action == "deleteProduct":
        product_id = params["id"]
        row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if row is None:
            result = None
        else:
            product = product_row(row)
            conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
            conn.commit()
            result = product

    elif action == "listTransactions":
        result = all_transactions(conn)

    elif action == "resetProducts":
        conn.execute("DELETE FROM products")
        conn.execute("DELETE FROM transactions")
        conn.commit()
        insert_products_from_file(conn, params.get("productsFile"))
        result = all_products(conn)

    else:
        raise ValueError(f"unknown action: {action}")

    print(json.dumps({"ok": True, "result": result}, ensure_ascii=False))
except Exception as error:
    print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
    sys.exit(1)
finally:
    conn.close()
`;

function runDatabaseAction(action, params = {}) {
  const payloadFile = path.join(
    os.tmpdir(),
    `qingningji-sqlite-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );
  fs.writeFileSync(payloadFile, JSON.stringify({ dbFile: DB_FILE, action, params }), "utf-8");

  const result = spawnSync("python3", ["-c", PYTHON_SCRIPT, payloadFile], {
    encoding: "utf-8",
    maxBuffer: 20 * 1024 * 1024
  });

  fs.unlinkSync(payloadFile);

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "SQLite operation failed").trim());
  }

  const payload = JSON.parse(result.stdout || "{}");
  if (!payload.ok) {
    throw new Error(payload.error || "SQLite operation failed");
  }
  return payload.result;
}

function initializeDatabase(productsFile, transactionsFile) {
  return runDatabaseAction("init", { productsFile, transactionsFile });
}

module.exports = {
  DB_FILE,
  initializeDatabase,
  listProducts: () => runDatabaseAction("listProducts"),
  getProduct: (id) => runDatabaseAction("getProduct", { id }),
  createProduct: (product) => runDatabaseAction("createProduct", product),
  updateProduct: (id, product) => runDatabaseAction("updateProduct", { id, ...product }),
  updateProductStatus: (id, status) => runDatabaseAction("updateProductStatus", { id, status }),
  deleteProduct: (id) => runDatabaseAction("deleteProduct", { id }),
  listTransactions: () => runDatabaseAction("listTransactions"),
  resetProducts: (productsFile) => runDatabaseAction("resetProducts", { productsFile })
};
