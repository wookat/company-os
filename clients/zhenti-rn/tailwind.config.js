/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#3D7FFF', dark: '#649AFF' },
        bgl: '#F4F6FA',
        bgd: '#0F1420',
        cardd: '#1A2130',
        rose: { DEFAULT: '#F43F5E' },
        ok: { DEFAULT: '#00B578', dark: '#34D399' },
        warn: { DEFAULT: '#F59E0B' }
      }
    }
  },
  plugins: []
}
