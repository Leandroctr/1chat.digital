const assert = require("node:assert/strict");
const test = require("node:test");

const WAHA_PATH = require.resolve("../src/waha");
const AXIOS_PATH = require.resolve("axios");

function carregarWahaComAxiosMock(axiosMock) {
  const originalAxiosCache = require.cache[AXIOS_PATH];
  delete require.cache[WAHA_PATH];
  require.cache[AXIOS_PATH] = {
    id: AXIOS_PATH,
    filename: AXIOS_PATH,
    loaded: true,
    exports: axiosMock,
  };

  try {
    return require("../src/waha");
  } finally {
    delete require.cache[WAHA_PATH];
    if (originalAxiosCache) {
      require.cache[AXIOS_PATH] = originalAxiosCache;
    } else {
      delete require.cache[AXIOS_PATH];
    }
  }
}

test("cliente WAHA monta endpoints sem barra dupla antes de api", async () => {
  const chamadas = [];
  const axiosMock = {
    get: async (url) => {
      chamadas.push({ method: "get", url });
      return { status: 200, data: [] };
    },
    post: async (url) => {
      chamadas.push({ method: "post", url });
      return { status: 200, data: {} };
    },
  };
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (callback) => {
    callback();
    return { unref() {} };
  };

  try {
    const { criarWahaClient } = carregarWahaComAxiosMock(axiosMock);
    const client = criarWahaClient({
      WAHA_URL: "https://waha.test/base",
      WAHA_API_KEY: "test-key",
      SESSION: "TEST_SESSION",
      escreverLog: () => {},
    });

    await client.obterStatus();
    await client.enviarMensagem("cliente@c.us", "ola");
    await client.enviarImagem("cliente@c.us", "https://assets.test/imagem.png");
  } finally {
    global.setTimeout = originalSetTimeout;
  }

  const urls = chamadas.map((chamada) => chamada.url);
  assert.deepEqual(urls, [
    "https://waha.test/base/api/server/status",
    "https://waha.test/base/api/sessions?all=true",
    "https://waha.test/base/api/startTyping",
    "https://waha.test/base/api/sendText",
    "https://waha.test/base/api/stopTyping",
    "https://waha.test/base/api/sendImage",
  ]);
  assert.equal(urls.some((url) => url.includes("//api")), false);
});
