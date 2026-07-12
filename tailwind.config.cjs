/** @type {import('tailwindcss').Config} */
// Tokens from the Overhead Brand Kit (Claude Design). Dark-first, one electric-indigo accent.
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{vue,js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4E5BF6',
          hover: '#3D49E0',
          tint: '#EEF0FF',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#16171D',
        },
        canvas: {
          light: '#FAFAFB',
          dark: '#0C0D11',
        },
        hairline: {
          light: '#E7E8EC',
          dark: '#26272F',
        },
        ink: {
          light: '#141519',
          dark: '#F4F5F7',
        },
        muted: {
          light: '#6B6E7A',
          dark: '#9A9DAB',
        },
        success: '#30A46C',
        warning: '#F5A623',
        danger: '#E5484D',
      },
      fontFamily: {
        // Uses Inter / JetBrains Mono if installed, else system fallbacks.
        // No external font load — preserves the zero-network trust guarantee.
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
