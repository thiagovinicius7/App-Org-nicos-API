/**
 * Planejamento de plantio semanal.
 *
 * Para cada cultura de ciclo (perenes ficam de fora):
 *  1. Saída semanal: média das colheitas recentes (as 2 últimas semanas pesam
 *     mais), ou a meta semanal informada na cultura.
 *  2. Rendimento: quanto cada muda (ou m²) rende na unidade de colheita.
 *     Histórico dos plantios finalizados > valor informado na cultura >
 *     1 por muda quando a colheita é em unidades.
 *  3. Oferta: o que os plantios abertos ainda vão produzir, espalhado pela
 *     janela de colheita de cada um (previsão até previsão + duração).
 *  4. Plantio da semana: o que falta para a primeira semana de colheita do
 *     plantio novo ficar coberta, considerando que se planta toda semana.
 *     Em regime, isso dá saída ÷ rendimento. Se já há muito no campo, diminui;
 *     se falta, aumenta (até 2× o normal). Mais a margem de segurança.
 *  5. Simula as próximas semanas supondo que as sugestões anteriores foram
 *     plantadas, para dar tempo de encomendar as mudas.
 */
import { Crop, Harvest, Planting } from "../types";
import {
  buscarCultura, unidadeColheita, calcularHistorico, colheitasDoPlantio, formatarData,
  hojeLocal, somarDias, diasEntre, parseData, normalizarUnidade
} from "./producao";

export interface PlanejamentoCultura {
  /** Fixa a cultura entre as principais. */
  principal?: boolean;
  /** Tira a cultura do planejamento. */
  ignorar?: boolean;
  /** Saída semanal desejada, na unidade de colheita. Substitui a média. */
  metaSemanal?: number;
  /** Quanto rende 1 muda (ou 1 m² nas sementes), na unidade de colheita. */
  rendimento?: number;
}

export interface ConfigPlanejamento {
  /** Margem de segurança sobre o plantio sugerido (0.1 = 10%). */
  margem: number;
  /** Semanas de colheita usadas na média longa. */
  semanasHistorico: number;
  /** Quantas semanas de plantio sugerir (esta + próximas). */
  semanasPlantio: number;
  /** Mudas por bandeja: o pedido de mudas vem em bandejas inteiras (0 = sem bandeja). */
  bandeja: number;
}

export const CONFIG_PADRAO: ConfigPlanejamento = { margem: 0.1, semanasHistorico: 8, semanasPlantio: 4, bandeja: 200 };

export type OrigemRendimento = "historico" | "informado" | "unidade" | null;

export interface SemanaCobertura {
  inicio: string;
  oferta: number;
  /** oferta ÷ saída (1 = coberto). */
  cobertura: number | null;
}

export interface PlanoCultura {
  cultura: string;
  unidade: string;
  /** "Muda" (quantidade em mudas) ou "Semente" (área em m²). */
  forma: "Muda" | "Semente";
  unidadePlantio: "mudas" | "m²";
  principal: boolean;
  fixada: boolean;
  semanasNaJanela: number;
  /** Saída usada no cálculo, por semana. */
  saidaSemanal: number;
  saidaOrigem: "meta" | "media";
  /** Média das 2 últimas semanas e das 2 anteriores, para a tendência. */
  recente: number;
  anterior: number | null;
  tendencia: number | null;
  diasComColheita: number;
  rendimento: number | null;
  rendimentoOrigem: OrigemRendimento;
  amostrasRendimento?: number;
  /** Plantio sugerido por semana (índice 0 = esta semana). */
  plantar: { data: string; quantidade: number; base: number }[];
  /** Cobertura das próximas semanas só com o que já está no campo. */
  cobertura: SemanaCobertura[];
  /** Primeira semana com oferta abaixo de 70% da saída. */
  primeiraFalta: string | null;
  plantiosAbertos: number;
  avisos: string[];
}

export interface ResultadoPlanejamento {
  hoje: string;
  inicioDados: string | null;
  semanasDeDados: number;
  culturas: PlanoCultura[];
}

const DIA = 1;
const SEMANAS_COBERTURA = 8;

