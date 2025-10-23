/**
 * Mock configuration for tests
 */

const defaultConfig = {
  typescript: {
    enabled: true,
    timeout: 15000,
    showDependencyErrors: false,
    skipLibCheck: true
  },
  eslint: {
    enabled: true,
    autofix: true,
    timeout: 30000
  },
  prettier: {
    enabled: true,
    timeout: 10000
  },
  imports: {
    enabled: true,
    checkFeatureBoundaries: true,
    timeout: 5000
  },
  dependencies: {
    enabled: true,
    trustedPackages: [
      'react',
      'next',
      'typescript',
      'lodash',
      '@radix-ui'
    ],
    allowBypass: true,
    typoDetection: true
  },
  orchestrator: {
    parallel: true,
    stopOnFirstError: true,
    verbose: false
  }
};

const disabledConfig = {
  typescript: { enabled: false },
  eslint: { enabled: false },
  prettier: { enabled: false },
  imports: { enabled: false },
  dependencies: { enabled: false },
  orchestrator: { parallel: false }
};

const sequentialConfig = {
  ...defaultConfig,
  orchestrator: {
    parallel: false,
    stopOnFirstError: true,
    verbose: false
  }
};

export {
  defaultConfig,
  disabledConfig,
  sequentialConfig
};
