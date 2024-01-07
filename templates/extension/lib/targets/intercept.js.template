const componentOverrideMapping = require('./componentOverrideMapping');
const moduleOverridePlugin = require('./moduleOverrideWebpackPlugin');
/**
 * Custom intercept file for the extension
 * By default you can only use target of @magento/pwa-buildpack.
 *
 * If do want extend @magento/peregrine or @magento/venia-ui
 * you should add them to peerDependencies to your package.json
 *
 * If you want to add overwrites for @magento/venia-ui components you can use
 * moduleOverrideWebpackPlugin and componentOverrideMapping
 */
module.exports = targets => {
    targets.of('@magento/pwa-buildpack').specialFeatures.tap(flags => {
        flags[targets.name] = {
            cssModules: true,
            esModules: true,
            graphqlQueries: true,
            i18n: true
        };
    });

    targets.of('@magento/pwa-buildpack').webpackCompiler.tap(compiler => {
        new moduleOverridePlugin(componentOverrideMapping).apply(compiler);
    });
};
