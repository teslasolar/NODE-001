module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@rings/(.*)$': '<rootDir>/src/rings/$1',
    '^@sensors/(.*)$': '<rootDir>/src/sensors/$1',
    '^@pipeline/(.*)$': '<rootDir>/src/pipeline/$1',
    '^@privacy/(.*)$': '<rootDir>/src/privacy/$1',
    '^@p2p/(.*)$': '<rootDir>/src/p2p/$1',
    '^@standards/(.*)$': '<rootDir>/src/standards/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@device/(.*)$': '<rootDir>/src/device/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
};
