/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf5ff',
          100: '#dbeaff',
          200: '#bedaff',
          300: '#91beff',
          400: '#5e9aff',
          500: '#0866F5',
          600: '#0866F5',
          700: '#0756d1',
          800: '#0645a8',
          900: '#053788',
          950: '#07183D',
        },
        primary: {
          DEFAULT: '#0866F5',
          50: '#edf5ff',
          100: '#dbeaff',
          200: '#bedaff',
          500: '#0866F5',
          600: '#0756d1',
          700: '#0645a8',
        },
        navy: {
          DEFAULT: '#07183D',
          dark: '#061A3D',
          text: '#10234F',
          surface: '#0B1E48',
        },
        page: '#F3F7FE',
        accentPurple: '#7047EB',
      },
      boxShadow: {
        'card': '0 2px 12px -2px rgba(8, 102, 245, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px -4px rgba(8, 102, 245, 0.12), 0 2px 6px 0 rgba(0, 0, 0, 0.04)',
        'glow-blue': '0 4px 14px 0 rgba(8, 102, 245, 0.35)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

