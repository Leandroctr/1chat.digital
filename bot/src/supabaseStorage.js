const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

const MIME_IMAGENS_MENSAGEM_FINAL = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSAO_POR_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function criarSupabaseStorage({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_BUCKET,
  escreverLog,
  logInfo,
  logWarn,
}) {
  const supabase =
    SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          realtime: {
            transport: WebSocket,
          },
        })
      : null;

  const uploadImagemMensagemFinal = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (!MIME_IMAGENS_MENSAGEM_FINAL.has(file.mimetype)) {
        cb(new Error("Formato de imagem nao permitido"));
        return;
      }

      cb(null, true);
    },
  });

  function estaConfigurado() {
    return Boolean(supabase);
  }

  async function removerImagemFinal(path) {
    if (!supabase || !path) return;

    await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([path]);
  }

  async function uploadImagemFinal({ file, imagemAntigaPath }) {
    const extensao = EXTENSAO_POR_MIME[file.mimetype];
    const filePath = `final-message-${Date.now()}.${extensao}`;

    logInfo("SUPABASE", "Upload imagem final iniciado", {
      path: filePath,
      mime: file.mimetype,
      tamanho: file.size,
    });

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    logInfo("SUPABASE", "Upload imagem final concluido", { path: filePath });

    if (imagemAntigaPath) {
      try {
        await removerImagemFinal(imagemAntigaPath);
        escreverLog(`IMAGEM ANTIGA REMOVIDA | ${imagemAntigaPath}`);
        logInfo("SUPABASE", "Imagem antiga removida", { path: imagemAntigaPath });
      } catch (error) {
        escreverLog(`ERRO REMOVER IMAGEM ANTIGA | ${imagemAntigaPath} | ${error.message}`);
        logWarn("SUPABASE", "Erro remover imagem antiga", {
          path: imagemAntigaPath,
          erro: error.message,
        });
      }
    }

    const { data } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(filePath);

    return {
      final_message_image_url: data.publicUrl,
      final_message_image_path: filePath,
      final_message_image_mime: file.mimetype,
      final_message_image_size: file.size,
    };
  }

  return {
    estaConfigurado,
    removerImagemFinal,
    uploadImagemFinal,
    uploadImagemMensagemFinal,
  };
}

module.exports = {
  criarSupabaseStorage,
};