function arred(n: number, casas = 1): number {
  const f = Math.pow(10, casas);
  return Math.round(n * f) / f;
}

function chave(s: string): string {
  return (s || "").toLowerCase().trim();
}

/** Perene se o plantio mais recente da cultura é Perene. */
function ehPerene(plantios: Planting[]): boolean {
  if (plantios.length === 0) return false;
  const maisRecente = [...plantios].sort((a, b) => (b.data || "").localeCompare(a.data || ""))[0];
  return maisRecente.tipo === "Perene";
}

function formaDePlantio(plantios: Planting[]): "Muda" | "Semente" {
  const ciclo = plantios.filter(p => p.tipo !== "Perene").sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  return ciclo[0]?.tipo === "Semente" || ciclo[0]?.unidade === "m²" ? "Semente" : "Muda";
}

/** Soma da colheita no intervalo [de, ate) de datas AAAA-MM-DD. */
function somaEntre(colheitas: Harvest[], de: string, ate: string): number {
  return colheitas
    .filter(h => h.data >= de && h.data < ate)
    .reduce((s, h) => s + (parseFloat(String(h.qtd)) || 0), 0);
}

/**
 * Espalha `total` uniformemente entre os dias [inicio, fim) e soma nas semanas
 * a partir de `hoje` (semana k = dias 7k..7k+6). Ignora o que cai antes de hoje.
 */
function espalhar(semanas: number[], hoje: string, inicio: string, fim: string, total: number) {
  const dias = Math.max(1, diasEntre(inicio, fim));
  const porDia = total / dias;
  for (let d = 0; d < dias; d++) {
    const offset = diasEntre(hoje, somarDias(inicio, d * DIA));
    if (offset < 0) continue;
    const k = Math.floor(offset / 7);
    if (k >= semanas.length) break;
    semanas[k] += porDia;
  }
}

