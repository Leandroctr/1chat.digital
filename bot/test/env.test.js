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

test("normaliza WAHA_BASE_URL sem barra final", () => {
  const env = carregarEnv({
    WAHA_BASE_URL: "https://waha.test",
    WAHA_API_KEY: "test-key",
    WAHA_SESSION: "TEST_SESSION",
  });

  assert.equal(env.WAHA_URL, "https://waha.test");
});

test("normaliza WAHA_BASE_URL com uma barra final", () => {
  const env = carregarEnv({
    WAHA_BASE_URL: "https://waha.test/",
    WAHA_API_KEY: "test-key",
    WAHA_SESSION: "TEST_SESSION",
  });

  assert.equal(env.WAHA_URL, "https://waha.test");
});

test("normaliza WAHA_BASE_URL com multiplas barras finais", () => {
  const env = carregarEnv({
    WAHA_BASE_URL: "https://waha.test///",
    WAHA_API_KEY: "test-key",
    WAHA_SESSION: "TEST_SESSION",
  });

  assert.equal(env.WAHA_URL, "https://waha.test");
});

test("mantem porta em WAHA_BASE_URL", () => {
  const env = carregarEnv({
    WAHA_BASE_URL: "http://localhost:3000/",
    WAHA_API_KEY: "test-key",
    WAHA_SESSION: "TEST_SESSION",
  });

  assert.equal(env.WAHA_URL, "http://localhost:3000");
});

test("mantem caminho interno e remove barra final", () => {
  const env = carregarEnv({
    WAHA_BASE_URL: "https://dominio.exemplo/waha/",
    WAHA_API_KEY: "test-key",
    WAHA_SESSION: "TEST_SESSION",
  });

  assert.equal(env.WAHA_URL, "https://dominio.exemplo/waha");
});

test("aceita URL HTTP local", () => {
  const env = carregarEnv({
    WAHA_BASE_URL: "http://localhost:3000",
    WAHA_API_KEY: "test-key",
    WAHA_SESSION: "TEST_SESSION",
  });

  assert.equal(env.WAHA_URL, "http://localhost:3000");
});

test("aceita URL HTTPS", () => {
  const env = carregarEnv({
    WAHA_BASE_URL: "https://waha.exemplo.com",
    WAHA_API_KEY: "test-key",
    WAHA_SESSION: "TEST_SESSION",
  });

  assert.equal(env.WAHA_URL, "https://waha.exemplo.com");
});

test("falha com protocolo invalido em WAHA_BASE_URL", () => {
  assert.throws(
    () =>
      carregarEnv({
        WAHA_BASE_URL: "ftp://waha.test",
        WAHA_API_KEY: "test-key",
        WAHA_SESSION: "TEST_SESSION",
      }),
    /WAHA_BASE_URL must start with http:\/\/ or https:\/\//
  );
});

test("falha com WAHA_BASE_URL contendo somente barras", () => {
  assert.throws(
    () =>
      carregarEnv({
        WAHA_BASE_URL: "///",
        WAHA_API_KEY: "test-key",
        WAHA_SESSION: "TEST_SESSION",
      }),
    /WAHA_BASE_URL must start with http:\/\/ or https:\/\//
  );
});

test("falha com credenciais em WAHA_BASE_URL", () => {
  assert.throws(
    () =>
      carregarEnv({
        WAHA_BASE_URL: "https://user:pass@waha.test",
        WAHA_API_KEY: "test-key",
        WAHA_SESSION: "TEST_SESSION",
      }),
    /WAHA_BASE_URL must not include credentials/
  );
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
