function clone(payload) {
  return payload === undefined ? undefined : JSON.parse(JSON.stringify(payload));
}

const textoValido = {
  event: "message",
  session: "test-session",
  payload: {
    id: "msg-text-001",
    from: "5511999990000@c.us",
    body: "Mensagem de teste",
    fromMe: false,
    timestamp: 1700000000,
  },
};

const messageAny = {
  event: "message.any",
  session: "test-session",
  payload: {
    id: "msg-any-001",
    from: "5511999990000@c.us",
    body: "Mensagem ignorada",
    fromMe: false,
  },
};

const sessionStatus = {
  event: "session.status",
  session: "test-session",
  payload: {
    name: "test-session",
    status: "WORKING",
  },
};

const fromMeTopLevel = {
  event: "message",
  session: "test-session",
  payload: {
    id: "msg-from-me-001",
    from: "5511999990000@c.us",
    body: "Mensagem enviada pelo bot",
    fromMe: true,
  },
};

const fromMeDataKey = {
  event: "message",
  session: "test-session",
  payload: {
    id: "msg-from-me-002",
    from: "5511999990000@c.us",
    body: "Mensagem enviada pelo bot",
    _data: {
      key: {
        fromMe: true,
      },
    },
  },
};

const grupo = {
  event: "message",
  session: "test-session",
  payload: {
    id: "msg-group-001",
    from: "120363000000000000@g.us",
    body: "Mensagem de grupo",
    fromMe: false,
  },
};

const semId = {
  event: "message",
  session: "test-session",
  payload: {
    from: "5511999990000@c.us",
    body: "Mensagem sem id",
    fromMe: false,
  },
};

const semOrigem = {
  event: "message",
  session: "test-session",
  payload: {
    id: "msg-no-from-001",
    body: "Mensagem sem origem",
    fromMe: false,
  },
};

const semCorpo = {
  event: "message",
  session: "test-session",
  payload: {
    id: "msg-no-body-001",
    from: "5511999990000@c.us",
    fromMe: false,
  },
};

const semPayload = {
  event: "message",
  session: "test-session",
};

const idEmData = {
  event: "message",
  session: "test-session",
  payload: {
    from: "5511999990000@c.us",
    body: "Mensagem com id em _data",
    fromMe: false,
    _data: {
      id: "msg-data-id-001",
    },
  },
};

const idObjetoInesperado = {
  event: "message",
  session: "test-session",
  payload: {
    id: {
      id: "msg-object-id-001",
    },
    from: "5511999990000@c.us",
    body: "Mensagem com id objeto",
    fromMe: false,
  },
};

const midiaSemBody = {
  event: "message",
  session: "test-session",
  payload: {
    id: "msg-media-001",
    from: "5511999990000@c.us",
    fromMe: false,
    media: {
      mimetype: "image/png",
      filename: "arquivo-sanitizado.png",
    },
  },
};

const estruturaInesperada = {
  event: "message",
  session: "test-session",
  payload: {
    nested: {
      id: "msg-nested-001",
      from: "5511999990000@c.us",
      body: "Mensagem aninhada",
    },
  },
};

module.exports = {
  clone,
  fixtures: {
    textoValido,
    duplicada: textoValido,
    messageAny,
    sessionStatus,
    fromMeTopLevel,
    grupo,
    semId,
    semOrigem,
    semCorpo,
    semPayload,
    idEmData,
    fromMeDataKey,
    midiaSemBody,
    estruturaInesperada,
    idObjetoInesperado,
  },
};
