/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEF4FF',
          100: '#D9E6FF',
          200: '#B3CDFF',
          300: '#7FABFF',
          400: '#4285F4',
          500: '#1A5CE8',
          600: '#0B4FCC',
          700: '#083DA0',
          800: '#062D78',
          900: '#041F54',
        },
        accent: {
          50:  '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA6C08',
          700: '#C2560A',
          800: '#9A400D',
          900: '#7C3108',
        },
        warm: {
          50:  '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
        },
        success: '#16A34A',
        warning: '#D97706',
        danger:  '#DC2626',
        surface: '#FFFFFF',
        bg:      '#F0F4FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(11,79,204,0.08)',
        nav:  '0 2px 16px 0 rgba(11,79,204,0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
