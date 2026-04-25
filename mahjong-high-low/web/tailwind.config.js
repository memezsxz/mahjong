const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        'c-bg':          '#f5f4f0',
        'c-surface':     '#ffffff',
        'c-indigo':      '#26287b',
        'c-indigo-dark': '#1e206a',
        'c-pink':        '#e6578f',
        'c-pink-dark':   '#cc3c74',
        'c-green':       '#3b8435',
        'c-green-dark':  '#2f6b29',
        'c-text':        '#1a1b3a',
        'c-muted':       '#8486a8',
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        mono:    ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
