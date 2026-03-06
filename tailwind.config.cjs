const path = require("path");

function glob(p) {
  return p.replace(/\\/g, "/");
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Safety net: if Vite runs from repo root, Tailwind still sees client sources.
  content: [
    glob(path.resolve(__dirname, "packages/client/index.html")),
    glob(path.resolve(__dirname, "packages/client/src/**/*.{js,jsx,ts,tsx}")),
  ],
  theme: { extend: {} },
  plugins: [],
};
