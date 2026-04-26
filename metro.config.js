const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { resolve: metroResolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

// Keep only non-platform-suffixed extensions — Metro resolves *.web.js vs *.js
// automatically via the `platforms` config for each target platform.
config.resolver.sourceExts = [
  'tsx', 'ts', 'jsx', 'js',
  'json', 'cjs', 'mjs',
];

// Enable package.json `exports` field resolution; use CJS/default conditions on all platforms.
// 'browser' is intentionally excluded so native builds don't pick web-only code paths.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'default'];

// Force CJS builds for ESM-only packages that use import.meta (web-incompatible)
const ESM_PACKAGES_CJS = {
  '@supabase/supabase-js': 'dist/index.cjs',
};

// Zustand's package.json "import" condition points at .mjs files that use
// import.meta.env — classic web bundles are not ES modules, so force CJS.
const ZUSTAND_WEB_CJS = {
  zustand: path.join(__dirname, 'node_modules/zustand/index.js'),
  'zustand/vanilla': path.join(__dirname, 'node_modules/zustand/vanilla.js'),
  'zustand/middleware': path.join(__dirname, 'node_modules/zustand/middleware.js'),
  'zustand/shallow': path.join(__dirname, 'node_modules/zustand/shallow.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-iap') {
    return {
      filePath: path.resolve(__dirname, 'src/lib/iap-stub.web.js'),
      type: 'sourceFile',
    };
  }
  if (platform === 'web' && ZUSTAND_WEB_CJS[moduleName]) {
    return {
      filePath: ZUSTAND_WEB_CJS[moduleName],
      type: 'sourceFile',
    };
  }
  if (platform === 'web' && ESM_PACKAGES_CJS[moduleName]) {
    return {
      filePath: path.resolve(__dirname, 'node_modules', moduleName, ESM_PACKAGES_CJS[moduleName]),
      type: 'sourceFile',
    };
  }
  return metroResolve(context, moduleName, platform);
};

module.exports = config;
