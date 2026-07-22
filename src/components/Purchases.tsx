import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Purchase, Crop, Planting } from "../types";
import { Plus, Trash, Search, ArrowLeft, Loader2, Info, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PurchasesProps {
  onNotify: (msg: string, type: "success" | "error" | "info") => void;
}

interface NewPurchaseItem {
  tipo: "Muda" | "Semente";
  cultura: string;
  quantidade: number;
}

export default function Purchases({ onNotify }: PurchasesProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  // Form states
  const [compraData, setCompraData] = useState<string>(new Date().toISOString().split("T")[0]);
  const [compraFornecedor, setCompraFornecedor] = useState<string>("");
  const [compraNf, setCompraNf] = useState<string>("");
  const [itens, setItens] = useState<NewPurchaseItem[]>([{ tipo: "Muda", cultura: "", quantidade: 0 }]);
  const [saving, setSaving] = useState<boolean>(false);

  // Zerar Estoque Modal States
  const [selectedPurchaseToZero, setSelectedPurchaseToZero] = useState<Purchase | null>(null);
  const [motivoZerarOption, setMotivoZerarOption] = useState<string>("Mortalidade / Perda no viveiro");
  const [detalhesMotivo, setDetalhesMotivo] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch crops for dropdowns
      const cropsSnapshot = await getDocs(collection(db, "crops"));
      const cropsList = cropsSnapshot.docs.map(d => d.data() as Crop);
      cropsList.sort((a, b) => a.nome.localeCompare(b.nome));
      setCrops(cropsList);

      // 2. Fetch all inventory purchases
      const purchasesSnapshot = await getDocs(collection(db, "purchases"));
      const list = purchasesSnapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          docId: d.id,
          id: data.id || d.id,
        } as Purchase;
      });

      // Sort newest purchases first
      list.sort((a, b) => parseDateToTimestamp(b.data) - parseDateToTimestamp(a.data));
      setPurchases(list);
    } catch (err) {
      console.error("Error fetching inventory data:", err);
      onNotify("Erro ao buscar dados do estoque.", "error");
    } finally {
      setLoading(false);
    }
  };

  const parseDateToTimestamp = (dateStr?: string): number => {
    if (!dateStr) return 0;
    const str = dateStr.trim();
    if (str.includes("/")) {
      const parts = str.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const addItemRow = () => {
    setItens([...itens, { tipo: "Muda", cultura: "", quantidade: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const updateItemRow = (index: number, field: keyof NewPurchaseItem, value: any) => {
    const updated = [...itens];
    updated[index] = { ...updated[index], [field]: value };
    setItens(updated);
  };

  const handleConfirmZerar = async () => {
    if (!selectedPurchaseToZero) return;
    try {
      const finalMotivo = motivoZerarOption === "Outro motivo"
        ? (detalhesMotivo.trim() || "Outro motivo")
        : (detalhesMotivo.trim() ? `${motivoZerarOption}: ${detalhesMotivo.trim()}` : motivoZerarOption);

      const targetDocId = selectedPurchaseToZero.docId || selectedPurchaseToZero.id;
      await updateDoc(doc(db, "purchases", targetDocId), {
        saldo: 0,
        status: "Esgotado",
        motivoZerar: finalMotivo,
      });

      onNotify(`Estoque do lote ${selectedPurchaseToZero.id} zerado (${finalMotivo})`, "success");
      setSelectedPurchaseToZero(null);
      setDetalhesMotivo("");
      fetchData();
    } catch (err) {
      console.error("Error zeroing stock:", err);
      onNotify("Erro ao zerar estoque.", "error");
    }
  };

  const handleRestaurarSaldo = async (p: Purchase) => {
    try {
      const targetDocId = p.docId || p.id;
      await updateDoc(doc(db, "purchases", targetDocId), {
        saldo: p.quantidade,
        status: "Ativo",
        motivoZerar: null,
      });
      onNotify(`Lote ${p.id} reativado no estoque com saldo de ${p.quantidade}!`, "success");
      fetchData();
    } catch (err) {
      console.error("Error restoring balance:", err);
      onNotify("Erro ao reativar lote.", "error");
    }
  };

  const openForm = () => {
    setCompraData(new Date().toISOString().split("T")[0]);
    setCompraFornecedor("");
    setCompraNf("");
    setItens([{ tipo: "Muda", cultura: "", quantidade: 0 }]);
    setIsFormOpen(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compraFornecedor.trim()) {
      onNotify("Informe o fornecedor.", "error");
      return;
    }

    // Validate items
    for (let i = 0; i < itens.length; i++) {
      if (!itens[i].cultura) {
        onNotify(`Selecione a cultura no Item ${i + 1}.`, "error");
        return;
      }
      if (itens[i].quantidade <= 0) {
        onNotify(`A quantidade do Item ${i + 1} deve ser maior que zero.`, "error");
        return;
      }
    }

    try {
      setSaving(true);
      const batch = writeBatch(db);
      const dateForId = compraData.replace(/-/g, "").substring(2); // yyMMdd format

      itens.forEach((item) => {
        const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
        const lotId = `COMP-${dateForId}-${randomHex}`;
        const newDocRef = doc(db, "purchases", lotId);

        const payload: Purchase = {
          id: lotId,
          docId: lotId,
          data: compraData,
          fornecedor: compraFornecedor.trim(),
          nf: compraNf.trim() || "S/N",
          tipo: item.tipo,
          cultura: item.cultura,
          quantidade: Number(item.quantidade),
          saldo: Number(item.quantidade),
          status: "Ativo",
        };

        batch.set(newDocRef, payload);
      });

      await batch.commit();
      onNotify(`Compra registrada com sucesso! (${itens.length} itens adicionados)`, "success");
      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error saving purchase note:", err);
      onNotify("Erro ao salvar a compra.", "error");
    } finally {
      setSaving(false);
    }
  };

  const formatToBrazDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    if (dateStr.includes("/")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2].substring(0, 2)}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const isSemente = (tipo?: string) => {
    if (!tipo) return false;
    return tipo.toLowerCase().includes("semente");
  };

  const isMuda = (tipo?: string) => {
    if (!tipo) return true;
    return !isSemente(tipo);
  };

  const activeMudas = purchases.filter(p => 
    isMuda(p.tipo) && 
    (p.status === "Ativo" || !p.status) && 
    (p.saldo === undefined || p.saldo > 0) &&
    ((p.cultura || "").toLowerCase().includes(search.toLowerCase()) || (p.fornecedor || "").toLowerCase().includes(search.toLowerCase()))
  );

  const activeSementes = purchases.filter(p => 
    isSemente(p.tipo) && 
    (p.status === "Ativo" || !p.status) && 
    (p.saldo === undefined || p.saldo > 0) &&
    ((p.cultura || "").toLowerCase().includes(search.toLowerCase()) || (p.fornecedor || "").toLowerCase().includes(search.toLowerCase()))
  );

  const inactivePurchases = purchases.filter(p => p.status === "Esgotado" || (p.saldo !== undefined && p.saldo <= 0));

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!isFormOpen ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Estoque e Compras</h1>
                <p className="text-slate-500 text-sm mt-1">Gerencie suas entradas de mudas e sementes e acompanhe os saldos ativos.</p>
              </div>
              <button
                onClick={openForm}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs transition duration-150 self-stretch sm:self-auto justify-center cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Nova Compra
              </button>
            </div>

            {/* Quick search filter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Filtrar estoque por cultura ou fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent border-0 outline-none focus:ring-0"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                <p className="text-sm text-slate-400 mt-2">Carregando dados de estoque...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Seedlings Stock (Mudas) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-200 bg-emerald-50/10">
                    <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                      🌱 Mudas em Estoque <span className="font-mono text-xs text-emerald-600 font-bold">({activeMudas.length})</span>
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="p-4">Lote / Data</th>
                          <th className="p-4">Cultura</th>
                          <th className="p-4">Fornecedor</th>
                          <th className="p-4 text-center">Saldo</th>
                          <th className="p-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeMudas.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-semibold">
                              Nenhuma muda ativa em estoque.
                            </td>
                          </tr>
                        ) : (
                          activeMudas.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition">
                              <td className="p-4">
                                <span className="text-[10px] font-mono block text-slate-400 font-bold">{p.id}</span>
                                <span className="text-xs text-slate-500 font-medium">{formatToBrazDate(p.data)}</span>
                              </td>
                              <td className="p-4 font-bold text-slate-800">{p.cultura}</td>
                              <td className="p-4 text-slate-500 text-xs font-medium">{p.fornecedor}</td>
                              <td className="p-4 text-center text-emerald-600 font-black font-mono text-sm">
                                {p.saldo.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">unid</span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedPurchaseToZero(p);
                                    setMotivoZerarOption("Mortalidade / Perda no viveiro");
                                    setDetalhesMotivo("");
                                  }}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer border border-rose-100"
                                >
                                  Zerar Estoque
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Seeds Stock (Sementes) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-200 bg-indigo-50/10">
                    <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-widest flex items-center gap-2">
                      🌰 Sementes em Estoque <span className="font-mono text-xs text-indigo-600 font-bold">({activeSementes.length})</span>
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="p-4">Lote / Data</th>
                          <th className="p-4">Cultura</th>
                          <th className="p-4">Fornecedor</th>
                          <th className="p-4 text-center">Quantidade / Saldo</th>
                          <th className="p-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeSementes.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-semibold">
                              Nenhuma semente ativa em estoque.
                            </td>
                          </tr>
                        ) : (
                          activeSementes.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition">
                              <td className="p-4">
                                <span className="text-[10px] font-mono block text-slate-400 font-bold">{p.id}</span>
                                <span className="text-xs text-slate-500 font-medium">{formatToBrazDate(p.data)}</span>
                              </td>
                              <td className="p-4 font-bold text-slate-800">{p.cultura}</td>
                              <td className="p-4 text-slate-500 text-xs font-medium">{p.fornecedor}</td>
                              <td className="p-4 text-center text-indigo-600 font-black font-mono text-sm">
                                {p.saldo.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">em estoque</span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedPurchaseToZero(p);
                                    setMotivoZerarOption("Estoque finalizado / Consumo total");
                                    setDetalhesMotivo("");
                                  }}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer border border-rose-100"
                                >
                                  Zerar Estoque
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Spent Lots / Planted History */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-100/50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-slate-500" />
                      <span className="font-bold text-slate-700 text-sm">📦 Histórico: Lotes Esgotados / Plantados ({inactivePurchases.length})</span>
                    </div>
                    {isHistoryOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>

                  <AnimatePresence>
                    {isHistoryOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-200 overflow-x-auto"
                      >
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              <th className="p-3">Lote / Data</th>
                              <th className="p-3">Cultura</th>
                              <th className="p-3">Tipo / Fornecedor</th>
                              <th className="p-3">Motivo / Obs</th>
                              <th className="p-3 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {inactivePurchases.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-4 text-center text-slate-400 font-semibold">
                                  Nenhum histórico disponível.
                                </td>
                              </tr>
                            ) : (
                              inactivePurchases.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-100/30 transition text-slate-500">
                                  <td className="p-3 font-mono font-medium">{p.id}<br/>{formatToBrazDate(p.data)}</td>
                                  <td className="p-3 font-bold text-slate-700">{p.cultura}</td>
                                  <td className="p-3 font-medium">{p.tipo} - <span className="text-slate-500">{p.fornecedor}</span></td>
                                  <td className="p-3 text-xs">
                                    <span className="font-semibold text-slate-600 block">{p.motivoZerar || "Lote Plantado / Esgotado"}</span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleRestaurarSaldo(p)}
                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded text-[11px] transition cursor-pointer border border-emerald-100/40"
                                      title="Reativar e restaurar saldo no estoque"
                                    >
                                      Restaurar Saldo
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Zerar Estoque Modal */}
            <AnimatePresence>
              {selectedPurchaseToZero && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden space-y-4 p-6"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Zerar Estoque de Item</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Lote <span className="font-mono font-bold text-emerald-700">{selectedPurchaseToZero.id}</span> ({selectedPurchaseToZero.cultura})
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPurchaseToZero(null)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs text-slate-600">
                      <p><span className="font-bold text-slate-500">Fornecedor:</span> {selectedPurchaseToZero.fornecedor}</p>
                      <p><span className="font-bold text-slate-500">Tipo:</span> {selectedPurchaseToZero.tipo}</p>
                      <p><span className="font-bold text-slate-500">Quantidade Inicial:</span> {selectedPurchaseToZero.quantidade}</p>
                      <p><span className="font-bold text-slate-500">Saldo Atual:</span> {selectedPurchaseToZero.saldo}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Motivo da Baixa / Zeramento
                      </label>
                      <select
                        value={motivoZerarOption}
                        onChange={(e) => setMotivoZerarOption(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                      >
                        <option value="Mortalidade / Perda no viveiro">Mortalidade / Perda no viveiro</option>
                        <option value="Estoque finalizado / Consumo total">Estoque finalizado / Consumo total</option>
                        <option value="Praga ou Doença">Ataque de Praga ou Doença</option>
                        <option value="Deterioração / Validade">Deterioração / Perda da validade</option>
                        <option value="Avaria / Acidente de Manuseio">Avaria ou Acidente no manuseio</option>
                        <option value="Outro motivo">Outro motivo (especificar abaixo)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Observações adicionais (opcional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Mudas sentiram o calor ou sementes acabaram no plantio..."
                        value={detalhesMotivo}
                        onChange={(e) => setDetalhesMotivo(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPurchaseToZero(null)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmZerar}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                      >
                        Confirmar e Zerar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="form-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Form header */}
              <div className="p-6 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Registrar Nova Compra</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Informe as mudas ou sementes adquiridas para atualizar o estoque.</p>
                </div>
              </div>

              {/* Form body */}
              <form onSubmit={handleSavePurchase} className="p-6 space-y-6">
                
                {/* Note Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Data da Compra
                    </label>
                    <input
                      type="date"
                      required
                      value={compraData}
                      onChange={(e) => setCompraData(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-sm text-slate-800 rounded-xl outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Fornecedor
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Viveiro Flora Real"
                      value={compraFornecedor}
                      onChange={(e) => setCompraFornecedor(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-sm text-slate-800 rounded-xl outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-sm">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Número da Nota Fiscal (NF) <span className="text-slate-400 font-normal font-sans">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 004.281"
                    value={compraNf}
                    onChange={(e) => setCompraNf(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-sm text-slate-800 rounded-xl outline-none transition"
                  />
                </div>

                <hr className="border-slate-100" />

                {/* Items Container */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Itens Adquiridos</h3>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-2 rounded-lg transition cursor-pointer border border-emerald-100/30"
                    >
                      + Adicionar Item
                    </button>
                  </div>

                  <div className="space-y-4">
                    {itens.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative space-y-4"
                      >
                        {/* Remove item button */}
                        {itens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="absolute top-3 right-3 text-rose-500 hover:text-rose-700 text-xs font-bold transition cursor-pointer"
                          >
                            Excluir
                          </button>
                        )}

                        <div className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Item {idx + 1}</div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          
                          {/* Item Type */}
                          <div className="space-y-2">
                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</span>
                            <div className="flex items-center gap-4 bg-white px-3 py-2 border border-slate-200 rounded-lg">
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-semibold">
                                <input
                                  type="radio"
                                  name={`item-tipo-${idx}`}
                                  checked={item.tipo === "Muda"}
                                  onChange={() => updateItemRow(idx, "tipo", "Muda")}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                Muda
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-semibold">
                                <input
                                  type="radio"
                                  name={`item-tipo-${idx}`}
                                  checked={item.tipo === "Semente"}
                                  onChange={() => updateItemRow(idx, "tipo", "Semente")}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                Semente
                              </label>
                            </div>
                          </div>

                          {/* Item Crop selection */}
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                              Cultura
                            </label>
                            <select
                              required
                              value={item.cultura}
                              onChange={(e) => updateItemRow(idx, "cultura", e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 text-xs text-slate-800 rounded-lg outline-none focus:border-emerald-500 font-semibold"
                            >
                              <option value="" disabled>Selecione a cultura...</option>
                              {crops.map((c) => (
                                <option key={c.nome} value={c.nome}>
                                  {c.nome}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Item Quantity */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                              {item.tipo === "Muda" ? "Qtde (unid)" : "Qtde / Gramas (g)"}
                            </label>
                            <input
                              type="number"
                              required
                              min="0.1"
                              step="0.01"
                              value={item.quantidade || ""}
                              onChange={(e) => updateItemRow(idx, "quantidade", Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 rounded-lg outline-none focus:border-emerald-500"
                            />
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form submit footer */}
                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                    {saving ? "Salvando Nota..." : "Salvar Compra"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition cursor-pointer border border-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
