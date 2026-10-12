/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      colors: {
        slate: {
          400: '#64748b', // Boosts text-slate-400 contrast on white/bg-slate-50 from 2.4:1 to 4.6:1 (WCAG AA)
        },
        gray: {
          400: '#6b7280', // Boosts text-gray-400 contrast on white from 2.1:1 to 4.5:1 (WCAG AA)
        },
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38aaf7',
          500: '#0e8ee9',
          600: '#0270c7',
          700: '#0359a1',
          800: '#074b84',
          900: '#0c3f6e',
          950: '#082849',
        },
        status: {
          pending: '#64748b',
          progress: '#0284c7',
          resolved: '#059669',
          escalated: '#d97706',
          critical: '#dc2626',
        }
      },
    },
  },
  plugins: [],
}