export function calcularPlanejamento(
  crops: Crop[],
  plantings: Planting[],
  harvests: Harvest[],
  config: ConfigPlanejamento = CONFIG_PADRAO,
  hoje: string = hojeLocal()
): ResultadoPlanejamento {
  const datas = harvests.map(h => h.data).filter(Boolean).sort();
  const inicioDados = datas[0] || null;
  const diasDeDados = inicioDados ? Math.max(1, diasEntre(inicioDados, hoje) + 1) : 0;
  const semanasDeDados = arred(diasDeDados / 7, 1);

  // Janelas da média: recente (14 dias) e longa (semanasHistorico), limitadas aos dados.
  const diasLonga = Math.min(config.semanasHistorico * 7, diasDeDados);
  const diasRecente = Math.min(14, diasDeDados);
  const amanha = somarDias(hoje, 1);
  const historico = calcularHistorico(plantings, inicioDados);

  const porCultura = new Map<string, { nome: string; plantios: Planting[]; colheitas: Harvest[] }>();
  const reg = (nome: string) => {
    const k = chave(nome);
    if (!porCultura.has(k)) porCultura.set(k, { nome, plantios: [], colheitas: [] });
    return porCultura.get(k)!;
  };
  crops.forEach(c => reg(c.nome));
  plantings.forEach(p => reg(p.cultura).plantios.push(p));
  harvests.forEach(h => reg(h.cultura).colheitas.push(h));

  const culturas: PlanoCultura[] = [];

  porCultura.forEach(({ nome, plantios, colheitas }) => {
    const crop = buscarCultura(crops, nome);
    const cfg: PlanejamentoCultura = crop?.planejamento || {};
    if (cfg.ignorar) return;
    if (ehPerene(plantios)) return;
    if (!crop || !(crop.dias > 0)) return;

    const unidade = unidadeColheita(crops, nome);
    const forma = formaDePlantio(plantios);
    const avisos: string[] = [];

    // ---- Saída semanal
    const recente = diasRecente > 0 ? somaEntre(colheitas, somarDias(amanha, -diasRecente), amanha) / (diasRecente / 7) : 0;
    const longa = diasLonga > 0 ? somaEntre(colheitas, somarDias(amanha, -diasLonga), amanha) / (diasLonga / 7) : 0;
    const temAnterior = diasDeDados >= 28;
    const anterior = temAnterior ? somaEntre(colheitas, somarDias(amanha, -28), somarDias(amanha, -14)) / 2 : null;
    const media = diasLonga > diasRecente ? 0.6 * recente + 0.4 * longa : recente;
    const meta = typeof cfg.metaSemanal === "number" && cfg.metaSemanal > 0 ? cfg.metaSemanal : null;
    const saidaSemanal = meta ?? media;
    const tendencia = anterior && anterior > 0 ? (recente - anterior) / anterior : null;
    const diasComColheita = new Set(
      colheitas.filter(h => h.data >= somarDias(amanha, -diasLonga) && h.data < amanha).map(h => h.data)
    ).size;

    // ---- Rendimento por muda / m²
    let rendimento: number | null = null;
    let rendimentoOrigem: OrigemRendimento = null;
    let amostrasRendimento: number | undefined;
    const hist = historico.get(`${chave(nome)}|${forma === "Semente" ? "m2" : "un"}`);
    if (hist && hist.porUnidade > 0) {
      rendimento = hist.porUnidade; rendimentoOrigem = "historico"; amostrasRendimento = hist.amostras;
    } else if (typeof cfg.rendimento === "number" && cfg.rendimento > 0) {
      rendimento = cfg.rendimento; rendimentoOrigem = "informado";
    } else if (forma === "Muda" && normalizarUnidade(unidade) === "UN") {
      rendimento = 1; rendimentoOrigem = "unidade";
    }

    // ---- Oferta dos plantios abertos
    const horizonte = SEMANAS_COBERTURA + config.semanasPlantio + Math.ceil(((crop.dias || 0) + (crop.duracao || 0)) / 7) + 2;
    const oferta = new Array(horizonte).fill(0);
    const abertos = plantios.filter(p => p.status !== "Finalizado" && p.tipo !== "Perene");
    let semQuantidade = 0;
    for (const p of abertos) {
      const fimJanela = somarDias(p.previsao || somarDias(p.data, crop.dias), Math.max(7, crop.duracao || 0));
      const ultima = colheitasDoPlantio(harvests, p)[0]?.data;
      if (diasEntre(fimJanela, hoje) > 14 && (!ultima || diasEntre(ultima, hoje) > 14)) {
        avisos.push(`Plantio ${p.id} (talhão ${p.talhao}) passou da janela de colheita em ${formatarData(fimJanela)} e não tem colheita recente: encerrar?`);
        continue;
      }
      const colhido = colheitasDoPlantio(harvests, p).reduce((s, h) => s + (parseFloat(String(h.qtd)) || 0), 0);
      const quantidade = Number(p.quantidade) || 0;
      let esperado: number | null = null;
      if (typeof p.estimativaColheita === "number" && p.estimativaColheita > 0) esperado = p.estimativaColheita;
      else if (rendimento !== null && quantidade > 0) esperado = quantidade * rendimento - (rendimentoOrigem === "unidade" ? Number(p.perdas) || 0 : 0);
      if (esperado === null || esperado <= 0) {
        if (!(quantidade > 0)) semQuantidade++;
        continue;
      }
      const resto = Math.max(0, esperado - colhido);
      if (resto <= 0) continue;
      const previsao = p.previsao || somarDias(p.data, crop.dias);
      let inicio = previsao > hoje ? previsao : hoje;
      let fim = somarDias(previsao, Math.max(7, crop.duracao || 0));
      if (fim <= somarDias(hoje, 7)) fim = somarDias(hoje, 7); // além do prazo: assume que termina nesta semana
      if (fim <= inicio) fim = somarDias(inicio, 7);
      espalhar(oferta, hoje, inicio, fim, resto);
    }

    // Sem rendimento não dá para medir a oferta: cobertura fica "sem dado", não "falta".
    const medivel = rendimento !== null || abertos.some(p => (p.estimativaColheita || 0) > 0);
    const cobertura: SemanaCobertura[] = [];
    for (let k = 0; k < SEMANAS_COBERTURA; k++) {
      cobertura.push({
        inicio: somarDias(hoje, 7 * k),
        oferta: arred(oferta[k], 1),
        cobertura: medivel && saidaSemanal > 0 ? oferta[k] / saidaSemanal : null
      });
    }
    if (semQuantidade > 0 && medivel) {
      avisos.push(`${semQuantidade} plantio${semQuantidade > 1 ? "s" : ""} no campo sem quantidade: a oferta pode ser maior que a mostrada.`);
    }
    const falta = cobertura.find(s => s.cobertura !== null && s.cobertura < 0.7);
    const primeiraColheitaNova = somarDias(hoje, crop.dias);
    const faltasInevitaveis = cobertura.filter(s => s.cobertura !== null && s.cobertura < 0.7 && somarDias(s.inicio, 7) <= primeiraColheitaNova);
    if (faltasInevitaveis.length > 0) {
      const de = faltasInevitaveis[0].inicio;
      const ate = somarDias(faltasInevitaveis[faltasInevitaveis.length - 1].inicio, 6);
      avisos.push(`Vai faltar entre ${formatarData(de).slice(0, 5)} e ${formatarData(ate).slice(0, 5)}, e um plantio feito agora só colhe a partir de ${formatarData(primeiraColheitaNova).slice(0, 5)}. Segure as vendas ou compre de parceiro nesse período.`);
    }

    // ---- Plantio sugerido (simulação semana a semana)
    const semanasNaJanela = Math.max(1, (crop.duracao || 7) / 7);
    const plantar: PlanoCultura["plantar"] = [];
    if (rendimento && rendimento > 0) {
      const simulada = [...oferta];
      const base = saidaSemanal / rendimento;
      // Mudas vêm em bandejas inteiras: acumula a necessidade semana a semana e
      // planta uma bandeja quando o acumulado passa de meia bandeja. Assim cada
      // variedade entra no rodízio no intervalo que a saída dela pede.
      const bandeja = forma === "Muda" && config.bandeja > 0 ? config.bandeja : 0;
      let acumulado = 0;
      for (let i = 0; i < config.semanasPlantio; i++) {
        const dataPlantio = somarDias(hoje, 7 * i);
        const primeiraColheita = somarDias(dataPlantio, crop.dias);
        const t = Math.floor(diasEntre(hoje, primeiraColheita) / 7);
        const jaTem = t < simulada.length ? simulada[t] : 0;
        // Correção pelo que já há no campo, pela metade para não oscilar;
        // com sobra clara (30% acima da saída) não planta nesta semana.
        const corrigido = Math.max(0, Math.min(((saidaSemanal - jaTem) * semanasNaJanela) / rendimento, 2 * base));
        let q = jaTem >= 1.3 * saidaSemanal ? 0 : base + 0.5 * (corrigido - base);
        q = Math.max(0, Math.min(q, 2 * base));
        q = q * (1 + config.margem);
        let quantidade: number;
        if (bandeja) {
          acumulado += q;
          const bandejas = acumulado >= bandeja / 2 ? Math.max(1, Math.round(acumulado / bandeja)) : 0;
          quantidade = bandejas * bandeja;
          acumulado -= quantidade;
        } else {
          const arredonda = forma === "Semente" ? 1 : 10;
          quantidade = q > 0 ? Math.ceil(q / arredonda) * arredonda : 0;
        }
        plantar.push({ data: dataPlantio, quantidade, base: arred(base * (1 + config.margem), 0) });
        if (quantidade > 0) {
          espalhar(simulada, hoje, primeiraColheita, somarDias(primeiraColheita, Math.max(7, crop.duracao || 0)), quantidade * rendimento);
        }
      }
    } else if (saidaSemanal > 0) {
      avisos.push(
        forma === "Semente"
          ? `Informe quanto rende 1 m² (em ${unidade}) para calcular a área.`
          : `Informe quanto rende cada muda (em ${unidade}) para calcular a quantidade.`
      );
    }

    if (!meta && diasComColheita === 0 && abertos.length === 0) return; // sem movimento: fora da lista
    if (!meta && saidaSemanal === 0) avisos.push("Sem colheita nas últimas semanas.");
    if (rendimentoOrigem === "unidade") avisos.push("Rendimento de 1 pé por muda até haver plantio finalizado para medir a perda.");
    if (crop.duracao <= 0) avisos.push("Cultura sem duração de colheita: usei 1 semana.");

    culturas.push({
      cultura: crop.nome,
      unidade,
      forma,
      unidadePlantio: forma === "Semente" ? "m²" : "mudas",
      principal: false,
      fixada: !!cfg.principal,
      semanasNaJanela: arred(semanasNaJanela, 1),
      saidaSemanal: arred(saidaSemanal, 1),
      saidaOrigem: meta ? "meta" : "media",
      recente: arred(recente, 1),
      anterior: anterior === null ? null : arred(anterior, 1),
      tendencia,
      diasComColheita,
      rendimento: rendimento === null ? null : arred(rendimento, 2),
      rendimentoOrigem,
      amostrasRendimento,
      plantar,
      cobertura,
      primeiraFalta: falta ? falta.inicio : null,
      plantiosAbertos: abertos.length,
      avisos
    });
  });

  nivelarBandejas(culturas, config);

  // Principais: fixadas + as de colheita mais frequente (até 12 no total).
  const ordem = [...culturas].sort((a, b) =>
    (Number(b.fixada) - Number(a.fixada)) || (b.diasComColheita - a.diasComColheita) || (b.saidaSemanal - a.saidaSemanal)
  );
  const limite = Math.max(12, ordem.filter(c => c.fixada).length);
  ordem.forEach((c, i) => {
    c.principal = c.fixada || (i < limite && c.diasComColheita > 0);
  });

  return { hoje, inicioDados, semanasDeDados, culturas: ordem };
}

