const express = require("express");
const cors = require("cors");
const supplierRoutes = require("./supplierRoutes");

const app = express();
const PORT = 5000;

// Allow communication with the React frontend
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174"
  ]
}));

// Allow the server to receive JSON data (small requests only)
app.use(express.json({ limit: "10kb" }));

// Welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Eco-Logic Backend!",
    status: "Server is running successfully"
  });
});

// API health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Eco-Logic API is connected!"
  });
});

// Supplier endpoints: every address in supplierRoutes starts with /api/suppliers
app.use("/api/suppliers", supplierRoutes);

// Runs when no route above matched the request
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found." });
});

// Central error handler. It needs all four parameters and must come last.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "The request contains invalid JSON." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "The request is too large." });
  }

  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) {
    console.error(error); // Details stay in the terminal and are not sent to the browser.
  }
  res.status(status).json({
    success: false,
    message: status === 500 ? "Something went wrong on the server." : "The request could not be processed.",
  });
});

// Start server
app.listen(PORT, (error) => {
  if (error) {
    throw error; // For example: port 5000 is already in use.
  }
  console.log(`Eco-Logic backend running at http://localhost:${PORT}`);
});

