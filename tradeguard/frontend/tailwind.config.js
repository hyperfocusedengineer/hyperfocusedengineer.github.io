/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          surface: '#12121a',
          elevated: '#1a1a28',
        },
        border: {
          DEFAULT: '#1e1e2e',
          light: '#2a2a3e',
        },
        profit: '#00d4aa',
        loss: '#ff4757',
        warning: '#ffa502',
        accent: '#5865f2',
        text: {
          primary: '#e8e8ef',
          muted: '#6b6b80',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
