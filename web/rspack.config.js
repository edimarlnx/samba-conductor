// eslint-disable-next-line import/no-unresolved
import { defineConfig } from '@meteorjs/rspack';

/**
 * SWC plugin configuration to remove data-e2e attributes.
 *
 * Environment variable REMOVE_E2E_ATTRS:
 * - Set to 'true' to remove data-e2e attributes from the build
 * - Useful for production deployments where test selectors aren't needed
 * - Leave unset or 'false' for development, e2e testing, or staging environments
 */
function shouldRemoveE2eAttributes() {
  return process.env.REMOVE_E2E_ATTRS === 'true';
}

function getSwcPlugins() {
  if (!shouldRemoveE2eAttributes()) return [];
  return [
    [
      '@swc/plugin-react-remove-properties',
      { properties: ['^data-e2e$'] },
    ],
  ];
}

function getSwcRule() {
  if (!shouldRemoveE2eAttributes()) return [];
  return [
    {
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      loader: 'builtin:swc-loader',
      options: {
        jsc: {
          parser: {
            syntax: 'ecmascript',
            jsx: true,
          },
          experimental: {
            plugins: getSwcPlugins(),
          },
        },
      },
      type: 'javascript/auto',
    },
  ];
}

// eslint-disable-next-line import/no-default-export
export default defineConfig((Meteor) => ({
  externals: [/^react-router-dom/],
  ...(Meteor.isClient && {
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['postcss-loader'],
          type: 'css',
        },
        // SWC rule to remove data-e2e attributes (only when REMOVE_E2E_ATTRS=true)
        ...getSwcRule(),
      ],
    },
  }),
}));
