import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Crop } from "../types";
import { Plus, Edit2, Search, ArrowLeft, Loader2, Leaf, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CropsProps {
  onNotify: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Crops({ onNotify }: CropsProps) {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);

  // Form states
  const [nome, setNome] = useState<string>("");
  const [cientifico, setCientifico] = useState<string>("");
  const [dias, setDias] = useState<number>(0);
  const [duracao, setDuracao] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const cropsCol = collection(db, "crops");
      const snapshot = await getDocs(cropsCol);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Crop));
      // Sort alphabetically
      list.sort((a, b) => a.nome.localeCompare(b.nome));
      setCrops(list);
    } catch (err) {
      console.error("Error fetching crops:", err);
      onNotify("Erro ao buscar culturas.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openNewForm = () => {
    setSelectedCrop(null);
    setNome("");
    setCientifico("");
    setDias(0);
    setDuracao(0);
    setIsFormOpen(true);
  };

  const openEditForm = (crop: Crop) => {
    setSelectedCrop(crop);
    setNome(crop.nome);
    setCientifico(crop.cientifico || "");
    setDias(crop.dias);
    setDuracao(crop.duracao);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onNotify("Informe o nome popular da cultura.", "error");
      return;
    }

    try {
      setSaving(true);
      const cropsCol = collection(db, "crops");

      const payload: Omit<Crop, "id"> = {
        nome: nome.trim(),
        cientifico: cientifico.trim(),
        dias: Number(dias) || 0,
        duracao: Number(duracao) || 0,
      };

      if (selectedCrop && selectedCrop.id) {
        // Edit existing crop
        const docRef = doc(db, "crops", selectedCrop.id);
        await updateDoc(docRef, payload);
        onNotify("Cultura atualizada com sucesso!", "success");
      } else {
        // Create new crop
        // Check if crop already exists
        const exists = crops.some(c => c.nome.toLowerCase() === nome.trim().toLowerCase());
        if (exists) {
          onNotify("Uma cultura com este nome já existe.", "error");
          setSaving(false);
          return;
        }
        await addDoc(cropsCol, payload);
        onNotify("Nova cultura cadastrada com sucesso!", "success");
      }

      setIsFormOpen(false);
      fetchCrops();
    } catch (err) {
      console.error("Error saving crop:", err);
      onNotify("Erro ao salvar cultura.", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredCrops = crops.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.cientifico && c.cientifico.toLowerCase().includes(search.toLowerCase()))
  );

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
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Culturas Cadastradas</h1>
                <p className="text-slate-500 text-sm mt-1">Gerencie a lista de plantas do seu banco de dados orgânicos.</p>
              </div>
              <button
                onClick={openNewForm}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs transition duration-150 self-stretch sm:self-auto justify-center cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Nova Cultura
              </button>
            </div>

            {/* Filter Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nome popular ou científico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent border-0 outline-none focus:ring-0"
              />
            </div>

            {/* List Table/Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                <p className="text-sm text-slate-400 mt-2">Carregando catálogo de culturas...</p>
              </div>
            ) : filteredCrops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm text-center p-6">
                <AlertCircle className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700 mt-3">Nenhuma cultura encontrada.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Tente reajustar sua busca ou cadastre uma nova cultura no botão superior.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Nome Popular</th>
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Nome Científico</th>
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-center">Dias para 1ª Colheita</th>
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-center">Duração da Colheita</th>
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredCrops.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/55 transition">
                          <td className="p-4 font-bold text-slate-800">{c.nome}</td>
                          <td className="p-4 text-slate-500 italic font-serif">{c.cientifico || "—"}</td>
                          <td className="p-4 text-slate-700 text-center font-mono font-medium">{c.dias} dias</td>
                          <td className="p-4 text-slate-700 text-center font-mono font-medium">{c.duracao} dias</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => openEditForm(c)}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition duration-150 border border-slate-200/50 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="form-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Form header */}
              <div className="p-6 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {selectedCrop ? `Editar Cultura: ${selectedCrop.nome}` : "Cadastrar Nova Cultura"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Informe os detalhes para salvar na nuvem.</p>
                </div>
              </div>

              {/* Form body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="crop-nome" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Nome Popular
                  </label>
                  <input
                    id="crop-nome"
                    type="text"
                    required
                    placeholder="Ex: Alface Crespa Roxa"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-sm text-slate-800 rounded-xl outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="crop-cientifico" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Nome Científico <span className="text-slate-400 font-normal font-sans">(Opcional)</span>
                  </label>
                  <input
                    id="crop-cientifico"
                    type="text"
                    placeholder="Ex: Lactuca sativa var. crispa"
                    value={cientifico}
                    onChange={(e) => setCientifico(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-sm text-slate-800 rounded-xl outline-none transition font-serif italic"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="crop-dias" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Dias para 1ª Colheita
                    </label>
                    <input
                      id="crop-dias"
                      type="number"
                      required
                      min="0"
                      value={dias}
                      onChange={(e) => setDias(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-sm text-slate-800 rounded-xl outline-none font-mono transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="crop-duracao" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Duração da Colheita <span className="text-slate-400 font-normal font-sans">(Dias)</span>
                    </label>
                    <input
                      id="crop-duracao"
                      type="number"
                      required
                      min="0"
                      value={duracao}
                      onChange={(e) => setDuracao(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-sm text-slate-800 rounded-xl outline-none font-mono transition"
                    />
                  </div>
                </div>

                {/* Submit row */}
                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                    {saving ? "Salvando..." : "Salvar Cultura"}
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
