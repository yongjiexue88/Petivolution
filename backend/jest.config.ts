/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@sim/(.*)$': '<rootDir>/src/sim/$1',
    },
    testMatch: ['**/test/**/*.test.ts', '**/src/**/*.test.ts'],
    coverageThreshold: {
        global: {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95
        }
    },
    rootDir: '.'
};
