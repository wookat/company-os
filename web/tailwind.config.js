/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF4FF',
          100: '#DFEAFF',
          200: '#C3D7FF',
          300: '#96BAFF',
          400: '#649AFF',
          500: '#3D7FFF',
          600: '#2E6BEC',
          700: '#2456C7',
          800: '#1E46A0',
          900: '#1B3B7F',
        },
        page: '#F4F6FA',
        ink: {
          DEFAULT: '#1E2330',
          2: '#5A6472',
          3: '#6B7480',
        },
        ok: {
          50: '#E6F7F1',
          100: '#C2EDDD',
          500: '#00B578',
          600: '#009A66',
          700: '#007D54',
        },
        bad: {
          50: '#FFEDED',
          100: '#FFD6D7',
          500: '#FF4D4F',
          600: '#E5393B',
          700: '#C22B2D',
        },
        warn: {
          50: '#FFF6E5',
          100: '#FFE9C2',
          500: '#FFA716',
          600: '#E58F00',
          700: '#BF7700',
        },
        streak: {
          50: '#FFF0E6',
          100: '#FFDCC7',
          500: '#FF7A2F',
          600: '#E86518',
          700: '#C25212',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)',
      },
    },
  },
  plugins: [],
}
