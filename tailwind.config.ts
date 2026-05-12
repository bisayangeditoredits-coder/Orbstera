import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '475px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-montserrat)', 'var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        montserrat: ['var(--font-montserrat)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'space-grotesk': ['var(--font-space-grotesk)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-lora)', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      maxWidth: {
        'prose-readable': '65ch',
      },
      colors: {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        panel: '#FAFAFA',
        primary: '#3B82F6', // Soft AI Blue
        primaryHover: '#2563EB',
        textMain: '#000000',
        textSecondary: '#666666',
        textMuted: '#999999',
        borderSubtle: '#EAEAEA',
        hoverSurface: '#F5F5F5',
        accentBlue: '#EBF5FF',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #3B82F6, #60A5FA)',
        'premium-glass': 'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%)',
      },
      boxShadow: {
        'premium': '0 20px 40px -10px rgba(0, 0, 0, 0.05), 0 10px 20px -5px rgba(0, 0, 0, 0.02)',
        'focus-ring': '0 0 0 2px #FFFFFF, 0 0 0 4px #3B82F6',
        'slide-frame': '0 30px 60px -12px rgba(0, 0, 0, 0.08), 0 18px 36px -18px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        float: 'float 6s ease-in-out infinite',
        /** Seamless loop: inner track is exactly two copies → translate -50% */
        'marquee-left': 'marquee-left var(--marquee-duration, 40s) linear infinite',
        'marquee-right': 'marquee-right var(--marquee-duration, 40s) linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'marquee-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-right': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
