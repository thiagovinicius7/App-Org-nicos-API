// Testes do planejamento de plantio.
// Para rodar: npx esbuild tests/planejamento.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/plan.cjs && node /tmp/plan.cjs
import { calcularPlanejamento, CONFIG_PADRAO } from "../src/lib/planejamento";
import { somarDias } from "../src/lib/producao";

let ok = 0, fail = 0;
const t = (n: string, cond: boolean, info: any = "") => { cond ? ok++ : fail++; console.log(cond ? "ok   " : "FALHOU", n, cond ? "" : JSON.stringify(info)); };

const hoje = "2026-11-04";
const crops: any[] = [
  { nome: "Alface Crespa verde", unidadeColheita: "UN", dias: 35, duracao: 28 },
  { nome: "Rúcula", unidadeColheita: "MÇ", dias: 35, duracao: 14 },
  { nome: "Banana", unidadeColheita: "KG", dias: 0, duracao: 0 },
  { nome: "Couve", unidadeColheita: "MÇ", dias: 60, duracao: 120, planejamento: { rendimento: 3 } }
];
// 4 semanas de colheita: alface 100 pés/semana (20 por dia útil)
const harvests: any[] = [];
for (let d = 1; d <= 28; d++) {
  const data = somarDias(hoje, -d);
  const dow = new Date(data + "T12:00:00").getDay();
  if (dow === 0 || dow === 6) continue;
  harvests.push({ cultura: "Alface Crespa verde", data, qtd: 20, idPlantio: "x" });
  harvests.push({ cultura: "Banana", data, qtd: 5, idPlantio: "b" });
  harvests.push({ cultura: "Couve", data, qtd: 6, idPlantio: "c" });
}
const perene: any = { id: "b", cultura: "Banana", tipo: "Perene", status: "Colhendo", data: "2026-10-21", quantidade: 0, unidade: "Unidades" };

// 1) Sem nada no campo: planta acima do normal (até 2x), com margem.
let r = calcularPlanejamento(crops, [perene], harvests, CONFIG_PADRAO, hoje);
const alface = r.culturas.find(c => c.cultura === "Alface Crespa verde")!;
t("saída semanal da alface entre 90 e 100 (hoje ainda sem colheita)", alface.saidaSemanal >= 90 && alface.saidaSemanal <= 100, alface.saidaSemanal);
t("perene fica de fora", !r.culturas.some(c => c.cultura === "Banana"));
t("campo vazio: planta acima do normal (1,5x)", alface.plantar[0].quantidade >= 1.4 * alface.plantar[0].base, alface.plantar[0]);
t("campo vazio: avisa da falta que o plantio novo não alcança", alface.avisos.some(a => a.startsWith("Vai faltar")), alface.avisos);
t("aponta falta já na 1ª semana", alface.primeiraFalta === hoje, alface.primeiraFalta);
t("simulação: semanas seguintes diminuem", alface.plantar[3].quantidade < alface.plantar[0].quantidade, alface.plantar.map(p => p.quantidade));

// 2) Regime: um plantio por semana nas últimas semanas, 100 mudas cada.
const regime: any[] = [perene];
for (let i = 1; i <= 10; i++) {
  const data = somarDias(hoje, -7 * i);
  regime.push({ id: `P${i}`, cultura: "Alface Crespa verde", tipo: "Muda", status: "No campo", data, previsao: somarDias(data, 35), quantidade: 100, unidade: "Unidades", totalColhido: 0 });
}
r = calcularPlanejamento(crops, regime, harvests, CONFIG_PADRAO, hoje);
const a2 = r.culturas.find(c => c.cultura === "Alface Crespa verde")!;
t("100 mudas/semana para saída de ~93: fica perto do normal, sem oscilar", a2.plantar.every(p => p.quantidade >= 70 && p.quantidade <= 130), a2.plantar);

// 3) Campo cheio demais: não planta.
const cheio: any[] = [perene, ...regime.slice(1).map(p => ({ ...p, quantidade: 400 }))];
r = calcularPlanejamento(crops, cheio, harvests, CONFIG_PADRAO, hoje);
t("campo cheio: planta 0", r.culturas.find(c => c.cultura === "Alface Crespa verde")!.plantar[0].quantidade === 0);

// 4) Saída maior → planta mais.
const mais = harvests.map(h => h.cultura === "Alface Crespa verde" ? { ...h, qtd: 40 } : h);
r = calcularPlanejamento(crops, regime, mais, CONFIG_PADRAO, hoje);
t("saída dobra → plantio sobe", r.culturas.find(c => c.cultura === "Alface Crespa verde")!.plantar[0].quantidade > a2.plantar[0].quantidade);

// 5) Rendimento informado (couve 3 MÇ por muda) e meta manual.
r = calcularPlanejamento(crops, [perene], harvests, CONFIG_PADRAO, hoje);
const couve = r.culturas.find(c => c.cultura === "Couve")!;
t("couve usa rendimento informado", couve.rendimentoOrigem === "informado" && couve.rendimento === 3, couve);
const comMeta = crops.map(c => c.nome === "Couve" ? { ...c, planejamento: { rendimento: 3, metaSemanal: 60 } } : c);
r = calcularPlanejamento(comMeta, [perene], harvests, CONFIG_PADRAO, hoje);
t("meta semanal substitui a média", r.culturas.find(c => c.cultura === "Couve")!.saidaSemanal === 60);

// 6) Sem rendimento para MÇ: pede o dado em vez de inventar.
const rucH = [...harvests, { cultura: "Rúcula", data: somarDias(hoje, -2), qtd: 30, idPlantio: "r" }];
r = calcularPlanejamento(crops, [perene], rucH, CONFIG_PADRAO, hoje);
const ruc = r.culturas.find(c => c.cultura === "Rúcula")!;
t("rúcula sem rendimento: não sugere número", ruc.plantar.length === 0 && ruc.avisos.some(a => a.includes("rende")), ruc);

// 7) Ignorar tira da lista.
r = calcularPlanejamento(crops.map(c => c.nome === "Couve" ? { ...c, planejamento: { ignorar: true } } : c), [perene], harvests, CONFIG_PADRAO, hoje);
t("ignorar tira da lista", !r.culturas.some(c => c.cultura === "Couve"));

console.log(`\n${ok} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
