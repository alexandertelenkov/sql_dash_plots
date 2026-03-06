const path = require("path");

module.exports = {
  plugins: {
    // Safety net: ensure Tailwind runs even if Vite is started from repo root.
    tailwindcss: { config: path.join(__dirname, "tailwind.config.cjs") },
    autoprefixer: {},
  },
};
