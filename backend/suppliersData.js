// FICTIONAL DEMONSTRATION DATA ONLY.
// These are the same eight suppliers as in frontend/src/data.js.
// Object.freeze protects the originals, so "reset" can always restore them.
const demoSuppliers = Object.freeze(
  [
    { id: 1, name: "Demo GreenSteel Works", country: "India", material: "Steel", risk: "Medium", documents: "Partial" },
    { id: 2, name: "Demo Nordic Timber", country: "Sweden", material: "Timber", risk: "Low", documents: "Complete" },
    { id: 3, name: "Demo Pacific Aluminium", country: "China", material: "Aluminium", risk: "High", documents: "Missing" },
    { id: 4, name: "Demo Andes Coffee Co-op", country: "Colombia", material: "Coffee", risk: "Medium", documents: "Partial" },
    { id: 5, name: "Demo Rhine Polymers", country: "Germany", material: "Plastic", risk: "Low", documents: "Complete" },
    { id: 6, name: "Demo Delta Textiles", country: "Bangladesh", material: "Cotton", risk: "High", documents: "Partial" },
    { id: 7, name: "Demo Atlas Cement", country: "Turkey", material: "Cement", risk: "Medium", documents: "Complete" },
    { id: 8, name: "Demo Borneo Rubber", country: "Indonesia", material: "Rubber", risk: "High", documents: "Missing" },
  ].map(Object.freeze)
);

module.exports = { demoSuppliers };
