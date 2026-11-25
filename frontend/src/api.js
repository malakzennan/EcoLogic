const API_BASE_URL = "http://localhost:5000";

export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    if (!response.ok) {
      throw new Error("Backend request failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Eco-Logic API connection error:", error);
    throw error;
  }
}

/* ---------- Suppliers ---------- */

// Shared helper: sends a request and turns every failure into a readable Error.
// error.status is the HTTP status code, or 0 if no readable reply arrived.
async function request(path, { method = "GET", body } = {}) {
  let response;
  let result;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000), // Give up after 8 seconds.
    });
    result = await response.json();
  } catch (cause) {
    const error = new Error(
      response
        ? "The backend sent a reply the app could not read."
        : "No reply from the backend. Check that it is running, then refresh the supplier list.",
      { cause }
    );
    error.status = 0;
    throw error;
  }

  if (!response.ok || !result.success) {
    const details = result.errors?.join(" ");
    const error = new Error([result.message || "The request failed.", details].filter(Boolean).join(" "));
    error.status = response.status;
    throw error;
  }

  return result.data;
}

const supplierPath = (id) => `/api/suppliers/${encodeURIComponent(id)}`;

export const getSuppliers = () => request("/api/suppliers");

export const createSupplier = (supplier) =>
  request("/api/suppliers", { method: "POST", body: supplier });

export const updateSupplier = (id, supplier) =>
  request(supplierPath(id), { method: "PUT", body: supplier });

export const deleteSupplier = (id) => request(supplierPath(id), { method: "DELETE" });

export const resetSuppliers = () =>
  request("/api/suppliers/reset", { method: "POST", body: { confirm: true } });
