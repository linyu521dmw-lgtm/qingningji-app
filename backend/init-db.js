const path = require("path");
const store = require("./sqlite-store");

const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");

try {
  const result = store.initializeDatabase(PRODUCTS_FILE, TRANSACTIONS_FILE);
  console.log(`SQLite database ready: ${store.DB_FILE}`);
  console.log(`products: ${result.productCount}`);
  console.log(`transactions: ${result.transactionCount}`);
} catch (error) {
  console.error(`Failed to initialize SQLite database: ${error.message}`);
  process.exit(1);
}
