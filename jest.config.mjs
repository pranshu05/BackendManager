export default {
  testEnvironment: "jsdom",

  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },

  testMatch: [
    "**/__tests__/**/*.(test|spec).(js|jsx)",
    "**/?(*.)+(test|spec).(js|jsx)",
  ],

  transform: {
    "^.+\\.(js|jsx)$": ["@swc/jest"],
  },

  transformIgnorePatterns: ["node_modules/(?!(?:@lottiefiles)/)"],
};
