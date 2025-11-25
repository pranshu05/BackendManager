export default {
  projects: [
    {
      displayName: 'api',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/**/*.test.js'],
      testPathIgnorePatterns: ['\\.test\\.jsx$'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
          jsc: {
            parser: {
              syntax: 'ecmascript',
              jsx: true,
            },
            transform: {
              react: {
                runtime: 'automatic',
              },
            },
          },
        }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@langchain|p-retry|is-network-error|langchain|uuid)/)',
      ],
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['**/__tests__/**/*.test.jsx'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
          jsc: {
            parser: {
              syntax: 'ecmascript',
              jsx: true,
            },
            transform: {
              react: {
                runtime: 'automatic',
              },
            },
          },
        }],
      },
      transformIgnorePatterns: ['node_modules/(?!(?:@lottiefiles)/)'],
    },
  ],
};