/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Palatino Linotype', 'Book Antiqua', 'Palatino', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        soul: {
          bg: '#070709',
          surface: 'rgba(255,255,255,0.025)',
          gold: '#B8860B',
          'gold-light': '#D4A017',
          teal: '#2E6B5E',
          violet: '#5B3A8C',
          crimson: '#8B3A3A',
          text: '#DDD5C4',
          muted: 'rgba(221,213,196,0.4)',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease both',
        'pulse-glow': 'pulseGlow 2.5s ease infinite',
        'bounce-dot': 'bounceDot 1.2s ease infinite',
      },
      keyframes: {
        fadeUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { opacity: '0.3', transform: 'scale(1)' }, '50%': { opacity: '0.8', transform: 'scale(1.08)' } },
        bounceDot: { '0%,100%': { transform: 'translateY(0)', opacity: '0.4' }, '50%': { transform: 'translateY(-5px)', opacity: '0.9' } },
      }
    },
  },
  plugins: [],
}
