/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Midnight Chrome — dark-first
        background: {
          DEFAULT: '#080c18',
          light: '#eef1f8',
        },
        surface: {
          DEFAULT: '#0e1530',
          light: '#ffffff',
        },
        'surface-hover': {
          DEFAULT: '#131c35',
          light: '#e8ecf5',
        },
        text: {
          primary: {
            DEFAULT: '#c0c8e0',
            light: '#0e1530',
          },
          secondary: {
            DEFAULT: '#7888b0',
            light: '#3a4a70',
          },
          tertiary: {
            DEFAULT: '#3a4a70',
            light: '#8090b8',
          },
        },
        accent: {
          primary: '#9aaad0',
          'primary-hover': '#b0bce0',
          secondary: '#50c88c',
          'secondary-hover': '#3ab87c',
        },
        success: '#50c88c',
        'success-dark': '#3ab87c',
        error: '#e05570',
        'error-dark': '#c43858',
        warning: '#d4a040',
        info: '#5080d0',
        border: {
          DEFAULT: '#1a2240',
          light: '#cdd4e8',
        },
        'border-hover': {
          DEFAULT: '#2a3860',
          light: '#adb8d0',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(154, 170, 208, 0.25)',
        'glow-secondary': '0 0 20px rgba(80, 200, 140, 0.25)',
        'metallic': '0 4px 24px rgba(0, 0, 0, 0.5)',
        'card': '0 2px 16px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-metallic': 'linear-gradient(135deg, #0e1530 0%, #080c18 100%)',
        'gradient-accent': 'linear-gradient(135deg, #9aaad0 0%, #50c88c 100%)',
        'gradient-success': 'linear-gradient(135deg, #50c88c 0%, #3ab87c 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
