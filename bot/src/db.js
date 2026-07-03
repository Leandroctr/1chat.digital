function criarDb({ USAR_POSTGRES, pool }) {
  async function initDb() {
    if (!USAR_POSTGRES) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS atendimentos (
        numero TEXT PRIMARY KEY,
        modo TEXT NOT NULL DEFAULT 'bot',
        etapa TEXT NOT NULL DEFAULT 'inicio',
        nome TEXT,
        cpf TEXT,
        site TEXT,
        platform_key TEXT,
        platform_name TEXT,
        platform_url TEXT,
        platform_raw TEXT,
        platform_confirmed BOOLEAN DEFAULT FALSE,
        platform_candidate_key TEXT,
        platform_attempts INTEGER DEFAULT 0,
        criado_em TIMESTAMPTZ DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ DEFAULT NOW(),
        iniciado_em TIMESTAMPTZ
      );
    `);

    await pool.query(`
      ALTER TABLE atendimentos
        ADD COLUMN IF NOT EXISTS platform_key TEXT,
        ADD COLUMN IF NOT EXISTS platform_name TEXT,
        ADD COLUMN IF NOT EXISTS platform_url TEXT,
        ADD COLUMN IF NOT EXISTS platform_raw TEXT,
        ADD COLUMN IF NOT EXISTS platform_confirmed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS platform_candidate_key TEXT,
        ADD COLUMN IF NOT EXISTS platform_attempts INTEGER DEFAULT 0;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fila (
        id SERIAL PRIMARY KEY,
        numero TEXT UNIQUE NOT NULL,
        nome TEXT,
        cpf TEXT,
        site TEXT,
        mensagem TEXT,
        horario TIMESTAMPTZ DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'aguardando'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS final_message_log (
        id SERIAL PRIMARY KEY,
        numero TEXT NOT NULL,
        sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(numero, sent_date)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_config (
        chave TEXT PRIMARY KEY,
        valor JSONB NOT NULL,
        atualizado_em TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS final_message_pending (
        numero TEXT PRIMARY KEY,
        origem TEXT,
        scheduled_at TIMESTAMPTZ NOT NULL,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS known_sites (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        aliases TEXT[] DEFAULT '{}',
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS human_handoff_events (
        id SERIAL PRIMARY KEY,
        numero TEXT NOT NULL,
        nome TEXT,
        site_informado TEXT,
        site_identificado TEXT,
        motivo_detectado TEXT,
        origem TEXT,
        mensagem TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_handoff_created_at
      ON human_handoff_events(created_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_handoff_site
      ON human_handoff_events(site_identificado);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_handoff_motivo
      ON human_handoff_events(motivo_detectado);
    `);
  }

  return {
    initDb,
  };
}

module.exports = {
  criarDb,
};
