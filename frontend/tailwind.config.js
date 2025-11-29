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
        // Dark Theme Colors
        background: {
          DEFAULT: '#0e0e10',
          light: '#f8f9fa',
        },
        surface: {
          DEFAULT: '#1b1b1f',
          light: '#ffffff',
        },
        'surface-hover': {
          DEFAULT: '#252529',
          light: '#f1f3f5',
        },
        text: {
          primary: {
            DEFAULT: '#e5e5e7',
            light: '#1a1a1a',
          },
          secondary: {
            DEFAULT: '#a3a3a6',
            light: '#6c757d',
          },
          tertiary: {
            DEFAULT: '#6b6b6f',
            light: '#adb5bd',
          },
        },
        accent: {
          primary: '#b08cff',
          'primary-hover': '#9b6fff',
          secondary: '#ffb347',
          'secondary-hover': '#ff9e2e',
        },
        success: '#6ce89e',
        'success-dark': '#4dd683',
        error: '#ff5c5c',
        'error-dark': '#ff3838',
        warning: '#ffb347',
        info: '#5c9aff',
        border: {
          DEFAULT: '#2a2a2e',
          light: '#dee2e6',
        },
        'border-hover': {
          DEFAULT: '#3a3a3e',
          light: '#ced4da',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(176, 140, 255, 0.3)',
        'glow-secondary': '0 0 20px rgba(255, 179, 71, 0.3)',
        'metallic': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'gradient-metallic': 'linear-gradient(135deg, #1b1b1f 0%, #0e0e10 100%)',
        'gradient-accent': 'linear-gradient(135deg, #b08cff 0%, #ffb347 100%)',
        'gradient-success': 'linear-gradient(135deg, #6ce89e 0%, #4dd683 100%)',
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
