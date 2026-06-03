```js
// ==============================
// RESPOSTA AUTOMÁTICA
// ==============================

function buscarResposta(
  mensagemCliente
) {
  const mensagemNormalizada =
    normalizarTexto(
      mensagemCliente
    );

  const respostas =
    carregarRespostas();

  for (const item of respostas) {

    const ativo =
      normalizarTexto(
        item.ativo
      );

    const gatilho =
      normalizarTexto(
        item.gatilho
      );

    if (ativo !== "sim")
      continue;

    if (
      !gatilho ||
      !item.resposta
    )
      continue;

    if (
      mensagemNormalizada.includes(
        gatilho
      )
    ) {

      return {
        texto: item.resposta,
        linkVideo:
          item.link_video || null,
      };

    }
  }

  return {
    texto:
      "Olá! Recebi sua mensagem. Em breve vou te responder por aqui.",
    linkVideo: null,
  };
}

// ==============================
// RESPOSTA AUTOMÁTICA WEBHOOK
// ==============================

      let respostaEncontrada =
        buscarResposta(
          mensagemTexto
        );

      let resposta =
        respostaEncontrada.texto;

      let linkVideo =
        respostaEncontrada.linkVideo;

      if (
        !resposta ||
        resposta.includes(
          "Recebi sua mensagem"
        )
      ) {

        resposta =
          await perguntarIA(
            mensagemTexto
          );

        linkVideo = null;

      }

      escreverLog(
        `RESPOSTA | ${numero} | ${resposta}`
      );

      console.log(
        "RESPOSTA ENVIADA"
      );

      console.log(
        resposta
      );

      await enviarMensagem(
        numero,
        resposta
      );

      if (linkVideo) {

        await enviarMensagem(
          numero,
          linkVideo
        );

      }

      return res.sendStatus(
        200
      );
```
