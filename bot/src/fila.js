function mapearItemFila(row) {
  return {
    numero: row.numero,
    nome: row.nome,
    cpf: row.cpf,
    site: row.site,
    mensagem: row.mensagem,
    horario: row.horario ? new Date(row.horario).toLocaleString("pt-BR") : null,
    status: row.status,
  };
}

function criarFilaService({
  USAR_POSTGRES,
  pool,
  ARQUIVO_FILA,
  carregarJson,
  salvarJson,
  dataBanco,
  horarioAtual,
  obterOuCriarAtendimento,
}) {
  async function carregarFila() {
    if (USAR_POSTGRES) {
      const { rows } = await pool.query(
        `SELECT numero, nome, cpf, site, mensagem, horario, status
         FROM fila
         ORDER BY horario ASC`
      );

      return rows.map(mapearItemFila);
    }

    return carregarJson(ARQUIVO_FILA, []);
  }

  async function salvarFila(fila) {
    if (USAR_POSTGRES) {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM fila");

        for (const item of fila) {
          await client.query(
            `INSERT INTO fila
              (numero, nome, cpf, site, mensagem, horario, status)
             VALUES
              ($1, $2, $3, $4, $5, COALESCE($6, NOW()), $7)
             ON CONFLICT (numero) DO UPDATE
             SET nome = EXCLUDED.nome,
                 cpf = EXCLUDED.cpf,
                 site = EXCLUDED.site,
                 mensagem = EXCLUDED.mensagem,
                 horario = EXCLUDED.horario,
                 status = EXCLUDED.status`,
            [
              item.numero,
              item.nome || null,
              item.cpf || null,
              item.site || null,
              item.mensagem || null,
              dataBanco(item.horario),
              item.status || "aguardando",
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

    salvarJson(ARQUIVO_FILA, fila);
  }

  async function adicionarNaFila(numero, mensagem) {
    const atendimento = await obterOuCriarAtendimento(numero);

    if (USAR_POSTGRES) {
      await pool.query(
        `INSERT INTO fila
          (numero, nome, cpf, site, mensagem, status)
         VALUES
          ($1, $2, $3, $4, $5, 'aguardando')
         ON CONFLICT (numero) DO UPDATE
         SET nome = EXCLUDED.nome,
             cpf = EXCLUDED.cpf,
             site = EXCLUDED.site,
             mensagem = EXCLUDED.mensagem,
             status = 'aguardando'`,
        [
          numero,
          atendimento.nome || null,
          atendimento.cpf || null,
          atendimento.site || null,
          mensagem,
        ]
      );

      return;
    }

    const fila = await carregarFila();
    const jaExiste = fila.find((item) => item.numero === numero && item.status === "aguardando");
    if (jaExiste) return;

    fila.push({
      numero,
      nome: atendimento.nome || null,
      cpf: atendimento.cpf || null,
      site: atendimento.site || null,
      mensagem,
      horario: horarioAtual(),
      status: "aguardando",
    });

    await salvarFila(fila);
  }

  async function removerDaFila(numero) {
    if (USAR_POSTGRES) {
      await pool.query("DELETE FROM fila WHERE numero = $1", [numero]);
      return;
    }

    const fila = await carregarFila();
    await salvarFila(fila.filter((item) => item.numero !== numero));
  }

  return {
    carregarFila,
    salvarFila,
    adicionarNaFila,
    removerDaFila,
  };
}

module.exports = {
  criarFilaService,
  mapearItemFila,
};