/**
 * Deixa o número de bandejas por semana mais regular: quando uma semana passa
 * da média e a anterior está abaixo, antecipa uma bandeja em uma semana
 * (antecipar é seguro: a alface fica pronta antes, nunca depois).
 */
function nivelarBandejas(culturas: PlanoCultura[], config: ConfigPlanejamento) {
  const b = config.bandeja;
  const n = config.semanasPlantio;
  if (!(b > 0) || n < 2) return;
  const comBandeja = culturas.filter(c => c.forma === "Muda" && c.plantar.length === n);
  if (comBandeja.length === 0) return;
  const total = (i: number) => comBandeja.reduce((s, c) => s + (c.plantar.at(i)?.quantidade || 0), 0) / b;
  let soma = 0;
  for (let i = 0; i < n; i++) soma += total(i);
  const alvo = Math.ceil(soma / n);
  for (let passada = 0; passada < n; passada++) {
    let mudou = false;
    for (let i = n - 1; i >= 1; i--) {
      while (total(i) > alvo && total(i - 1) < alvo) {
        const candidata = comBandeja
          .filter(c => (c.plantar.at(i)?.quantidade || 0) >= b && (c.plantar.at(i - 1)?.quantidade || 0) === 0)
          .sort((x, y) => y.saidaSemanal - x.saidaSemanal)[0];
        if (!candidata) break;
        const atual = candidata.plantar.at(i)!, anterior = candidata.plantar.at(i - 1)!;
        atual.quantidade -= b;
        anterior.quantidade += b;
        mudou = true;
      }
    }
    if (!mudou) break;
  }
}

/** Texto do pedido de mudas / sementes, pronto para mandar no WhatsApp. */
export function textoPedido(res: ResultadoPlanejamento, semana: number, bandeja = 0): string {
  const itens = res.culturas.filter(c => c.principal && (c.plantar[semana]?.quantidade || 0) > 0);
  if (itens.length === 0) return "";
  const data = itens[0].plantar[semana].data;
  const d = parseData(data);
  const titulo = `Plantio da semana de ${d ? d.toLocaleDateString("pt-BR") : data}`;
  const linhas = itens.map(c => {
    const q = c.plantar[semana].quantidade;
    if (bandeja > 0 && c.forma === "Muda" && q % bandeja === 0) {
      const n = q / bandeja;
      return `• ${c.cultura}: ${n} bandeja${n > 1 ? "s" : ""} (${q} mudas)`;
    }
    return `• ${c.cultura}: ${q} ${c.unidadePlantio}`;
  });
  return [titulo, ...linhas].join("\n");
}
