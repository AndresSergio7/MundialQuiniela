const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Platform-specific extensions: .web.ts resolves before .ts on web
config.resolver.sourceExts = [
  'web.tsx', 'web.ts', 'web.jsx', 'web.js',
  'tsx', 'ts', 'jsx', 'js',
  'json', 'cjs', 'mjs',
];

// Allow Metro to resolve ESM package exports (needed for Expo 54 / RN 0.81)
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'default'];

// Stub react-native-iap on web with an empty compatible module
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-iap') {
    return {
      filePath: path.resolve(__dirname, 'src/lib/iap-stub.web.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
