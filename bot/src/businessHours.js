const TIMEZONE_ATENDIMENTO = "America/Sao_Paulo";
const ETAPA_CONFIRMAR_FILA_FORA_HORARIO =
  "aguardando_confirmacao_fila_fora_horario";

function minutosDoHorario(horario) {
  const [hora, minuto] = String(horario || "00:00")
    .split(":")
    .map((valor) => Number(valor));

  return hora * 60 + minuto;
}

function obterDataSaoPaulo(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE_ATENDIMENTO,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;

  return {
    weekday: valor("weekday"),
    minutos: (Number(valor("hour")) % 24) * 60 + Number(valor("minute")),
  };
}

function obterJanelaAtendimento(config, data = new Date()) {
  const agora = obterDataSaoPaulo(data);
  const domingo = agora.weekday === "Sun";

  return {
    inicio: domingo
      ? config.horario_humano_domingo_inicio
      : config.horario_humano_segunda_sabado_inicio,
    fim: domingo
      ? config.horario_humano_domingo_fim
      : config.horario_humano_segunda_sabado_fim,
    minutosAgora: agora.minutos,
  };
}

function estaDentroHorarioAtendimento(config, data = new Date()) {
  const janela = obterJanelaAtendimento(config, data);
  const inicio = minutosDoHorario(janela.inicio);
  const fim = minutosDoHorario(janela.fim);

  return janela.minutosAgora >= inicio && janela.minutosAgora <= fim;
}

function horarioParaMensagem(horario) {
  const [hora, minuto] = String(horario || "00:00").split(":");

  return minuto === "00" ? `${hora}h` : `${hora}h${minuto}`;
}

function criarMensagemForaHorario(config) {
  return `No momento nossos operadores est\u00e3o fora do hor\u00e1rio de atendimento.

Nosso atendimento humano funciona de segunda a s\u00e1bado das ${horarioParaMensagem(config.horario_humano_segunda_sabado_inicio)} \u00e0s ${horarioParaMensagem(config.horario_humano_segunda_sabado_fim)} e aos domingos das ${horarioParaMensagem(config.horario_humano_domingo_inicio)} \u00e0s ${horarioParaMensagem(config.horario_humano_domingo_fim)}.

Se desejar deixar sua solicita\u00e7\u00e3o na fila para ser atendido no pr\u00f3ximo hor\u00e1rio dispon\u00edvel, digite OPERADOR novamente.`;
}

module.exports = {
  ETAPA_CONFIRMAR_FILA_FORA_HORARIO,
  criarMensagemForaHorario,
  estaDentroHorarioAtendimento,
};
