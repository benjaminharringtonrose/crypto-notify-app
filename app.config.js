import "dotenv/config";

export default {
  expo: {
    name: "crypto-notify-app",
    slug: "crypto-notify-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "src/assets/images/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    scheme: "cryptonotifyapp",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.benjamin-rowz.cryptonotifyapp",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "src/assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.benjamin_rowz.cryptonotifyapp",
    },
    web: {
      favicon: "src/assets/images/favicon.png",
    },
    plugins: [
      "expo-asset",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "src/assets/images/splash-icon.png",
        },
      ],
    ],
    extra: {
      MORALIS_API_KEY: process.env.MORALIS_API_KEY,
      COINBASE_API_KEY: process.env.COINBASE_API_KEY,
      COINBASE_API_SECRET: process.env.COINBASE_API_SECRET,
      COIN_MARKET_CAP_API_KEY: process.env.COIN_MARKET_CAP_API_KEY,
    },
  },
};
