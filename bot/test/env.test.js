const assert = require("node:assert/strict");
const test = require("node:test");

const ENV_PATH = require.resolve("../src/env");

function carregarEnv(env) {
  const original = { ...process.env };
  delete require.cache[ENV_PATH];
  process.env = { ...env };

  try {
    return require("../src/env");
  } finally {
    delete require.cache[ENV_PATH];
    process.env = original;
  }
}

test("falha sem WAHA_SESSION", () => {
  assert.throws(
    () =>
      carregarEnv({
        WAHA_BASE_URL: "http://waha.test",
        WAHA_API_KEY: "test-key",
      }),
    /WAHA_SESSION is required/
  );
});

test("falha com WAHA_SESSION vazia", () => {
  assert.throws(
    () =>
      carregarEnv({
        WAHA_BASE_URL: "http://waha.test",
        WAHA_API_KEY: "test-key",
        WAHA_SESSION: "   ",
      }),
    /WAHA_SESSION is required/
  );
});

test("aceita sessao explicita valida", () => {
  const env = carregarEnv({
    WAHA_BASE_URL: "http://waha.test",
    WAHA_API_KEY: "test-key",
    WAHA_SESSION: "TEST_SESSION",
  });

  assert.equal(env.WAHA_URL, "http://waha.test");
  assert.equal(env.WAHA_API_KEY, "test-key");
  assert.equal(env.SESSION, "TEST_SESSION");
});

test("nao usa fallback para default", () => {
  assert.throws(
    () =>
      carregarEnv({
        WAHA_BASE_URL: "http://waha.test",
        WAHA_API_KEY: "test-key",
      }),
    /WAHA_SESSION is required/
  );
});

test("falha sem WAHA_BASE_URL", () => {
  assert.throws(
    () =>
      carregarEnv({
        WAHA_API_KEY: "test-key",
        WAHA_SESSION: "TEST_SESSION",
      }),
    /WAHA_BASE_URL is required/
  );
});

test("falha sem WAHA_API_KEY", () => {
  assert.throws(
    () =>
      carregarEnv({
        WAHA_BASE_URL: "http://waha.test",
        WAHA_SESSION: "TEST_SESSION",
      }),
    /WAHA_API_KEY is required/
  );
});
