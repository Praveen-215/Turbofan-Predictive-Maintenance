/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#111827',
          850: '#0f172a',
          900: '#0b0f19',
          950: '#070a12',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        border: {
          subtle: '#1e293b',
          muted: '#334155',
        }
      },
    },
  },
  plugins: [],
}
