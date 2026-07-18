/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#f7f5ef",
        mint: "#1f9d7a",
        coral: "#df6b57",
        steel: "#3b5f7f"
      },
      boxShadow: {
        panel: "0 16px 50px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};
