// jest.setup.cjs
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Only require jest-dom if it's available (for component tests)
try {
  require("@testing-library/jest-dom");
} catch (e) {
  // Skip if not available
}