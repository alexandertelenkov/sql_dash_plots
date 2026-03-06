const path = require("path");

module.exports = {
  plugins: {
    // Pin the Tailwind config location so it works even when the process CWD is the repo root
    tailwindcss: { config: path.join(__dirname, "tailwind.config.cjs") },
    autoprefixer: {},
  },
};
