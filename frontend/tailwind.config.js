/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#185FA5', light: '#E6F1FB', dark: '#0C447C' },
      },
    },
  },
  plugins: [],
};
