/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/webview/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // VS Code theme colors
        'vscode-bg': 'var(--vscode-editor-background)',
        'vscode-fg': 'var(--vscode-foreground)',
        'vscode-border': 'var(--vscode-panel-border)',
        'vscode-accent': 'var(--vscode-textLink-foreground)',
        'vscode-muted': 'var(--vscode-descriptionForeground)',
      },
    },
  },
  plugins: [],
};
