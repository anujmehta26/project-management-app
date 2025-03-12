import nextPlugin from '@next/eslint-plugin-next';

export default [
  {
    plugins: {
      next: nextPlugin
    },
    extends: [
      'eslint:recommended'
    ],
    rules: {
      'next/no-html-link-for-pages': 'off',
    }
  }
];
