import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Purchase, Planting, Harvest, WeatherDay, SystemMetadata } from "../types";
import { Calendar, Package, Droplets, ShieldAlert, Award, AlertCircle, ArrowUpRight, TrendingUp, Sprout } from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  onChangeTab?: (tab: "dashboard" | "crops" | "purchases" | "plantings" | "harvests" | "traceability" | "import" | "guide") => void;
}

const PORTUGUESE_MONTHS = [
  { value: "Todos", label: "Todos os Meses" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export default function Dashboard({ onChangeTab }: DashboardProps) {
  const [lastPurchaseDate, setLastPurchaseDate] = useState<string>("---");
  const [lastPlantingDate, setLastPlantingDate] = useState<string>("---");
  const [lastHarvestDate, setLastHarvestDate] = useState<string>("---");
  
  const [allPlantings, setAllPlantings] = useState<Planting[]>([]);
  const [allHarvests, setAllHarvests] = useState<Harvest[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("Todos");
  const [selectedMonth, setSelectedMonth] = useState<string>("Todos");
  
  const [metadata, setMetadata] = useState<SystemMetadata>({ seloValidade: "", seloVisita: "" });
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);

  // Bento Grid custom statistics
  const [activeLotesCount, setActiveLotesCount] = useState<number>(0);

  useEffect(() => {
    fetchDashboardData();
    fetchWeather();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Get last dates
      const purchasesCol = collection(db, "purchases");
      const qPurchases = query(purchasesCol, orderBy("data", "desc"), limit(1));
      const snapshotPurchases = await getDocs(qPurchases);
      if (!snapshotPurchases.empty) {
        setLastPurchaseDate(snapshotPurchases.docs[0].data().data);
      }

      const plantingsCol = collection(db, "plantings");
      const qPlantings = query(plantingsCol, orderBy("data", "desc"), limit(1));
      const snapshotPlantings = await getDocs(qPlantings);
      if (!snapshotPlantings.empty) {
        setLastPlantingDate(snapshotPlantings.docs[0].data().data);
      }

      const harvestsCol = collection(db, "harvests");
      const qHarvests = query(harvestsCol, orderBy("data", "desc"), limit(1));
      const snapshotHarvests = await getDocs(qHarvests);
      if (!snapshotHarvests.empty) {
        setLastHarvestDate(snapshotHarvests.docs[0].data().data);
      }

      // 2. Active Lotes and Atrasados (Plantings in field past estimated harvest date)
      const allPlantingsSnapshot = await getDocs(plantingsCol);
      const plantingsList = allPlantingsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Planting));
      setAllPlantings(plantingsList);
      
      const activeLotes = plantingsList.filter(p => p.status !== "Finalizado");
      setActiveLotesCount(activeLotes.length);

      // 3. Harvests List
      const allHarvestsSnapshot = await getDocs(harvestsCol);
      const harvestsList = allHarvestsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Harvest));
      setAllHarvests(harvestsList);

      // 4. Certification metadata
      const metaDoc = await getDoc(doc(db, "metadata", "geranium"));
      if (metaDoc.exists()) {
        setMetadata(metaDoc.data() as SystemMetadata);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  const fetchWeather = async () => {
    try {
      setLoadingWeather(true);
      const lat = "-15.83";
      const lon = "-48.05";
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=America%2FSao_Paulo`;
      const res = await fetch(url);
      const json = await res.json();
      
      const forecast: WeatherDay[] = [];
      for (let i = 0; i < 3; i++) {
        const [year, month, day] = json.daily.time[i].split("-");
        forecast.push({
          data: `${day}/${month}`,
          max: Math.round(json.daily.temperature_2m_max[i]),
          min: Math.round(json.daily.temperature_2m_min[i]),
          chuvaProb: json.daily.precipitation_probability_max[i] ?? 0,
          chuvaMm: json.daily.precipitation_sum[i] ?? 0,
        });
      }
      setWeather(forecast);
    } catch (e) {
      console.error("Error fetching weather forecast:", e);
    } finally {
      setLoadingWeather(false);
    }
  };

  const formatToBrazDate = (dateStr: string) => {
    if (!dateStr || dateStr === "---") return "---";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Dynamic values
  const todayStr = new Date().toISOString().split("T")[0];

  const filteredAtrasados = allPlantings.filter(p => {
    if (!p.previsao || p.status === "Finalizado" || p.status === "Colhendo") return false;
    const isDelayed = p.previsao < todayStr;
    if (!isDelayed) return false;

    if (selectedMonth !== "Todos") {
      const parts = p.previsao.split("-"); // YYYY-MM-DD
      if (parts.length === 3) {
        return String(parseInt(parts[1])) === selectedMonth;
      }
      return false;
    }
    return true;
  });

  const filteredHarvests = allHarvests.filter(h => {
    if (selectedYear !== "Todos") {
      const parts = h.data?.split("-"); // YYYY-MM-DD
      return parts && parts[0] === selectedYear;
    }
    return true;
  });

  const totalColhido = filteredHarvests.reduce((sum, h) => sum + (parseFloat(String(h.qtd)) || 0), 0);

  const harvestCounts: { [key: string]: number } = {};
  filteredHarvests.forEach(h => {
    harvestCounts[h.cultura] = (harvestCounts[h.cultura] || 0) + (parseFloat(String(h.qtd)) || 0);
  });

  const topCrops = Object.keys(harvestCounts)
    .map(name => ({ name, qtd: harvestCounts[name] }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);

  const uniqueYears = Array.from(new Set(allHarvests.map(h => {
    const parts = h.data?.split("-");
    return parts && parts[0] ? parts[0] : null;
  }).filter(Boolean))).sort().reverse();

  const getSeloStatus = () => {
    const validadeStr = metadata.seloValidade || "2026-04-03";
    const parts = validadeStr.split("-").map(Number);
    if (parts.length !== 3) {
      return {
        text: "Sem Validade",
        badgeClass: "text-red-600 bg-red-50 border-red-100",
        textColorClass: "text-red-600",
        iconColorClass: "text-red-600",
        containerBorderClass: "border-red-200 bg-red-50/10"
      };
    }

    const [year, month, day] = parts;
    const validade = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validade.setHours(0, 0, 0, 0);

    if (validade < today) {
      return {
        text: "VENCIDO",
        badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
        textColorClass: "text-rose-600 font-extrabold",
        iconColorClass: "text-rose-600",
        containerBorderClass: "border-rose-200 bg-rose-50/10"
      };
    }

    const twoMonthsLater = new Date(today);
    twoMonthsLater.setMonth(today.getMonth() + 2);

    if (validade <= twoMonthsLater) {
      return {
        text: "EXPIRA EM BREVE",
        badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
        textColorClass: "text-amber-600 font-bold",
        iconColorClass: "text-amber-600",
        containerBorderClass: "border-amber-200 bg-amber-50/15"
      };
    }

    return {
      text: "ATIVO",
      badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-100",
      textColorClass: "text-emerald-600 font-bold",
      iconColorClass: "text-emerald-600",
      containerBorderClass: "border-slate-200 bg-white"
    };
  };

  const seloStatus = getSeloStatus();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 id="dashboard-title" className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Controle</h1>
          <p className="text-slate-500 text-sm mt-1">Bem-vindo ao Gestão Orgânicos Geranium.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sincronização</span>
            <span className="text-xs font-bold text-emerald-500">Firebase Conectado</span>
          </div>
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Bento Grid Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        
        {/* KPI 1: Colheita Total Acumulada - col-span-3 */}
        <div className="col-span-1 md:col-span-1 lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-center min-h-[140px]">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Produção Acumulada</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-800">{totalColhido.toLocaleString()}</span>
            <span className="text-emerald-600 text-sm font-bold">Qtd</span>
          </div>
          <span className="text-slate-400 text-[10px] mt-1">Soma de todas as colheitas registradas</span>
        </div>

        {/* KPI 2: Lotes Ativos - col-span-3 (Emerald highlight) */}
        <div className="col-span-1 md:col-span-1 lg:col-span-3 bg-emerald-600 rounded-2xl p-5 shadow-sm flex flex-col justify-center text-white min-h-[140px]">
          <span className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Lotes Ativos</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black">{activeLotesCount}</span>
            <span className="bg-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold">EM CAMPO</span>
          </div>
          <span className="text-emerald-200 text-[10px] mt-1">Canteiros sob monitoramento fisiológico</span>
        </div>

        {/* KPI 3: Selo Orgânico Certificação - col-span-6 */}
        <div className={`col-span-1 md:col-span-2 lg:col-span-6 rounded-2xl border p-5 shadow-sm flex items-center justify-between gap-4 min-h-[140px] transition-colors duration-200 ${seloStatus.containerBorderClass}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border shrink-0 shadow-2xs">
              <Award className={`w-7 h-7 ${seloStatus.iconColorClass}`} />
            </div>
            <div>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-widest block">Selo Orgânico Certificado</span>
              <p className="text-slate-800 font-bold text-sm mt-1">Validade: <span className={seloStatus.textColorClass}>{formatToBrazDate(metadata.seloValidade) || "03/04/2026"}</span></p>
              <p className="text-slate-500 text-xs">Última Auditoria: {formatToBrazDate(metadata.seloVisita) || "12/12/2025"}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md border uppercase ${seloStatus.badgeClass}`}>
              {seloStatus.text}
            </div>
            <div className="text-right text-[10px] text-slate-700 font-extrabold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg uppercase tracking-wider">
              IBD
            </div>
          </div>
        </div>

        {/* Box 4: Últimas Operações (Inventory / Tracking) - col-span-4 */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Últimas Operações</h3>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estoque / Compra</p>
                    <p className="text-sm font-semibold text-slate-800">Última Entrada</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600">{formatToBrazDate(lastPurchaseDate)}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Atividade Campo</p>
                    <p className="text-sm font-semibold text-slate-800">Último Lote</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600">{formatToBrazDate(lastPlantingDate)}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Lançamento Diário</p>
                    <p className="text-sm font-semibold text-slate-800">Última Colheita</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600">{formatToBrazDate(lastHarvestDate)}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Rastreabilidade Ativa</span>
            <span className="text-emerald-500 font-bold">● ONLINE</span>
          </div>
        </div>

        {/* Box 5: Clima em Taguatinga / DF - col-span-8 */}
        <div className="col-span-1 md:col-span-2 lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Clima em Taguatinga / DF</h3>
              <p className="text-xs text-slate-400 mt-0.5">Previsão para planejamento de irrigação e plantio orgânico</p>
            </div>
            <Droplets className="w-6 h-6 text-indigo-500" />
          </div>

          {loadingWeather ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 mt-2">Buscando previsão do tempo...</p>
            </div>
          ) : weather.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Não foi possível carregar a previsão do tempo.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {weather.map((w, index) => (
                <div key={index} className="bg-slate-50 hover:bg-slate-100/70 transition border border-slate-100 p-4 rounded-xl text-center flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{index === 0 ? "Hoje" : index === 1 ? "Amanhã" : w.data}</span>
                    <span className="text-xs text-slate-400 block mt-0.5">{w.data}</span>
                  </div>
                  <div className="my-3">
                    <span className="text-2xl font-black text-slate-800 block">{w.max}°C</span>
                    <span className="text-xs text-slate-400 block">Min: {w.min}°C</span>
                  </div>
                  <div className="bg-indigo-50/50 p-2 rounded-lg text-xs flex flex-col items-center justify-center border border-indigo-100/50">
                    <span className="text-indigo-700 font-semibold">{w.chuvaProb}% chuva</span>
                    <span className="text-slate-500 text-[10px] font-mono">{w.chuvaMm} mm</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Box 6: Atenção: Colheitas Pendentes / Atrasadas - col-span-6 */}
        <div className="col-span-1 md:col-span-1 lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">Atenção Campo</h3>
            </div>
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-2.5 py-1.5 rounded-lg outline-none focus:border-rose-500 cursor-pointer"
            >
              {PORTUGUESE_MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {filteredAtrasados.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Award className="w-10 h-10 text-emerald-500" />
              <p className="text-sm text-slate-700 font-bold mt-2">Nenhum atraso fisiológico!</p>
              <p className="text-xs text-slate-400 mt-1">Todos os canteiros estão no cronograma correto.</p>
            </div>
          ) : (
            <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[280px] pr-1">
              {filteredAtrasados.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-red-50/60 hover:bg-red-50 transition rounded-xl border border-red-100">
                  <div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 tracking-wider">Atrasado</span>
                    <h4 className="font-bold text-slate-800 text-sm mt-1">{p.cultura}</h4>
                    <p className="text-xs text-slate-400">Talhão: {p.talhao} • Lote: <span className="font-mono">{p.id}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Previsão</p>
                    <p className="text-xs font-mono font-bold text-red-600">{formatToBrazDate(p.previsao)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Box 7: Ações Práticas / Atalhos Rápidos - col-span-6 (Dark styling) */}
        <div className="col-span-1 md:col-span-1 lg:col-span-6 bg-slate-900 rounded-3xl p-6 shadow-xl flex flex-col text-white">
          <h3 className="text-lg font-bold text-white mb-4">Ações Práticas</h3>
          <div className="flex flex-col gap-3.5">
            <div 
              onClick={() => onChangeTab?.("plantings")}
              className="p-4 bg-slate-800 rounded-xl hover:bg-slate-700 cursor-pointer transition-all border border-slate-700 active:scale-98 shadow-sm hover:border-slate-500"
            >
              <p className="text-white font-bold text-sm">🌱 Registrar Novo Plantio</p>
              <p className="text-slate-400 text-xs mt-0.5">Vincule sementes e mudas do estoque aos canteiros</p>
            </div>
            <div 
              onClick={() => onChangeTab?.("harvests")}
              className="p-4 bg-slate-800 rounded-xl hover:bg-slate-700 cursor-pointer transition-all border border-slate-700 active:scale-98 shadow-sm hover:border-slate-500"
            >
              <p className="text-white font-bold text-sm">🍓 Lançar Colheita Real</p>
              <p className="text-slate-400 text-xs mt-0.5">Atualize a produção diária de alimentos orgânicos</p>
            </div>
            <div 
              onClick={() => onChangeTab?.("traceability")}
              className="p-4 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-xl border border-emerald-500/30 cursor-pointer transition-all active:scale-98"
            >
              <p className="text-emerald-400 font-bold text-sm">🔍 Rastreabilidade Total</p>
              <p className="text-emerald-500/70 text-xs mt-0.5">Fichas técnicas auditáveis para certificadores</p>
            </div>
          </div>
          <div className="mt-auto pt-4">
            <div className="bg-slate-800/60 p-3 rounded-xl flex items-center justify-between border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Planilha Sync</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] text-emerald-500 font-bold">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Box 8: Top Produção (Colheitas Totais) - col-span-12 */}
        <div className="col-span-1 md:col-span-2 lg:col-span-12 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">Top Produção (Colheitas Totais)</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">Filtrar Ano:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-2.5 py-1.5 rounded-lg outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Todos">Todos os Anos</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {topCrops.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <AlertCircle className="w-10 h-10 text-slate-300" />
              <p className="text-sm text-slate-700 font-bold mt-2">Nenhum registro de colheita ainda.</p>
              <p className="text-xs text-slate-400 mt-1">Lançamentos de colheita alimentarão este gráfico bento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pr-1">
              {topCrops.map((crop, index) => {
                const maxVal = topCrops[0]?.qtd || 1;
                const pct = (crop.qtd / maxVal) * 100;
                return (
                  <div key={index} className="space-y-1.5 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{index + 1}. {crop.name}</span>
                      <span className="text-emerald-700 font-black">{crop.qtd.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">unidades/g</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <motion.div 
                        className="bg-emerald-600 h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: index * 0.05 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

