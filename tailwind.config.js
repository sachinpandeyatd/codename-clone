/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
       colors: {
        'codenames-red': '#f44336',
        'codenames-blue': '#2196f3',
        'codenames-neutral': '#f5deb3', // Beige/Tan
        'codenames-assassin': '#212121', // Dark Gray/Black
        'codenames-covered': '#e0e0e0', // Light Gray

        // Add hint colors (adjust shades as desired)
        'red-200': '#fecaca',     // Example light red
        'blue-200': '#bfdbfe',    // Example light blue
        'yellow-100': '#fef9c3', // Example light yellow/beige
        'gray-400': '#9ca3af',    // Example medium gray for assassin hint
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')
  ],
}