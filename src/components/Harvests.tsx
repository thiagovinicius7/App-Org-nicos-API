import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, writeBatch, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Planting, Harvest } from "../types";
import { Calendar, AlertCircle, Play, Save, ChevronRight, ChevronDown, Check, Loader2, ArrowLeftRight, Trash2, Edit2, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HarvestsProps {
  onNotify: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Harvests({ onNotify }: HarvestsProps) {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"daily" | "history">("daily");

  // Daily Harvest panel states
  const [activeDate, setActiveDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [modoColheitaAtivo, setModoColheitaAtivo] = useState<boolean>(false);
  const [sessaoColheitaAtual, setSessaoColheitaAtual] = useState<string>("");
  
  // Local inputs map for active session: { plantingId: qty_string }
  const [valoresSessao, setValoresSessao] = useState<{ [key: string]: string }>({});
  // Status feedback map: { plantingId: "idle" | "saving" | "saved" }
  const [inputFeedback, setInputFeedback] = useState<{ [key: string]: "idle" | "saving" | "saved" }>({});
  
  // History nav states
  const [mesAtual, setMesAtual] = useState<Date>(new Date());
  const [openSessoes, setOpenSessoes] = useState<{ [key: string]: boolean }>({});

  // Modals state
  const [selectedPlantingId, setSelectedPlantingId] = useState<string>("");
  const [selectedPlantingCultura, setSelectedPlantingCultura] = useState<string>("");
  const [selectedPlantingTalhao, setSelectedPlantingTalhao] = useState<string>("");
  
  const [isHistoryLogsOpen, setIsHistoryLogsOpen] = useState<boolean>(false);
  const [historicLogs, setHistoricLogs] = useState<{ data: string; qtd: number }[]>([]);

  const [isEditLogOpen, setIsEditLogOpen] = useState<boolean>(false);
  const [logToEdit, setLogToEdit] = useState<Harvest | null>(null);
  const [editLogQtd, setEditLogQtd] = useState<number>(0);
  const [savingEditLog, setSavingEditLog] = useState<boolean>(false);

  const [isMudarIDOpen, setIsMudarIDOpen] = useState<boolean>(false);
  const [mudarIDTargetPlanting, setMudarIDTargetPlanting] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterTalhao, setFilterTalhao] = useState<string>("Todos");

  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      // Fetch canteiros
      const plantingsSnapshot = await getDocs(collection(db, "plantings"));
      const plantingsList = plantingsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Planting));
      setPlantings(plantingsList);

      // Fetch harvests
      const harvestsSnapshot = await getDocs(collection(db, "harvests"));
      const harvestsList = harvestsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Harvest));
      setHarvests(harvestsList);
    } catch (err) {
      console.error("Error fetching harvests data:", err);
      onNotify("Erro ao buscar dados de colheita.", "error");
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  const getCalculatedStatus = (p: Planting) => {
    if (p.status === "Finalizado") return "Finalizado";
    if (p.status === "Colhendo") return "Colhendo";
    if (!p.previsao) return p.status;
    
    const todayStr = new Date().toISOString().split("T")[0];
    const daysDiff = Math.floor((new Date(todayStr).getTime() - new Date(p.previsao).getTime()) / (1000 * 3600 * 24));
    
    if (p.status === "No campo") {
      if (daysDiff >= 15) return "Colheita atrasada";
      if (daysDiff >= 0) return "Esperando colheita";
    }
    return p.status;
  };

  // Groupings for daily list: 4 categories (No campo plantings are hidden from this view)
  const getGroupCategory = (p: Planting): number => {
    const calcStatus = getCalculatedStatus(p);
    if (calcStatus === "Colheita atrasada") return 2;
    if (calcStatus === "Esperando colheita") return 3;
    
    // Check if plot / talhao is numeric
    const isNumeric = !isNaN(Number(p.talhao)) && p.talhao.trim() !== "";
    return isNumeric ? 0 : 1;
  };

  const categories = [
    { id: 0, label: "🔢 Talhões Numéricos — Em Colheita", color: "text-emerald-700 bg-emerald-100/60 border-emerald-100" },
    { id: 1, label: "🌿 Sítio — Em Colheita", color: "text-teal-700 bg-teal-100/60 border-teal-100" },
    { id: 2, label: "⚠️ Colheita Atrasada", color: "text-rose-700 bg-rose-100/60 border-rose-100" },
    { id: 3, label: "🕐 Esperando Colheita", color: "text-amber-700 bg-amber-100/60 border-amber-100" }
  ];

  const handleIniciarColheitaManual = async (pId: string) => {
    try {
      const docRef = doc(db, "plantings", pId);
      await updateDoc(docRef, { status: "Colhendo" });
      onNotify("Colheita iniciada para o canteiro!", "success");
      fetchData();
    } catch (err) {
      console.error("Error setting canteiro to colhendo:", err);
      onNotify("Erro ao iniciar colheita.", "error");
    }
  };

  const handleToggleHistoryLogs = (pId: string, cult: string) => {
    setSelectedPlantingId(pId);
    setSelectedPlantingCultura(cult);
    
    const logs = harvests
      .filter(h => h.idPlantio === pId)
      .map(h => ({ data: h.data, qtd: h.qtd }))
      .sort((a, b) => b.data.localeCompare(a.data));
    
    setHistoricLogs(logs);
    setIsHistoryLogsOpen(true);
  };

  const handleOpenMudarID = (pId: string, cult: string, th: string) => {
    setSelectedPlantingId(pId);
    setSelectedPlantingCultura(cult);
    setSelectedPlantingTalhao(th);
    setMudarIDTargetPlanting("");
    setIsMudarIDOpen(true);
  };

  const handleConfirmMudarID = async () => {
    if (!selectedPlantingId) return;
    try {
      const batch = writeBatch(db);
      
      // 1. Finalize current planting
      const currentRef = doc(db, "plantings", selectedPlantingId);
      batch.update(currentRef, {
        status: "Finalizado",
        dataFim: activeDate,
        perdas: 0,
        obs: "Finalizado via troca de ID"
      });

      // 2. Start harvest on selected new canteiro if one is chosen
      if (mudarIDTargetPlanting) {
        const nextRef = doc(db, "plantings", mudarIDTargetPlanting);
        batch.update(nextRef, {
          status: "Colhendo"
        });
      }

      await batch.commit();
      onNotify("ID transferido com sucesso!", "success");
      setIsMudarIDOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error swapping planting IDs:", err);
      onNotify("Erro ao transferir ID.", "error");
    }
  };

  const startNewHarvestSession = (): string => {
    const dateForId = activeDate.replace(/-/g, "").substring(2);
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSessaoId = `COL-${dateForId}-${randomHex}`;
    setSessaoColheitaAtual(newSessaoId);
    setModoColheitaAtivo(true);
    setValoresSessao({});
    return newSessaoId;
  };

  const handleAutoSaveQtd = (pId: string, value: string, cult: string, th: string) => {
    setValoresSessao(prev => ({ ...prev, [pId]: value }));

    if (debounceTimers.current[pId]) {
      clearTimeout(debounceTimers.current[pId]);
    }

    const numericVal = parseFloat(value);
    if (!numericVal || numericVal <= 0) return;

    // Set input status to saving
    setInputFeedback(prev => ({ ...prev, [pId]: "saving" }));

    debounceTimers.current[pId] = setTimeout(async () => {
      let currentSession = sessaoColheitaAtual;
      if (!currentSession) {
        currentSession = startNewHarvestSession();
      }

      try {
        const batch = writeBatch(db);
        
        // Check if there is an existing log for this planting in the current session to update, or create a new one
        const existingLog = harvests.find(h => h.idSessao === currentSession && h.idPlantio === pId);
        let diff = numericVal;

        if (existingLog && existingLog.id) {
          const logRef = doc(db, "harvests", existingLog.id);
          batch.update(logRef, { qtd: numericVal });
          diff = numericVal - existingLog.qtd;
        } else {
          const newLogRef = doc(collection(db, "harvests"));
          const payload: Harvest = {
            idSessao: currentSession,
            idPlantio: pId,
            data: activeDate,
            cultura: cult,
            talhao: th,
            qtd: numericVal
          };
          batch.set(newLogRef, payload);
        }

        // Update corresponding planting's running total colhido
        const plantingDoc = plantings.find(p => p.id === pId);
        if (plantingDoc && plantingDoc.id) {
          const plantingRef = doc(db, "plantings", plantingDoc.id);
          const currentTotal = plantingDoc.totalColhido || 0;
          batch.update(plantingRef, {
            totalColhido: currentTotal + diff,
            status: "Colhendo"
          });
        }

        await batch.commit();
        
        setInputFeedback(prev => ({ ...prev, [pId]: "saved" }));
        onNotify("Colheita salva!", "success");
        fetchData();
        
        setTimeout(() => {
          setInputFeedback(prev => ({ ...prev, [pId]: "idle" }));
        }, 3000);

      } catch (err) {
        console.error("Error in auto-saving harvest qty:", err);
        setInputFeedback(prev => ({ ...prev, [pId]: "idle" }));
        onNotify("Erro ao registrar quantidade.", "error");
      }
    }, 1000);
  };

  const handleSaveBulkMassa = async () => {
    let currentSession = sessaoColheitaAtual;
    if (!currentSession) {
      currentSession = startNewHarvestSession();
    }

    try {
      const batch = writeBatch(db);
      let itemsAdded = 0;

      for (const [pId, valStr] of Object.entries(valoresSessao)) {
        const numericVal = parseFloat(valStr as string);
        if (!numericVal || numericVal <= 0) continue;

        const p = plantings.find(pl => pl.id === pId);
        if (!p) continue;

        // Create log document
        const newLogRef = doc(collection(db, "harvests"));
        const payload: Harvest = {
          idSessao: currentSession,
          idPlantio: pId,
          data: activeDate,
          cultura: p.cultura,
          talhao: p.talhao,
          qtd: numericVal
        };
        batch.set(newLogRef, payload);

        // Update planting total
        if (p.id) {
          const plantingRef = doc(db, "plantings", p.id);
          const currentTotal = p.totalColhido || 0;
          batch.update(plantingRef, {
            totalColhido: currentTotal + numericVal,
            status: "Colhendo"
          });
        }
        itemsAdded++;
      }

      if (itemsAdded === 0) {
        onNotify("Nenhuma quantidade válida preenchida.", "info");
        return;
      }

      await batch.commit();
      onNotify(`Sessão de colheita gravada com sucesso! (${itemsAdded} lançamentos)`, "success");
      setValoresSessao({});
      fetchData(false);
    } catch (err) {
      console.error("Error bulk saving harvests:", err);
      onNotify("Erro ao gravar colheita em lote.", "error");
    }
  };

  const handleEncerrarSessao = () => {
    setSessaoColheitaAtual("");
    setModoColheitaAtivo(false);
    setValoresSessao({});
    onNotify("Sessão encerrada com sucesso.", "info");
  };

  // Nav month utilities
  const handleNavMonth = (direction: number) => {
    const nextDate = new Date(mesAtual);
    nextDate.setMonth(nextDate.getMonth() + direction);
    setMesAtual(nextDate);
  };

  const formatMonthLabel = (): string => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${months[mesAtual.getMonth()]} ${mesAtual.getFullYear()}`;
  };

  const toggleSessaoAccordion = (sId: string) => {
    setOpenSessoes(prev => ({ ...prev, [sId]: !prev[sId] }));
  };

  // Log Adjustments
  const handleOpenEditLog = (log: Harvest) => {
    setLogToEdit(log);
    setEditLogQtd(log.qtd);
    setIsEditLogOpen(true);
  };

  const handleSaveEditLog = async () => {
    if (!logToEdit || !logToEdit.id) return;
    try {
      setSavingEditLog(true);
      const batch = writeBatch(db);

      const diff = editLogQtd - logToEdit.qtd;

      // 1. Update harvest log quantity
      const logRef = doc(db, "harvests", logToEdit.id);
      batch.update(logRef, { qtd: editLogQtd });

      // 2. Adjust planting's cumulative total
      const plantingDoc = plantings.find(p => p.id === logToEdit.idPlantio);
      if (plantingDoc && plantingDoc.id) {
        const plantingRef = doc(db, "plantings", plantingDoc.id);
        const currentTotal = plantingDoc.totalColhido || 0;
        batch.update(plantingRef, {
          totalColhido: currentTotal + diff
        });
      }

      await batch.commit();
      onNotify("Lançamento ajustado com sucesso!", "success");
      setIsEditLogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error adjusting log:", err);
      onNotify("Erro ao ajustar o lançamento.", "error");
    } finally {
      setSavingEditLog(false);
    }
  };

  const handleDeleteLog = async (log: Harvest) => {
    if (!log.id) return;
    if (window.confirm(`Deseja excluir o lançamento de ${log.qtd} da cultura ${log.cultura}?`)) {
      try {
        const batch = writeBatch(db);

        // 1. Delete harvest log doc
        const logRef = doc(db, "harvests", log.id);
        batch.delete(logRef);

        // 2. Decrement planting's running total
        const plantingDoc = plantings.find(p => p.id === log.idPlantio);
        if (plantingDoc && plantingDoc.id) {
          const plantingRef = doc(db, "plantings", plantingDoc.id);
          const currentTotal = plantingDoc.totalColhido || 0;
          batch.update(plantingRef, {
            totalColhido: Math.max(0, currentTotal - log.qtd)
          });
        }

        await batch.commit();
        onNotify("Lançamento excluído com sucesso!", "success");
        fetchData();
      } catch (err) {
        console.error("Error deleting log:", err);
        onNotify("Erro ao excluir lançamento.", "error");
      }
    }
  };

  // Filter canteiros that are actively on list (No campo, colhendo, delayed, or wait)
  // Plantings that are Finalizado are strictly ignored
  const uniqueTalhoes = Array.from(new Set(plantings.map(p => p.talhao).filter(Boolean))).sort();

  const visibleCanteiros = plantings.filter(p => {
    if (p.status === "Finalizado" || p.status === "No campo") return false;
    
    const matchesSearch = p.cultura.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
                          
    const matchesTalhao = filterTalhao === "Todos" || p.talhao === filterTalhao;
    
    return matchesSearch && matchesTalhao;
  });

  // Nav Month history calculations
  const targetYear = mesAtual.getFullYear();
  const targetMonth = mesAtual.getMonth() + 1; // 1-indexed

  const monthlyHarvests = harvests.filter(h => {
    const parts = h.data.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      return year === targetYear && month === targetMonth;
    }
    return false;
  });

  // Group monthly logs by day and then by session ID
  const logsByDay: { [date: string]: { [sessao: string]: Harvest[] } } = {};
  monthlyHarvests.forEach(h => {
    if (!logsByDay[h.data]) {
      logsByDay[h.data] = {};
    }
    if (!logsByDay[h.data][h.idSessao]) {
      logsByDay[h.data][h.idSessao] = [];
    }
    logsByDay[h.data][h.idSessao].push(h);
  });

  const sortedDays = Object.keys(logsByDay).sort().reverse();

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Painel de Colheita Diária</h1>
          <p className="text-slate-500 text-sm mt-1">Lançamento de colheitas, sessões acumuladas e ajustes de histórico.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-bold">
          {viewMode === "daily" && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm text-slate-700">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Data:</span>
              <input
                type="date"
                disabled={modoColheitaAtivo}
                value={activeDate}
                onChange={(e) => setActiveDate(e.target.value)}
                className="bg-transparent border-0 outline-none text-slate-800 p-0 text-sm cursor-pointer disabled:opacity-50 font-bold"
              />
            </div>
          )}

          <button
            onClick={() => {
              setViewMode(viewMode === "daily" ? "history" : "daily");
              setModoColheitaAtivo(false);
              setSessaoColheitaAtual("");
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition text-sm cursor-pointer border border-slate-200"
          >
            <Clock className="w-4 h-4" />
            {viewMode === "daily" ? "Histórico / Ajustes" : "Voltar ao Painel"}
          </button>

          {viewMode === "daily" && !modoColheitaAtivo && (
            <button
              onClick={() => setModoColheitaAtivo(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-sm cursor-pointer shadow-xs"
            >
              🧺 Nova Colheita
            </button>
          )}

          {viewMode === "daily" && modoColheitaAtivo && (
            <button
              onClick={handleSaveBulkMassa}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-sm shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Gravar Colheita
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {viewMode === "daily" ? (
          <motion.div
            key="daily-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar por cultura ou ID do canteiro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-rose-500 outline-none transition font-semibold text-slate-800"
                />
              </div>
              <div className="w-full sm:w-[200px]">
                <select
                  value={filterTalhao}
                  onChange={(e) => setFilterTalhao(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-rose-500 outline-none transition font-bold text-slate-700 cursor-pointer"
                >
                  <option value="Todos">Todos os Talões</option>
                  {uniqueTalhoes.map(t => (
                    <option key={t} value={t}>Talhão {t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active session banner */}
            {sessaoColheitaAtual && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex justify-between items-center text-sm text-amber-900 font-bold shadow-3xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span>Sessão Ativa: <span className="font-mono font-bold text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded">{sessaoColheitaAtual}</span></span>
                </div>
                <button
                  onClick={handleEncerrarSessao}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Encerrar Sessão
                </button>
              </div>
            )}

            {/* List Table Grouped by Category */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
                <p className="text-sm text-slate-400 mt-2">Buscando canteiros ativos...</p>
              </div>
            ) : plantings.filter(p => p.status !== "Finalizado" && p.status !== "No campo").length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 text-center p-6 shadow-sm">
                <AlertCircle className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700 mt-3">Nenhum plantio pronto para colheita.</p>
                <p className="text-xs text-slate-400 mt-1">Apenas canteiros com status "Colhendo", "Esperando colheita" ou "Atrasado" aparecem aqui.</p>
              </div>
            ) : visibleCanteiros.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 text-center p-6 shadow-sm">
                <AlertCircle className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700 mt-3">Nenhum plantio encontrado.</p>
                <p className="text-xs text-slate-400 mt-1">Tente ajustar seus termos de busca ou filtros.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map((cat) => {
                  const catItems = visibleCanteiros
                    .filter(p => getGroupCategory(p) === cat.id)
                    .sort((a, b) => a.cultura.localeCompare(b.cultura, "pt-BR"));
                  if (catItems.length === 0) return null;

                  return (
                    <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className={`p-4 border-b border-slate-200 flex justify-between items-center ${cat.color}`}>
                        <h2 className="text-xs font-black uppercase tracking-widest">{cat.label}</h2>
                        <span className="text-xs font-mono font-bold">({catItems.length})</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <th className="p-4">Canteiro ID / Cultura</th>
                              <th className="p-4 text-center">Talhão</th>
                              <th className="p-4 text-center">Previsão</th>
                              <th className="p-4 text-center">Acumulado</th>
                              <th className="p-4 text-right w-[200px]">Lançar Qtd</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {catItems.map((p) => {
                              const calcStatus = getCalculatedStatus(p);
                              const isColhendo = calcStatus === "Colhendo";
                              
                              const qtyVal = valoresSessao[p.id!] || "";
                              const inputState = inputFeedback[p.id!] || "idle";

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/30 transition">
                                  <td className="p-4">
                                    <span className="font-mono text-[10px] text-slate-400 font-bold block">{p.id}</span>
                                    <span className="font-bold text-slate-800 text-sm block">{p.cultura}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Tipo: {p.tipo}</span>
                                  </td>
                                  <td className="p-4 text-center font-bold text-slate-700">{p.talhao}</td>
                                  <td className="p-4 text-center">
                                    <button
                                      onClick={() => handleToggleHistoryLogs(p.id!, p.cultura)}
                                      className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full hover:bg-rose-100 transition cursor-pointer"
                                    >
                                      {calcStatus}
                                    </button>
                                    <span className="text-[10px] text-slate-400 font-medium block mt-1">Prev: {p.previsao ? p.previsao.split("-").reverse().slice(0, 2).join("/") : "—"}</span>
                                  </td>
                                  <td className="p-4 text-center font-mono text-xs">
                                    <span className="font-bold text-slate-800">{p.totalColhido}</span> / {p.quantidade} {p.unidade}
                                  </td>
                                  <td className="p-4 text-right">
                                    {modoColheitaAtivo ? (
                                      isColhendo ? (
                                        <div className="flex items-center gap-2 justify-end">
                                          <input
                                            type="number"
                                            placeholder="Qtd"
                                            value={qtyVal}
                                            onChange={(e) => setValoresSessao(prev => ({ ...prev, [p.id!]: e.target.value }))}
                                            className="w-20 px-2 py-1.5 text-center font-bold border border-slate-200 rounded-lg text-xs outline-none transition font-mono bg-white focus:border-rose-500 text-slate-800"
                                          />
                                          <button
                                            onClick={() => handleOpenMudarID(p.id!, p.cultura, p.talhao)}
                                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer border border-slate-200"
                                          >
                                            <ArrowLeftRight className="w-3 h-3" />
                                            Troca ID
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleIniciarColheitaManual(p.id!)}
                                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                                        >
                                          <Play className="w-3 h-3 fill-white" />
                                          Iniciar Colheita
                                        </button>
                                      )
                                    ) : (
                                      <span className="text-xs text-slate-400 italic font-medium">Ative o modo Basket</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Nav Month controller */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm max-w-sm mx-auto font-bold">
              <button onClick={() => handleNavMonth(-1)} className="p-2 hover:bg-slate-150 rounded-lg transition text-slate-500 hover:text-slate-700 cursor-pointer">◀</button>
              <span className="font-bold text-slate-800 text-sm">{formatMonthLabel()}</span>
              <button onClick={() => handleNavMonth(1)} className="p-2 hover:bg-slate-150 rounded-lg transition text-slate-500 hover:text-slate-700 cursor-pointer">▶</button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
                <p className="text-sm text-slate-400 mt-2">Buscando histórico...</p>
              </div>
            ) : sortedDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm text-center p-6">
                <AlertCircle className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700 mt-3">Nenhum registro encontrado para este mês.</p>
                <p className="text-xs text-slate-400 mt-1">Sessões de colheitas gravadas aparecerão agrupadas aqui.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDays.map((day) => {
                  const sessoesMap = logsByDay[day];
                  const [year, month, dNum] = day.split("-");
                  const dayDisplay = `${dNum}/${month}/${year}`;
                  const totalDayQty = Object.values(sessoesMap).flat().reduce((s, h) => s + h.qtd, 0);

                  return (
                    <div key={day} className="space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="font-bold text-indigo-900 text-sm">📅 {dayDisplay}</span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Total: {totalDayQty}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(sessoesMap).map(([sId, logs]) => {
                          const isAccordionOpen = openSessoes[sId] ?? false;
                          const totalSessaoQty = logs.reduce((s, h) => s + h.qtd, 0);

                          return (
                            <div key={sId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-3xs">
                              {/* Accordion Trigger */}
                              <button
                                onClick={() => toggleSessaoAccordion(sId)}
                                className="w-full p-4 flex justify-between items-center hover:bg-slate-50/50 transition text-left cursor-pointer"
                              >
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-mono text-slate-400 block font-bold">{sId}</span>
                                  <span className="text-xs font-bold text-slate-700">{logs.length} canteiro{logs.length > 1 ? "s" : ""} colhido{logs.length > 1 ? "s" : ""}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-extrabold text-emerald-600 text-sm">{totalSessaoQty} total</span>
                                  {isAccordionOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </div>
                              </button>

                              {/* Accordion Content */}
                              <AnimatePresence>
                                {isAccordionOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-slate-100 divide-y divide-slate-150 bg-slate-50/35"
                                  >
                                    {logs.map((log) => (
                                      <div key={log.id} className="p-3.5 flex justify-between items-center text-xs">
                                        <div>
                                          <span className="font-bold text-slate-800 text-sm block">{log.cultura}</span>
                                          <span className="text-[10px] text-slate-400 font-bold">Talhão: {log.talhao} • Plantio: {log.idPlantio}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="font-bold text-slate-900 font-mono text-sm">{log.qtd}</span>
                                          <button
                                            onClick={() => handleOpenEditLog(log)}
                                            className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition cursor-pointer"
                                            title="Editar colheita"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteLog(log)}
                                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition cursor-pointer"
                                            title="Excluir colheita"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Modal: Past Harvest Logs */}
      {isHistoryLogsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsHistoryLogsOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative z-10 border border-slate-200"
          >
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block font-bold">{selectedPlantingId}</span>
                <h3 className="font-bold text-slate-800">{selectedPlantingCultura} (Colheitas)</h3>
              </div>
              <button onClick={() => setIsHistoryLogsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 max-h-[250px] overflow-y-auto">
              {historicLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4 font-medium">Nenhuma colheita registrada ainda.</p>
              ) : (
                <table className="w-full text-left text-xs divide-y divide-slate-150">
                  <thead>
                    <tr className="text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">
                      <th className="pb-2">Data da Colheita</th>
                      <th className="pb-2 text-right">Qtd Colhida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono font-bold">
                    {historicLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-slate-600">{log.data.split("-").reverse().join("/")}</td>
                        <td className="py-2 text-right text-emerald-600">{log.qtd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50/50">
              <button
                onClick={() => setIsHistoryLogsOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition cursor-pointer border border-slate-200"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Edit log quantity */}
      {isEditLogOpen && logToEdit && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsEditLogOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative z-10 border border-slate-200"
          >
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-indigo-900">Ajustar Quantidade Colhida</h3>
              <button onClick={() => setIsEditLogOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 font-semibold">
                Cultura: <span className="font-bold text-slate-800">{logToEdit.cultura}</span> • Talhão: <span className="font-bold text-slate-800">{logToEdit.talhao}</span>
              </p>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Nova Quantidade</label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="0.01"
                  value={editLogQtd}
                  onChange={(e) => setEditLogQtd(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-sm focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50/50">
              <button
                onClick={handleSaveEditLog}
                disabled={savingEditLog}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1 cursor-pointer"
              >
                {savingEditLog && <Loader2 className="w-4 h-4 animate-spin" />}
                Atualizar
              </button>
              <button
                onClick={() => setIsEditLogOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition cursor-pointer border border-slate-200"
              >
                Sair
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Swap Planting ID (Mudar ID) */}
      {isMudarIDOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsMudarIDOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative z-10 border border-slate-200"
          >
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-indigo-900">Transferir ID do Canteiro</h3>
              <button onClick={() => setIsMudarIDOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 font-semibold">
                Trocar canteiro de <span className="font-bold text-slate-800">{selectedPlantingCultura}</span> (Talhão: {selectedPlantingTalhao})
              </p>
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Próximo canteiro de colheita</label>
                <select
                  value={mudarIDTargetPlanting}
                  onChange={(e) => setMudarIDTargetPlanting(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 text-xs text-slate-800 rounded-lg outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="">Apenas Finalizar Plantio Atual</option>
                  {plantings
                    .filter(p => p.cultura === selectedPlantingCultura && p.id !== selectedPlantingId && p.status !== "Finalizado")
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        Talhão: {p.talhao} - Prev: {p.previsao ? p.previsao.split("-").reverse().slice(0, 2).join("/") : "N/A"}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50/50 font-bold">
              <button
                onClick={handleConfirmMudarID}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer"
              >
                Confirmar Troca
              </button>
              <button
                onClick={() => setIsMudarIDOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition cursor-pointer border border-slate-200"
              >
                Sair
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
