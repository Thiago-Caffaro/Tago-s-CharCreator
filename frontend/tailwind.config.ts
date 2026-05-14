import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f0f0f',
          secondary: '#1a1a1a',
          tertiary: '#242424',
          card: '#1e1e1e',
        },
        accent: {
          purple: '#9b59b6',
          amber: '#f39c12',
          blue: '#3498db',
          green: '#2ecc71',
          orange: '#e67e22',
          pink: '#e91e63',
          teal: '#1abc9c',
          yellow: '#f1c40f',
          gray: '#95a5a6',
          white: '#ecf0f1',
        },
        border: {
          subtle: '#2a2a2a',
          DEFAULT: '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
