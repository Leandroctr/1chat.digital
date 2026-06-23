const CONFIG_PADRAO = {
  mensagem_final_ativa: false,
  mensagem_final: "",
  delay_mensagem_final_segundos: 20,
  pergunta_confirmacao_final: "Te ajudo em algo mais?",
  horario_humano_segunda_sabado_inicio: "09:00",
  horario_humano_segunda_sabado_fim: "22:00",
  horario_humano_domingo_inicio: "09:00",
  horario_humano_domingo_fim: "20:00",
  final_message_image_url: "",
  final_message_image_path: "",
  final_message_image_mime: "",
  final_message_image_size: 0,
};

function normalizarHorario(valor, fallback) {
  const texto = String(valor || "").trim();
  const match = texto.match(/^(\d{2}):(\d{2})$/);

  if (!match) return fallback;

  const hora = Number(match[1]);
  const minuto = Number(match[2]);

  return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59
    ? texto
    : fallback;
}

function normalizarConfig(config) {
  const delayInformado = Number(config?.delay_mensagem_final_segundos);
  const tamanhoImagem = Number(config?.final_message_image_size);

  return {
    ...CONFIG_PADRAO,
    ...config,
    mensagem_final_ativa: Boolean(config?.mensagem_final_ativa),
    mensagem_final: String(config?.mensagem_final || ""),
    pergunta_confirmacao_final: String(
      config?.pergunta_confirmacao_final || CONFIG_PADRAO.pergunta_confirmacao_final
    ),
    delay_mensagem_final_segundos: Math.max(
      0,
      Number.isNaN(delayInformado) ? CONFIG_PADRAO.delay_mensagem_final_segundos : delayInformado
    ),
    horario_humano_segunda_sabado_inicio: normalizarHorario(
      config?.horario_humano_segunda_sabado_inicio,
      CONFIG_PADRAO.horario_humano_segunda_sabado_inicio
    ),
    horario_humano_segunda_sabado_fim: normalizarHorario(
      config?.horario_humano_segunda_sabado_fim,
      CONFIG_PADRAO.horario_humano_segunda_sabado_fim
    ),
    horario_humano_domingo_inicio: normalizarHorario(
      config?.horario_humano_domingo_inicio,
      CONFIG_PADRAO.horario_humano_domingo_inicio
    ),
    horario_humano_domingo_fim: normalizarHorario(
      config?.horario_humano_domingo_fim,
      CONFIG_PADRAO.horario_humano_domingo_fim
    ),
    final_message_image_url: String(config?.final_message_image_url || ""),
    final_message_image_path: String(config?.final_message_image_path || ""),
    final_message_image_mime: String(config?.final_message_image_mime || ""),
    final_message_image_size: Number.isNaN(tamanhoImagem) ? 0 : tamanhoImagem,
  };
}

function criarConfigService({ USAR_POSTGRES, pool, ARQUIVO_CONFIG, carregarJson, salvarJson }) {
  async function carregarConfig() {
    if (USAR_POSTGRES) {
      const { rows } = await pool.query(
        "SELECT valor FROM bot_config WHERE chave = 'global' LIMIT 1"
      );

      if (!rows.length) {
        return normalizarConfig(CONFIG_PADRAO);
      }

      return normalizarConfig(rows[0].valor);
    }

    return normalizarConfig(carregarJson(ARQUIVO_CONFIG, CONFIG_PADRAO));
  }

  async function persistirConfig(novaConfig) {
    if (USAR_POSTGRES) {
      await pool.query(
        `INSERT INTO bot_config
          (chave, valor, atualizado_em)
         VALUES
          ('global', $1, NOW())
         ON CONFLICT (chave)
         DO UPDATE SET
          valor = EXCLUDED.valor,
          atualizado_em = NOW()`,
        [JSON.stringify(novaConfig)]
      );

      return novaConfig;
    }

    salvarJson(ARQUIVO_CONFIG, novaConfig);
    return novaConfig;
  }

  async function salvarConfig(config) {
    const configAtual = await carregarConfig();
    const configPermitida = {};
    const camposPermitidos = [
      "mensagem_final_ativa",
      "mensagem_final",
      "delay_mensagem_final_segundos",
      "pergunta_confirmacao_final",
      "horario_humano_segunda_sabado_inicio",
      "horario_humano_segunda_sabado_fim",
      "horario_humano_domingo_inicio",
      "horario_humano_domingo_fim",
    ];

    for (const campo of camposPermitidos) {
      if (Object.prototype.hasOwnProperty.call(config, campo)) {
        configPermitida[campo] = config[campo];
      }
    }

    return persistirConfig(normalizarConfig({ ...configAtual, ...configPermitida }));
  }

  async function salvarConfigImagem(camposImagem) {
    return persistirConfig(
      normalizarConfig({
        ...(await carregarConfig()),
        ...camposImagem,
      })
    );
  }

  return {
    carregarConfig,
    salvarConfig,
    salvarConfigImagem,
  };
}

module.exports = {
  CONFIG_PADRAO,
  criarConfigService,
  normalizarConfig,
};
