const express = require("express");
const { randomUUID } = require("crypto");
const { demoSuppliers } = require("./suppliersData");

const router = express.Router();

// The allowed values must match the dropdowns in the React app.
const ALLOWED_VALUES = {
  material: ["Steel", "Aluminium", "Cement", "Plastic", "Timber", "Cotton", "Rubber", "Coffee", "Paper", "Glass", "Other"],
  risk: ["High", "Medium", "Low"],
  documents: ["Complete", "Partial", "Missing"],
};
const MAX_LENGTH = { name: 80, country: 60 };
const MAX_SUPPLIERS = 500; // Stops the in-memory list from growing without limit.

// Makes a separate copy, so changing the list never changes the originals.
const copyDemoSuppliers = () => demoSuppliers.map((supplier) => ({ ...supplier }));

// IN-MEMORY STORAGE: this list is lost whenever the server stops or restarts.
let suppliers = copyDemoSuppliers();

// Checks the data sent by the user. Returns the cleaned data and any errors.
function validateSupplier(body) {
  const errors = [];
  const supplier = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { supplier, errors: ["Send the supplier as a JSON object."] };
  }

  // Only the fields listed here are copied. Anything else (such as an id) is ignored.
  for (const field of ["name", "country", "material", "risk", "documents"]) {
    const value = typeof body[field] === "string" ? body[field].trim() : "";

    if (!value) {
      errors.push(`${field} is required and must be text.`);
    } else if (MAX_LENGTH[field] && value.length > MAX_LENGTH[field]) {
      errors.push(`${field} must be ${MAX_LENGTH[field]} characters or fewer.`);
    } else if (ALLOWED_VALUES[field] && !ALLOWED_VALUES[field].includes(value)) {
      errors.push(`${field} must be one of: ${ALLOWED_VALUES[field].join(", ")}.`);
    }

    supplier[field] = value;
  }

  return { supplier, errors };
}

// Two suppliers are duplicates if both name and country match (ignoring capitals).
function isDuplicate(candidate, ignoreId) {
  return suppliers.some(
    (s) =>
      s.id !== ignoreId &&
      s.name.toLowerCase() === candidate.name.toLowerCase() &&
      s.country.toLowerCase() === candidate.country.toLowerCase()
  );
}

// IDs in the web address are always text, so compare both as text.
const findIndexById = (id) => suppliers.findIndex((s) => String(s.id) === id);

function sendError(res, status, message, errors) {
  return res.status(status).json({ success: false, message, errors });
}

// GET /api/suppliers : retrieve all suppliers
router.get("/", (req, res) => {
  res.json({ success: true, data: suppliers });
});

// POST /api/suppliers/reset : restore the eight demo suppliers
router.post("/reset", (req, res) => {
  if (req.body?.confirm !== true) {
    return sendError(res, 400, 'To reset, send JSON: { "confirm": true }');
  }
  suppliers = copyDemoSuppliers();
  res.json({ success: true, data: suppliers });
});

// POST /api/suppliers : add a supplier
router.post("/", (req, res) => {
  const { supplier, errors } = validateSupplier(req.body);

  if (errors.length) {
    return sendError(res, 400, "Please check the supplier details.", errors);
  }
  if (isDuplicate(supplier)) {
    return sendError(res, 409, "This supplier is already in the list.");
  }
  if (suppliers.length >= MAX_SUPPLIERS) {
    return sendError(res, 409, "The demo supplier list is full.");
  }

  // A random ID is never reused, even after the server restarts.
  const newSupplier = { id: randomUUID(), ...supplier };
  suppliers.push(newSupplier);
  res.status(201).json({ success: true, data: newSupplier });
});

// PUT /api/suppliers/:id : replace a supplier's details (all fields required)
router.put("/:id", (req, res) => {
  const index = findIndexById(req.params.id);
  if (index === -1) {
    return sendError(res, 404, "Supplier not found.");
  }

  const { supplier, errors } = validateSupplier(req.body);
  if (errors.length) {
    return sendError(res, 400, "Please check the supplier details.", errors);
  }
  if (isDuplicate(supplier, suppliers[index].id)) {
    return sendError(res, 409, "Another supplier already has this name and country.");
  }

  suppliers[index] = { id: suppliers[index].id, ...supplier };
  res.json({ success: true, data: suppliers[index] });
});

// DELETE /api/suppliers/:id : remove a supplier
router.delete("/:id", (req, res) => {
  const index = findIndexById(req.params.id);
  if (index === -1) {
    return sendError(res, 404, "Supplier not found.");
  }

  const [removed] = suppliers.splice(index, 1);
  res.json({ success: true, data: removed });
});

module.exports = router;
