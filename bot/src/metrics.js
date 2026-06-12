function normalizarComparacao(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function calcularDistanciaLevenshtein(a, b) {
  const textoA = String(a);
  const textoB = String(b);
  const linhas = textoA.length + 1;
  const colunas = textoB.length + 1;
  const matriz = Array.from({ length: linhas }, () => Array(colunas).fill(0));

  for (let i = 0; i < linhas; i += 1) matriz[i][0] = i;
  for (let j = 0; j < colunas; j += 1) matriz[0][j] = j;

  for (let i = 1; i < linhas; i += 1) {
    for (let j = 1; j < colunas; j += 1) {
      const custo = textoA[i - 1] === textoB[j - 1] ? 0 : 1;

      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + custo
      );
    }
  }

  return matriz[textoA.length][textoB.length];
}

function calcularSimilaridade(a, b) {
  const textoA = normalizarComparacao(a);
  const textoB = normalizarComparacao(b);
  const maxLength = Math.max(textoA.length, textoB.length);

  if (!maxLength) return 1;

  const distancia = calcularDistanciaLevenshtein(textoA, textoB);
  return 1 - distancia / maxLength;
}

function obterSimilaridadeSite(siteInformado, candidato) {
  const informado = normalizarComparacao(siteInformado);
  const comparado = normalizarComparacao(candidato);

  if (!informado || !comparado) return 0;
  if (informado === comparado) return 1;
  if (informado.length >= 3 && comparado.startsWith(informado)) return 0.7;

  return calcularSimilaridade(informado, comparado);
}

function identificarSite(siteInformado, sites = []) {
  let melhorMatch = null;

  for (const site of sites) {
    if (!site?.ativo) continue;

    const candidatos = [site.nome, ...(site.aliases || [])];

    for (const candidato of candidatos) {
      const similaridade = obterSimilaridadeSite(siteInformado, candidato);

      if (!melhorMatch || similaridade > melhorMatch.similaridade) {
        melhorMatch = {
          nome: site.nome,
          similaridade,
        };
      }
    }
  }

  if (!melhorMatch || melhorMatch.similaridade < 0.7) return null;
  return melhorMatch.nome;
}

function contemPalavraChave(mensagemNormalizada, palavras) {
  return palavras.some((palavra) =>
    mensagemNormalizada.includes(normalizarComparacao(palavra))
  );
}

function detectarMotivo(mensagem = "") {
  const mensagemNormalizada = normalizarComparacao(mensagem);
  const categorias = [
    {
      motivo: "saque",
      palavras: ["saque", "sacar", "retirada", "pix nao caiu"],
    },
    {
      motivo: "deposito",
      palavras: [
        "deposito",
        "depositei",
        "fiz o pix",
        "nao caiu",
        "nao entrou",
        "pix enviado",
        "recarga",
        "saldo nao entrou",
      ],
    },
    {
      motivo: "senha",
      palavras: ["senha", "recuperar senha", "esqueci senha"],
    },
    {
      motivo: "acesso",
      palavras: [
        "login",
        "entrar",
        "acessar",
        "plataforma",
        "nao consigo entrar",
      ],
    },
    {
      motivo: "cadastro",
      palavras: ["cadastro", "registrar", "criar conta"],
    },
    {
      motivo: "bonus",
      palavras: ["bonus", "promocao"],
    },
    {
      motivo: "atendimento_humano",
      palavras: ["humano", "operador", "atendente", "suporte"],
    },
  ];

  const categoria = categorias.find(({ palavras }) =>
    contemPalavraChave(mensagemNormalizada, palavras)
  );

  return categoria?.motivo || "outros";
}

function criarMetricsService({
  USAR_POSTGRES,
  pool,
  obterOuCriarAtendimento,
  escreverLog,
  logError,
}) {
  async function carregarSitesConhecidos() {
    if (!USAR_POSTGRES) return [];

    const { rows } = await pool.query(
      `SELECT nome, aliases, ativo
       FROM known_sites
       WHERE ativo = true
       ORDER BY nome ASC`
    );

    return rows;
  }

  async function registrarEventoEncaminhamentoHumano({
    numero,
    mensagemTexto,
    origem = "pedido_usuario",
  }) {
    if (!USAR_POSTGRES) return;

    try {
      const atendimento = await obterOuCriarAtendimento(numero);
      const sites = await carregarSitesConhecidos();
      const siteIdentificado = identificarSite(atendimento.site, sites);
      const motivoDetectado = detectarMotivo(mensagemTexto);

      if (siteIdentificado) {
        escreverLog(`METRICS SITE MATCH | ${numero} | ${siteIdentificado}`);
      } else {
        escreverLog(
          `METRICS SITE UNKNOWN | ${numero} | ${atendimento.site || ""}`
        );
      }

      await pool.query(
        `INSERT INTO human_handoff_events
          (numero, nome, site_informado, site_identificado,
           motivo_detectado, origem, mensagem)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7)`,
        [
          numero,
          atendimento.nome || null,
          atendimento.site || null,
          siteIdentificado,
          motivoDetectado,
          origem,
          mensagemTexto,
        ]
      );

      escreverLog(`METRICS HANDOFF EVENT REGISTERED | ${numero}`);
    } catch (error) {
      logError(
        "METRICS",
        "Erro ao registrar evento de atendimento humano",
        error,
        { numero }
      );
    }
  }

  async function obterMetricasHoje() {
    if (!USAR_POSTGRES) {
      return {
        total_humano_hoje: 0,
        por_site: [],
        por_motivo: [],
      };
    }

    const totalQuery = pool.query(`
      SELECT COUNT(*)::int AS total
      FROM human_handoff_events
      WHERE created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    const porSiteQuery = pool.query(`
      SELECT COALESCE(site_identificado, 'desconhecido') AS site,
             COUNT(*)::int AS total
      FROM human_handoff_events
      WHERE created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY COALESCE(site_identificado, 'desconhecido')
      ORDER BY total DESC, site ASC
    `);

    const porMotivoQuery = pool.query(`
      SELECT COALESCE(motivo_detectado, 'outros') AS motivo,
             COUNT(*)::int AS total
      FROM human_handoff_events
      WHERE created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY COALESCE(motivo_detectado, 'outros')
      ORDER BY total DESC, motivo ASC
    `);

    const [total, porSite, porMotivo] = await Promise.all([
      totalQuery,
      porSiteQuery,
      porMotivoQuery,
    ]);

    return {
      total_humano_hoje: total.rows[0]?.total || 0,
      por_site: porSite.rows,
      por_motivo: porMotivo.rows,
    };
  }

  return {
    carregarSitesConhecidos,
    obterMetricasHoje,
    registrarEventoEncaminhamentoHumano,
  };
}

module.exports = {
  calcularSimilaridade,
  criarMetricsService,
  detectarMotivo,
  identificarSite,
  normalizarComparacao,
};
