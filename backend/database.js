// All database work for suppliers happens in this file.
// SQLite is built into Node.js, so there is no extra package to install.
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { demoSuppliers } = require("./suppliersData");

// __dirname is the backend folder, so the location is the same
// no matter which folder you start the server from.
const DATA_FOLDER = path.join(__dirname, "data");
const DATABASE_FILE = path.join(DATA_FOLDER, "ecologic.db");

// Create the data folder and open the database. A missing file is created.
fs.mkdirSync(DATA_FOLDER, { recursive: true });
const db = new DatabaseSync(DATABASE_FILE);

// If another program is using the database, wait up to 5 seconds.
db.exec("PRAGMA busy_timeout = 5000");

// A transaction makes a group of changes succeed together or not at all.
function runInTransaction(work) {
  db.exec("BEGIN IMMEDIATE");
  try {
    work();
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // SQLite may already have cancelled the transaction.
    }
    throw error;
  }
}

function insertSupplier(supplier) {
  // The ? marks keep the values separate from the database command.
  db.prepare(
    "INSERT INTO suppliers (id, name, country, material, risk, documents) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    // Demo IDs are numbers. BigInt makes SQLite save them as whole numbers
    // (a plain JavaScript number would be saved as a decimal such as 1.0).
    typeof supplier.id === "number" ? BigInt(supplier.id) : supplier.id,
    supplier.name,
    supplier.country,
    supplier.material,
    supplier.risk,
    supplier.documents
  );
}

// Runs every time the server starts, but only sets up a new database once.
// SQLite's "user_version" is the saved setup marker: 0 means not set up.
function setUpDatabase() {
  runInTransaction(() => {
    const { user_version: version } = db.prepare("PRAGMA user_version").get();

    if (version === 1) {
      return; // Already set up: keep the saved data and add nothing.
    }
    if (version !== 0) {
      throw new Error(`Unexpected database version: ${version}`);
    }

    // "position" keeps suppliers in the order they were added.
    // "id ANY" lets demo IDs stay numbers and new IDs stay text.
    db.exec(`
      CREATE TABLE suppliers (
        position  INTEGER PRIMARY KEY,
        id        ANY  NOT NULL UNIQUE,
        name      TEXT NOT NULL,
        country   TEXT NOT NULL,
        material  TEXT NOT NULL,
        risk      TEXT NOT NULL,
        documents TEXT NOT NULL
      ) STRICT
    `);
    demoSuppliers.forEach(insertSupplier);
    db.exec("PRAGMA user_version = 1");
  });
}

setUpDatabase();

// "position" is left out, so API replies look the same as before.
const SELECT_SUPPLIERS = "SELECT id, name, country, material, risk, documents FROM suppliers";

function getAllSuppliers() {
  return db.prepare(`${SELECT_SUPPLIERS} ORDER BY position`).all();
}

// IDs from web addresses are text, so IDs are compared as text.
function findSupplierById(id) {
  return db.prepare(`${SELECT_SUPPLIERS} WHERE CAST(id AS TEXT) = ?`).get(String(id));
}

function updateSupplier(id, supplier) {
  db.prepare(
    "UPDATE suppliers SET name = ?, country = ?, material = ?, risk = ?, documents = ? WHERE CAST(id AS TEXT) = ?"
  ).run(
    supplier.name,
    supplier.country,
    supplier.material,
    supplier.risk,
    supplier.documents,
    String(id)
  );
  return findSupplierById(id);
}

function deleteSupplier(id) {
  db.prepare("DELETE FROM suppliers WHERE CAST(id AS TEXT) = ?").run(String(id));
}

// Replaces ALL saved suppliers with the demo list. If any step fails,
// the transaction keeps the previous list.
function resetSuppliers() {
  runInTransaction(() => {
    db.exec("DELETE FROM suppliers");
    demoSuppliers.forEach(insertSupplier);
  });
}

module.exports = {
  getAllSuppliers,
  findSupplierById,
  insertSupplier,
  updateSupplier,
  deleteSupplier,
  resetSuppliers,
};