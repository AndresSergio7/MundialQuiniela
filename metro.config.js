const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolve platform-specific extensions (.web.ts takes priority on web)
config.resolver.sourceExts = [
  'web.tsx', 'web.ts', 'web.jsx', 'web.js',
  'tsx', 'ts', 'jsx', 'js',
  'json', 'cjs', 'mjs',
];

// Stub native-only modules on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // react-native-iap → our web stub
    if (moduleName === 'react-native-iap') {
      return {
        filePath: require.resolve('./src/lib/payments.web.ts'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
