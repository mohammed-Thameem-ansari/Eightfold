// Jest configuration using Next.js preset
const nextJest = require('next/jest')({
  dir: './'
});

const customConfig = {
  testEnvironment: 'node',
  // Only run proper Jest tests (*.test.*) and integration tests under __tests__
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  testPathIgnorePatterns: ['<rootDir>/tests/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^.+\\.(css|scss|sass)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'components/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}',
    'hooks/**/*.{ts,tsx,js,jsx}'
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/.next/']
};

module.exports = nextJest(customConfig);