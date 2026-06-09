function mapearAtendimento(row) {
  if (!row) return null;

  return {
    modo: row.modo,
    etapa: row.etapa,
    nome: row.nome,
    cpf: row.cpf,
    site: row.site,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    iniciadoEm: row.iniciado_em,
  };
}

function criarAtendimentosService({
  USAR_POSTGRES,
  pool,
  ARQUIVO_ATENDIMENTOS,
  carregarJson,
  salvarJson,
  horarioAtual,
  dataBanco,
  logState,
}) {
  async function carregarAtendimentos() {
    if (USAR_POSTGRES) {
      const { rows } = await pool.query("SELECT * FROM atendimentos");
      return rows.reduce((acc, row) => {
        acc[row.numero] = mapearAtendimento(row);
        return acc;
      }, {});
    }

    return carregarJson(ARQUIVO_ATENDIMENTOS, {});
  }

  async function salvarAtendimentos(dados) {
    if (USAR_POSTGRES) {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM atendimentos");

        for (const [numero, atendimento] of Object.entries(dados)) {
          await client.query(
            `INSERT INTO atendimentos
              (numero, modo, etapa, nome, cpf, site, criado_em, atualizado_em, iniciado_em)
             VALUES
              ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), NOW(), $8)`,
            [
              numero,
              atendimento.modo || "bot",
              atendimento.etapa || "inicio",
              atendimento.nome || null,
              atendimento.cpf || null,
              atendimento.site || null,
              dataBanco(atendimento.criadoEm),
              dataBanco(atendimento.iniciadoEm),
            ]
          );
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return;
    }

    salvarJson(ARQUIVO_ATENDIMENTOS, dados);
  }

  async function obterOuCriarAtendimento(numero) {
    if (USAR_POSTGRES) {
      const { rows } = await pool.query(
        `INSERT INTO atendimentos (numero)
         VALUES ($1)
         ON CONFLICT (numero) DO UPDATE
         SET numero = EXCLUDED.numero
         RETURNING *`,
        [numero]
      );

      return mapearAtendimento(rows[0]);
    }

    const atendimentos = await carregarAtendimentos();

    if (!atendimentos[numero]) {
      atendimentos[numero] = {
        modo: "bot",
        etapa: "inicio",
        nome: null,
        cpf: null,
        site: null,
        criadoEm: horarioAtual(),
        atualizadoEm: horarioAtual(),
      };

      await salvarAtendimentos(atendimentos);
    }

    return atendimentos[numero];
  }

  async function atualizarAtendimento(numero, novosDados) {
    if (USAR_POSTGRES) {
      const atual = await obterOuCriarAtendimento(numero);
      const atendimento = { ...atual, ...novosDados };

      const { rows } = await pool.query(
        `UPDATE atendimentos
         SET modo = $2,
             etapa = $3,
             nome = $4,
             cpf = $5,
             site = $6,
             atualizado_em = NOW(),
             iniciado_em = COALESCE($7, iniciado_em)
         WHERE numero = $1
         RETURNING *`,
        [
          numero,
          atendimento.modo || "bot",
          atendimento.etapa || "inicio",
          atendimento.nome || null,
          atendimento.cpf || null,
          atendimento.site || null,
          dataBanco(atendimento.iniciadoEm),
        ]
      );

      const atualizado = mapearAtendimento(rows[0]);

      if (novosDados.etapa && atual.etapa !== atualizado.etapa) {
        logState(numero, atual.etapa, atualizado.etapa, "atualizar_atendimento");
      }

      return atualizado;
    }

    const atendimentos = await carregarAtendimentos();
    const etapaAnterior = atendimentos[numero]?.etapa;

    atendimentos[numero] = {
      ...(atendimentos[numero] || {}),
      ...novosDados,
      atualizadoEm: horarioAtual(),
    };

    await salvarAtendimentos(atendimentos);

    if (novosDados.etapa && etapaAnterior !== atendimentos[numero].etapa) {
      logState(numero, etapaAnterior, atendimentos[numero].etapa, "atualizar_atendimento");
    }

    return atendimentos[numero];
  }

  async function estaEmModoHumano(numero) {
    if (USAR_POSTGRES) {
      const { rows } = await pool.query("SELECT modo FROM atendimentos WHERE numero = $1", [numero]);
      return rows[0]?.modo === "humano";
    }

    const atendimentos = await carregarAtendimentos();
    return atendimentos[numero]?.modo === "humano";
  }

  async function ativarModoHumano(numero) {
    await atualizarAtendimento(numero, {
      modo: "humano",
      etapa: "humano",
      iniciadoEm: USAR_POSTGRES ? new Date() : horarioAtual(),
    });
  }

  async function limparAtendimento(numero) {
    if (USAR_POSTGRES) {
      await pool.query("DELETE FROM atendimentos WHERE numero = $1", [numero]);
      return;
    }

    const atendimentos = await carregarAtendimentos();
    delete atendimentos[numero];
    await salvarAtendimentos(atendimentos);
  }

  return {
    carregarAtendimentos,
    salvarAtendimentos,
    obterOuCriarAtendimento,
    atualizarAtendimento,
    estaEmModoHumano,
    ativarModoHumano,
    limparAtendimento,
  };
}

module.exports = {
  criarAtendimentosService,
  mapearAtendimento,
};
