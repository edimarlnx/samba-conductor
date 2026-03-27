/**
 * Babel configuration for Meteor projects.
 *
 * Environment variable REMOVE_E2E_ATTRS:
 * - Set to 'true' to remove data-e2e attributes from the build
 * - Useful for production deployments where test selectors aren't needed
 * - Leave unset or 'false' for development, e2e testing, or staging environments
 */
function shouldRemoveE2eAttributes() {
  return process.env.REMOVE_E2E_ATTRS === 'true';
}

module.exports = {
  plugins: ['babel-plugin-react-compiler'],
  overrides: [
    {
      test: /\.(js|jsx)$/,
      plugins: shouldRemoveE2eAttributes()
        ? [['react-remove-properties', { properties: ['data-e2e'] }]]
        : [],
    },
  ],
};
