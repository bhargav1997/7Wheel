/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fdf4ff',
          100: '#f9e8ff',
          200: '#f3d0fe',
          300: '#e9a8fd',
          400: '#d974fa',
          500: '#c44ff0',
          600: '#a730d4',
          700: '#8b24ae',
          800: '#72218e',
          900: '#5e1f72',
        },
        gold: {
          400: '#fcd34d',
          500: '#f59e0b',
          600: '#d97706',
        },
        casino: {
          dark: '#09090f',
          card: '#111118',
          border: '#1f1f30',
          muted: '#2a2a3d',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 20px rgba(196, 79, 240, 0.4)' },
          to: { boxShadow: '0 0 40px rgba(196, 79, 240, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'casino-gradient': 'linear-gradient(135deg, #09090f 0%, #110d1a 50%, #09090f 100%)',
        'card-gradient': 'linear-gradient(145deg, #111118, #1a1a28)',
        'brand-gradient': 'linear-gradient(135deg, #c44ff0, #7c3aed)',
        'gold-gradient': 'linear-gradient(135deg, #f59e0b, #fcd34d)',
        'under-gradient': 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        'exact-gradient': 'linear-gradient(135deg, #10b981, #059669)',
        'over-gradient': 'linear-gradient(135deg, #ef4444, #b91c1c)',
      },
    },
  },
  plugins: [],
};
