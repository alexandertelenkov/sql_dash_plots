const path = require("path");

function glob(p) {
  // Tailwind uses glob patterns; on Windows we must normalize backslashes to forward slashes.
  return p.replace(/\\/g, "/");
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Works regardless of process CWD (vite-express starts Vite from the server)
  content: [
    glob(path.resolve(__dirname, "index.html")),
    glob(path.resolve(__dirname, "src/**/*.{js,jsx,ts,tsx}")),
  ],
  theme: { extend: {} },
  plugins: [],
};
