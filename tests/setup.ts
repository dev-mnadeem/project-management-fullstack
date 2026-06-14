import '@testing-library/jest-dom/vitest';

// The app resolves its data driver from the environment at import time. Every
// test runs against the in-memory driver, never a real database.
process.env.DATA_DRIVER = 'memory';
delete process.env.DATABASE_URL;
delete process.env.ANTHROPIC_API_KEY;
