import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, updateDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Planting, Harvest, Crop } from "../types";
import { 
  Calendar, 
  AlertCircle, 
  Play, 
  Save, 
  Check, 
  Loader2, 
  ArrowLeftRight, 
  X, 
  Search, 
  Sprout 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MobileHarvestAppProps {
  onNotify: (msg: string, type: "success" | "error" | "info") => void;
  onExitMobile?: () => void;
}

export default function MobileHarvestApp({ onNotify, onExitMobile }: MobileHarvestAppProps) {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Daily Harvest panel states
  const [activeDate, setActiveDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [modoColheitaAtivo, setModoColheitaAtivo] = useState<boolean>(false);
  const [sessaoColheitaAtual, setSessaoColheitaAtual] = useState<string>("");
  
  // Local inputs map: { plantingId: qty_string }
  const [valoresSessao, setValoresSessao] = useState<{ [key: string]: string }>({});

  // Modals state
  const [selectedPlantingId, setSelectedPlantingId] = useState<string>("");
  const [selectedPlantingCultura, setSelectedPlantingCultura] = useState<string>("");
  const [selectedPlantingTalhao, setSelectedPlantingTalhao] = useState<string>("");
  
  const [isHistoryLogsOpen, setIsHistoryLogsOpen] = useState<boolean>(false);
  const [historicLogs, setHistoricLogs] = useState<{ data: string; qtd: number }[]>([]);

  const [isMudarIDOpen, setIsMudarIDOpen] = useState<boolean>(false);
  const [mudarIDTargetPlanting, setMudarIDTargetPlanting] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterTalhao, setFilterTalhao] = useState<string>("Todos");

  // Keep an ordered list of input refs to allow pressing Enter or Next to advance
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchData(true);
  }, []);

  const fetchData = async (showInitialSpinner = false) => {
    try {
      if (showInitialSpinner) {
        setInitialLoading(true);
      }
      const plantingsSnapshot = await getDocs(collection(db, "plantings"));
      const plantingsList = plantingsSnapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          docId: d.id,
          id: data.id || d.id,
        } as Planting;
      });
      setPlantings(plantingsList);

      const harvestsSnapshot = await getDocs(collection(db, "harvests"));
      const harvestsList = harvestsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Harvest));
      setHarvests(harvestsList);

      const cropsSnapshot = await getDocs(collection(db, "crops"));
      const cropsList = cropsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Crop));
      setCrops(cropsList);
    } catch (err) {
      console.error("Error fetching harvests data:", err);
      onNotify("Erro ao buscar dados de colheita.", "error");
    } finally {
      if (showInitialSpinner) {
        setInitialLoading(false);
      }
    }
  };

  const getCropHarvestUnit = (culturaName: string, fallback?: string): string => {
    if (!culturaName) return fallback || "kg";
    const found = crops.find(c => c.nome.toLowerCase().trim() === culturaName.toLowerCase().trim());
    return found?.unidadeColheita || fallback || "kg";
  };

  const getPlantingHarvestedTotal = (p: Planting): number => {
    const pId = p.id;
    const pDocId = p.docId;
    const harvestSum = harvests
      .filter(h => (pId && h.idPlantio === pId) || (pDocId && h.idPlantio === pDocId))
      .reduce((acc, h) => acc + (Number(h.qtd) || 0), 0);
    return harvestSum > 0 ? harvestSum : (p.totalColhido || 0);
  };

  const [showNoCampo, setShowNoCampo] = useState<boolean>(false);

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

  const getGroupCategory = (p: Planting): number => {
    const calcStatus = getCalculatedStatus(p);
    if (calcStatus === "Colheita atrasada") return 2;
    if (calcStatus === "Esperando colheita") return 3;
    if (calcStatus === "No campo") return 4;
    
    if (p.displayInSitio) return 1;

    const isNumeric = !isNaN(Number(p.talhao)) && p.talhao.trim() !== "";
    return isNumeric ? 0 : 1;
  };

  const handleToggleDisplayInSitio = async (planting: Planting) => {
    const targetDocId = planting.docId || planting.id;
    if (!targetDocId) return;
    const newValue = !planting.displayInSitio;
    try {
      const pRef = doc(db, "plantings", targetDocId);
      await updateDoc(pRef, { displayInSitio: newValue });
      
      setPlantings(prev => prev.map(p => (p.id === planting.id || p.docId === targetDocId) ? { ...p, displayInSitio: newValue } : p));
      
      onNotify(
        newValue 
          ? `Canteiro ${planting.id} movido para exibição no Sítio!` 
          : `Canteiro ${planting.id} retornado para Talhões Numéricos.`, 
        "success"
      );
    } catch (err) {
      console.error("Error toggling displayInSitio:", err);
      onNotify("Erro ao alterar exibição no Sítio.", "error");
    }
  };

  const categories = [
    { id: 0, label: "🔢 Talhões Numéricos — Em Colheita", color: "text-emerald-700 bg-emerald-100/60 border-emerald-100" },
    { id: 1, label: "🌿 Sítio — Em Colheita", color: "text-teal-700 bg-teal-100/60 border-teal-100" },
    { id: 2, label: "⚠️ Colheita Atrasada", color: "text-rose-700 bg-rose-100/60 border-rose-100" },
    { id: 3, label: "🕐 Esperando Colheita", color: "text-amber-700 bg-amber-100/60 border-amber-100" },
    { id: 4, label: "🌱 No Campo — Plantios em Desenvolvimento", color: "text-sky-700 bg-sky-100/60 border-sky-100" }
  ];

  const handleIniciarColheitaManual = async (pId: string) => {
    try {
      const pDoc = plantings.find(p => p.id === pId || p.docId === pId);
      const targetDocId = pDoc?.docId || pDoc?.id || pId;
      const docRef = doc(db, "plantings", targetDocId);
      await updateDoc(docRef, { status: "Colhendo" });
      onNotify("Colheita iniciada para o canteiro!", "success");
      fetchData(false);
    } catch (err) {
      console.error("Error setting canteiro to colhendo:", err);
      onNotify("Erro ao iniciar colheita.", "error");
    }
  };

  const handleToggleHistoryLogs = (pId: string, cult: string) => {
    setSelectedPlantingId(pId);
    setSelectedPlantingCultura(cult);
    
    const pDoc = plantings.find(p => p.id === pId || p.docId === pId);
    const targetId = pDoc?.id || pId;
    const targetDocId = pDoc?.docId;

    const logs = harvests
      .filter(h => h.idPlantio === pId || h.idPlantio === targetId || (targetDocId && h.idPlantio === targetDocId))
      .map(h => ({ data: h.data, qtd: h.qtd }))
      .sort((a, b) => b.data.localeCompare(a.data));
    
    setHistoricLogs(logs);
    setIsHistoryLogsOpen(true);
  };

  const [isSwappingID, setIsSwappingID] = useState<boolean>(false);

  const handleOpenMudarID = (pId: string, cult: string, th: string) => {
    setSelectedPlantingId(pId);
    setSelectedPlantingCultura(cult);
    setSelectedPlantingTalhao(th);
    
    // Auto-select the first available planting for this crop if exists
    const candidates = plantings.filter(
      p => p.cultura.trim().toLowerCase() === cult.trim().toLowerCase() && 
           p.id !== pId && 
           p.docId !== pId && 
           p.status !== "Finalizado"
    );
    if (candidates.length > 0) {
      setMudarIDTargetPlanting(candidates[0].id || candidates[0].docId || "");
    } else {
      setMudarIDTargetPlanting("");
    }
    
    setIsMudarIDOpen(true);
  };

  const handleConfirmMudarID = async () => {
    if (!selectedPlantingId) {
      onNotify("Nenhum canteiro de origem selecionado.", "error");
      return;
    }
    try {
      setIsSwappingID(true);
      
      // 1. Find and finalize the current planting
      const currentDoc = plantings.find(p => p.id === selectedPlantingId || p.docId === selectedPlantingId);
      const currentDocId = currentDoc?.docId || currentDoc?.id || selectedPlantingId;
      
      if (!currentDocId) {
        throw new Error("ID do canteiro atual não encontrado.");
      }
      
      const currentRef = doc(db, "plantings", currentDocId);
      await updateDoc(currentRef, {
        status: "Finalizado",
        dataFim: activeDate,
        perdas: 0,
        obs: "Finalizado via troca de ID no app celular"
      });

      // 2. Start harvest on the newly chosen planting if one was selected
      if (mudarIDTargetPlanting) {
        const nextDoc = plantings.find(p => p.id === mudarIDTargetPlanting || p.docId === mudarIDTargetPlanting);
        const nextDocId = nextDoc?.docId || nextDoc?.id || mudarIDTargetPlanting;
        
        if (nextDocId) {
          const nextRef = doc(db, "plantings", nextDocId);
          await updateDoc(nextRef, {
            status: "Colhendo"
          });
        }
      }

      onNotify("ID transferido com sucesso!", "success");
      setIsMudarIDOpen(false);
      await fetchData(false);
    } catch (err) {
      console.error("Error swapping planting IDs:", err);
      onNotify("Erro ao transferir ID: " + (err instanceof Error ? err.message : "Erro desconhecido"), "error");
    } finally {
      setIsSwappingID(false);
    }
  };

  const startNewHarvestSession = (): string => {
    const dateForId = activeDate.replace(/-/g, "").substring(2);
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSessaoId = `COL-${dateForId}-${randomHex}`;
    setSessaoColheitaAtual(newSessaoId);
    setModoColheitaAtivo(true);
    return newSessaoId;
  };

  // Bulk Save all filled items cleanly at once without disrupting the user's focus
  const handleSaveBulkMassa = async () => {
    let currentSession = sessaoColheitaAtual;
    if (!currentSession) {
      currentSession = startNewHarvestSession();
    }

    const entriesToSave = Object.entries(valoresSessao).filter(([_, valStr]) => {
      const n = parseFloat(valStr as string);
      return !isNaN(n) && n > 0;
    });

    if (entriesToSave.length === 0) {
      onNotify("Nenhuma quantidade preenchida para gravar.", "info");
      return;
    }

    try {
      setIsSaving(true);
      let itemsAdded = 0;
      const newHarvestsToAdd: Harvest[] = [];

      const savePromises = entriesToSave.map(async ([pId, valStr]) => {
        const numericVal = parseFloat(valStr as string);
        const p = plantings.find(pl => pl.id === pId || pl.docId === pId);
        if (!p) return;

        const effectivePlantingId = p.id || p.docId || pId;

        // 1. Create harvest log using setDoc on generated ref
        const harvestDocRef = doc(collection(db, "harvests"));
        const payload: Harvest = {
          idSessao: currentSession,
          idPlantio: effectivePlantingId,
          data: activeDate,
          cultura: p.cultura,
          talhao: p.talhao,
          qtd: numericVal
        };
        await setDoc(harvestDocRef, payload);
        newHarvestsToAdd.push({ ...payload, id: harvestDocRef.id });

        // 2. Update planting total and status
        const targetDocId = p.docId || p.id;
        const currentSum = getPlantingHarvestedTotal(p);
        const newTotal = currentSum + numericVal;

        if (targetDocId) {
          const plantingRef = doc(db, "plantings", targetDocId);
          try {
            await updateDoc(plantingRef, {
              totalColhido: newTotal,
              status: "Colhendo"
            });
          } catch (updateErr) {
            console.warn("Retrying planting update with setDoc merge:", updateErr);
            await setDoc(plantingRef, {
              totalColhido: newTotal,
              status: "Colhendo"
            }, { merge: true });
          }
        }
        itemsAdded++;
      });

      // Wrap in Promise.all
      await Promise.all(savePromises);

      // Update local state immediately for instant feedback
      setHarvests(prev => [...prev, ...newHarvestsToAdd]);
      setPlantings(prev => prev.map(p => {
        const matching = entriesToSave.find(([pId]) => p.id === pId || p.docId === pId);
        if (matching) {
          const addVal = parseFloat(matching[1] as string) || 0;
          return {
            ...p,
            totalColhido: (p.totalColhido || 0) + addVal,
            status: "Colhendo"
          };
        }
        return p;
      }));

      onNotify(`Colheita gravada com sucesso! (${itemsAdded} itens)`, "success");
      setValoresSessao({});
      setIsSaving(false);

      // Sync fresh data from server in the background
      fetchData(false).catch(err => console.warn("Background fetch warning:", err));
    } catch (err) {
      console.error("Error bulk saving harvests:", err);
      onNotify("Erro ao gravar colheita: " + (err instanceof Error ? err.message : "Erro de conexão"), "error");
      setIsSaving(false);
    }
  };

  const handleEncerrarSessao = () => {
    setSessaoColheitaAtual("");
    setModoColheitaAtivo(false);
    setValoresSessao({});
    onNotify("Sessão encerrada com sucesso.", "info");
  };

  const uniqueTalhoes = Array.from(new Set(plantings.map(p => p.talhao).filter(Boolean))).sort();

  const visibleCanteiros = plantings.filter(p => {
    if (p.status === "Finalizado") return false;
    
    // If it is 'No campo' (not delayed, not waiting), only show if showNoCampo is enabled or user searched
    const calcStatus = getCalculatedStatus(p);
    if (calcStatus === "No campo" && !showNoCampo && !searchTerm.trim()) {
      return false;
    }
    
    const matchesSearch = p.cultura.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
                          
    const matchesTalhao = filterTalhao === "Todos" || p.talhao === filterTalhao;
    
    return matchesSearch && matchesTalhao;
  });

  // Calculate flatten list of visible inputs for keyboard navigation across all displayed items
  const allOrderedVisibleItems: Planting[] = [];
  categories.forEach(cat => {
    const catItems = visibleCanteiros
      .filter(p => getGroupCategory(p) === cat.id)
      .sort((a, b) => a.cultura.localeCompare(b.cultura, "pt-BR"));
    catItems.forEach(item => {
      allOrderedVisibleItems.push(item);
    });
  });

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentPlantingId: string) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const currentIndex = allOrderedVisibleItems.findIndex(p => p.id === currentPlantingId);
      if (currentIndex !== -1 && currentIndex < allOrderedVisibleItems.length - 1) {
        const nextPlanting = allOrderedVisibleItems[currentIndex + 1];
        const nextInput = inputRefs.current[nextPlanting.id!];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      } else if (e.key === "Enter") {
        // If it's the last input, trigger bulk save or blur
        handleSaveBulkMassa();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = allOrderedVisibleItems.findIndex(p => p.id === currentPlantingId);
      if (currentIndex > 0) {
        const prevPlanting = allOrderedVisibleItems[currentIndex - 1];
        const prevInput = inputRefs.current[prevPlanting.id!];
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-28">
      
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-xs">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-800 leading-tight">Colheita Geranium</h1>
            <p className="text-[10px] text-slate-400 font-medium">Modo Campo / Celular</p>
          </div>
        </div>

        {onExitMobile && (
          <button
            onClick={onExitMobile}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition cursor-pointer border border-slate-200"
          >
            Painel Completo
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="p-3 sm:p-4 max-w-3xl mx-auto space-y-4">
        
        {/* Header Controls (Date + Nova Colheita / Gravar) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 flex-1">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="font-bold">Data:</span>
              <input
                type="date"
                disabled={modoColheitaAtivo}
                value={activeDate}
                onChange={(e) => setActiveDate(e.target.value)}
                className="bg-transparent border-0 outline-none text-slate-800 p-0 text-xs cursor-pointer disabled:opacity-50 font-bold w-full"
              />
            </div>

            {!modoColheitaAtivo ? (
              <button
                onClick={() => {
                  setModoColheitaAtivo(true);
                  if (!sessaoColheitaAtual) startNewHarvestSession();
                }}
                className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer whitespace-nowrap"
              >
                🧺 Nova Colheita
              </button>
            ) : (
              <button
                onClick={handleSaveBulkMassa}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer whitespace-nowrap"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gravando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Gravar Colheita
                  </>
                )}
              </button>
            )}
          </div>

          {/* Search & Talhão Filter & No Campo Toggle */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar por cultura ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-rose-500 outline-none transition font-semibold text-slate-800"
                />
              </div>
              <div className="w-[130px]">
                <select
                  value={filterTalhao}
                  onChange={(e) => setFilterTalhao(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-rose-500 outline-none transition font-bold text-slate-700 cursor-pointer"
                >
                  <option value="Todos">Todos Talhões</option>
                  {uniqueTalhoes.map(t => (
                    <option key={t} value={t}>Talhão {t}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowNoCampo(prev => !prev)}
              className={`w-full py-1.5 px-3 rounded-xl font-bold text-xs transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                showNoCampo
                  ? "bg-sky-50 text-sky-700 border-sky-300 shadow-3xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>🌱</span>
              <span>{showNoCampo ? "Ocultar plantios 'No Campo'" : "Exibir todos os plantios 'No Campo'"}</span>
            </button>
          </div>

          {/* Active Session Notice Banner */}
          {sessaoColheitaAtual && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex justify-between items-center text-xs text-amber-900 font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>Sessão: <span className="font-mono text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">{sessaoColheitaAtual}</span></span>
              </div>
              <button
                onClick={handleEncerrarSessao}
                className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
              >
                Encerrar
              </button>
            </div>
          )}
        </div>

        {/* Categories and Canteiros List */}
        {initialLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Carregando canteiros ativos...</p>
          </div>
        ) : visibleCanteiros.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-center p-6 shadow-sm">
            <AlertCircle className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700 mt-3">Nenhum plantio pronto para colheita.</p>
            <p className="text-xs text-slate-400 mt-1">Apenas canteiros com status "Colhendo", "Esperando" ou "Atrasada" aparecem aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => {
              const catItems = visibleCanteiros
                .filter(p => getGroupCategory(p) === cat.id)
                .sort((a, b) => a.cultura.localeCompare(b.cultura, "pt-BR"));
              
              if (catItems.length === 0) return null;

              return (
                <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className={`px-4 py-3 border-b border-slate-200 flex justify-between items-center ${cat.color}`}>
                    <h2 className="text-xs font-black uppercase tracking-wider">{cat.label}</h2>
                    <span className="text-xs font-mono font-bold">({catItems.length})</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {catItems.map((p) => {
                      const calcStatus = getCalculatedStatus(p);
                      const isColhendo = calcStatus === "Colhendo";
                      const qtyVal = valoresSessao[p.id!] || "";

                      return (
                        <div key={p.id} className="p-3 sm:p-4 hover:bg-slate-50/50 transition space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {p.id}
                                </span>
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200">
                                  Talhão {p.talhao}
                                </span>
                                {(!isNaN(Number(p.talhao)) && p.talhao.trim() !== "") && (
                                  <button
                                    onClick={() => handleToggleDisplayInSitio(p)}
                                    className={`text-[9px] font-bold px-1 py-0.5 rounded border ${
                                      p.displayInSitio
                                        ? "bg-teal-50 text-teal-700 border-teal-200"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                    }`}
                                  >
                                    {p.displayInSitio ? "🌿 No Sítio" : "➡️ Mover Sítio"}
                                  </button>
                                )}
                              </div>
                              <h3 className="font-extrabold text-slate-800 text-sm mt-1">
                                {p.cultura}
                              </h3>
                            </div>

                            <div className="text-right">
                              <button
                                onClick={() => handleToggleHistoryLogs(p.id!, p.cultura)}
                                className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full"
                              >
                                {calcStatus}
                              </button>
                              <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                                {getPlantingHarvestedTotal(p)} {getCropHarvestUnit(p.cultura)}
                              </div>
                            </div>
                          </div>

                          {/* Action Row */}
                          <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-100/60">
                            <span className="text-[10px] text-slate-400">
                              Plantado: {p.quantidade} {p.unidade}
                            </span>

                            <div className="flex items-center gap-2">
                              {modoColheitaAtivo ? (
                                <div className="flex items-center gap-2">
                                  <div className="relative flex items-center">
                                    <input
                                      ref={(el) => (inputRefs.current[p.id!] = el)}
                                      type="number"
                                      inputMode="decimal"
                                      enterKeyHint="next"
                                      placeholder="Qtd"
                                      value={qtyVal}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setValoresSessao(prev => ({ ...prev, [p.id!]: v }));
                                      }}
                                      onKeyDown={(e) => handleInputKeyDown(e, p.id!)}
                                      className={`w-24 px-2 py-1.5 pr-8 text-center font-bold border rounded-lg text-xs outline-none transition font-mono text-slate-800 ${
                                        !isColhendo 
                                          ? "border-emerald-300 bg-emerald-50/40 focus:border-emerald-500 focus:bg-white" 
                                          : "border-slate-200 bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                      }`}
                                    />
                                    <span className="absolute right-2 text-[10px] font-extrabold text-slate-400 pointer-events-none">
                                      {getCropHarvestUnit(p.cultura)}
                                    </span>
                                  </div>
                                  {isColhendo ? (
                                    <button
                                      onClick={() => handleOpenMudarID(p.id!, p.cultura, p.talhao)}
                                      className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1.5 rounded-lg text-xs transition border border-slate-200"
                                      title="Transferir ID"
                                    >
                                      <ArrowLeftRight className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleIniciarColheitaManual(p.id!)}
                                      className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-2 py-1.5 rounded-lg text-xs transition border border-emerald-300"
                                      title="Iniciar colheita agora"
                                    >
                                      <Play className="w-3 h-3 fill-emerald-800" />
                                      Iniciar
                                    </button>
                                  )}
                                </div>
                              ) : (
                                isColhendo ? (
                                  <button
                                    onClick={() => handleOpenMudarID(p.id!, p.cultura, p.talhao)}
                                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition border border-slate-200"
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5" />
                                    Mudar ID
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleIniciarColheitaManual(p.id!)}
                                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-xs cursor-pointer"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    Iniciar Colheita
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Bar when Modo Colheita is active */}
      {modoColheitaAtivo && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-slate-500 font-medium">Itens preenchidos: </span>
              <span className="font-bold font-mono text-emerald-700">
                {Object.values(valoresSessao).filter(v => parseFloat(v as string) > 0).length}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEncerrarSessao}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBulkMassa}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gravando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Gravar Colheita
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Logs Modal */}
      <AnimatePresence>
        {isHistoryLogsOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Histórico de Colheitas</h3>
                  <p className="text-xs text-slate-500">{selectedPlantingCultura} (Lote: {selectedPlantingId})</p>
                </div>
                <button
                  onClick={() => setIsHistoryLogsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {historicLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhuma colheita registrada para este canteiro.</p>
                ) : (
                  historicLogs.map((log, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-600">{log.data.split("-").reverse().join("/")}</span>
                      <span className="font-bold font-mono text-emerald-700">{log.qtd} {getCropHarvestUnit(selectedPlantingCultura)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
                <button
                  onClick={() => setIsHistoryLogsOpen(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mudar ID Modal */}
      <AnimatePresence>
        {isMudarIDOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-xl overflow-hidden space-y-4 p-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Mudar ID / Próximo Canteiro</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Finaliza o canteiro <span className="font-mono font-bold text-rose-600">{selectedPlantingId}</span> e inicia no próximo.
                  </p>
                </div>
                <button
                  onClick={() => setIsMudarIDOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Selecione o novo canteiro ({selectedPlantingCultura}):
                </label>
                <select
                  value={mudarIDTargetPlanting}
                  onChange={(e) => setMudarIDTargetPlanting(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-rose-500"
                >
                  <option value="">Apenas finalizar sem novo canteiro</option>
                  {plantings
                    .filter(
                      p => p.cultura.trim().toLowerCase() === selectedPlantingCultura.trim().toLowerCase() && 
                           p.id !== selectedPlantingId && 
                           p.docId !== selectedPlantingId && 
                           p.status !== "Finalizado"
                    )
                    .map(p => (
                      <option key={p.id || p.docId} value={p.id || p.docId}>
                        {p.id} (Talhão {p.talhao}) - Status: {p.status}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSwappingID}
                  onClick={() => setIsMudarIDOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSwappingID}
                  onClick={handleConfirmMudarID}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSwappingID ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Trocando...
                    </>
                  ) : (
                    "Confirmar Troca"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
