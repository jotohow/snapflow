const path = require('path');

module.exports = [
  // Extension bundle (Node.js target)
  {
    target: 'node',
    mode: 'production',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
    },
    externals: {
      vscode: 'commonjs vscode',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: [/node_modules/, /src\/webview/],
          use: [
            {
              loader: 'ts-loader',
              options: {
                compilerOptions: {
                  module: 'es6',
                },
              },
            },
          ],
        },
      ],
    },
    devtool: 'nosources-source-map',
  },
  // Webview bundle (Web target)
  {
    target: 'web',
    mode: 'production',
    entry: './src/webview/index.tsx',
    output: {
      path: path.resolve(__dirname, 'out', 'webview'),
      filename: 'webview.js',
      libraryTarget: 'umd',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [require('tailwindcss'), require('autoprefixer')],
                },
              },
            },
          ],
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
      ],
    },
    externals: {
      vscode: 'commonjs vscode',
    },
    devtool: 'inline-source-map',
  },
];
