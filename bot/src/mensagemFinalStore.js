function dataAtual() {
  return new Date().toISOString().split("T")[0];
}

function criarMensagemFinalStore({
  USAR_POSTGRES,
  pool,
  ARQUIVO_FINAL_MESSAGE_LOG,
  carregarJson,
  salvarJson,
}) {
  async function podeEnviarMensagemFinal(numero) {
    if (USAR_POSTGRES) {
      const { rows } = await pool.query(
        `SELECT 1
         FROM final_message_log
         WHERE numero = $1
           AND sent_date = CURRENT_DATE
         LIMIT 1`,
        [numero]
      );

      return rows.length === 0;
    }

    const log = carregarJson(ARQUIVO_FINAL_MESSAGE_LOG, {});
    return log[numero] !== dataAtual();
  }

  async function registrarMensagemFinalEnviada(numero) {
    if (USAR_POSTGRES) {
      const { rowCount } = await pool.query(
        `INSERT INTO final_message_log
          (numero, sent_date)
         VALUES
          ($1, CURRENT_DATE)
         ON CONFLICT (numero, sent_date)
         DO NOTHING`,
        [numero]
      );

      return rowCount > 0;
    }

    const log = carregarJson(ARQUIVO_FINAL_MESSAGE_LOG, {});

    if (log[numero] === dataAtual()) {
      return false;
    }

    log[numero] = dataAtual();
    salvarJson(ARQUIVO_FINAL_MESSAGE_LOG, log);
    return true;
  }

  async function removerMensagemFinalPendente(numero) {
    if (!USAR_POSTGRES) return;

    await pool.query("DELETE FROM final_message_pending WHERE numero = $1", [numero]);
  }

  async function salvarMensagemFinalPendente(numero, origem, delaySegundos) {
    if (!USAR_POSTGRES) return;

    await pool.query(
      `INSERT INTO final_message_pending
        (numero, origem, scheduled_at)
       VALUES
        ($1, $2, NOW() + ($3 * INTERVAL '1 second'))
       ON CONFLICT (numero)
       DO UPDATE SET
        origem = EXCLUDED.origem,
        scheduled_at = EXCLUDED.scheduled_at,
        criado_em = NOW()`,
      [numero, origem, delaySegundos]
    );
  }

  async function buscarMensagensFinaisPendentes() {
    if (!USAR_POSTGRES) return [];

    const { rows } = await pool.query(
      `SELECT numero, origem
       FROM final_message_pending
       WHERE scheduled_at <= NOW()
       ORDER BY scheduled_at ASC
       LIMIT 20`
    );

    return rows;
  }

  return {
    buscarMensagensFinaisPendentes,
    podeEnviarMensagemFinal,
    registrarMensagemFinalEnviada,
    removerMensagemFinalPendente,
    salvarMensagemFinalPendente,
  };
}

module.exports = {
  criarMensagemFinalStore,
  dataAtual,
};
