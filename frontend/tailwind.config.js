/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#090a0f',
          surface: '#11131a',
          card: '#161923',
          cardHover: '#1d212e',
          panel: '#13151e',
          border: '#222634',
          borderLight: '#2e3447',
          divider: '#1c202c',
          text: '#f1f3f9',
          muted: '#8b93a7',
          subtle: '#5c6479',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#3b1c78',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'studio-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'studio': '0 4px 12px 0 rgba(0, 0, 0, 0.5), 0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'studio-lg': '0 12px 32px 0 rgba(0, 0, 0, 0.6), 0 2px 6px 0 rgba(0, 0, 0, 0.4)',
        'accent-glow': '0 0 20px -5px rgba(139, 92, 246, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

