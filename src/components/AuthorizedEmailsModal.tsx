import React, { useState, useEffect } from "react";
import { 
  AuthorizedEmail, 
  getAuthorizedEmails, 
  addAuthorizedEmail, 
  removeAuthorizedEmail 
} from "../lib/authorizedEmails";
import { X, UserPlus, Trash2, ShieldCheck, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string | null;
  onNotify: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function AuthorizedEmailsModal({ isOpen, onClose, currentUserEmail, onNotify }: Props) {
  const [emails, setEmails] = useState<AuthorizedEmail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newEmail, setNewEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const list = await getAuthorizedEmails();
      setEmails(list);
    } catch (err) {
      console.error(err);
      onNotify("Erro ao carregar lista de e-mails autorizados.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchList();
      setNewEmail("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      onNotify("Informe um e-mail válido com @.", "error");
      return;
    }

    if (emails.some(item => item.email.toLowerCase() === clean)) {
      onNotify("Este e-mail já está autorização de acesso.", "info");
      return;
    }

    try {
      setIsSubmitting(true);
      await addAuthorizedEmail(clean, currentUserEmail || "Administrador");
      onNotify(`E-mail ${clean} autorizado com sucesso!`, "success");
      setNewEmail("");
      await fetchList();
    } catch (err: any) {
      console.error(err);
      onNotify(err.message || "Erro ao adicionar e-mail.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (item: AuthorizedEmail) => {
    if (currentUserEmail && item.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      onNotify("Você não pode remover seu próprio e-mail para evitar bloqueio de acesso.", "error");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja remover o acesso para o e-mail "${item.email}"?`)) {
      return;
    }

    try {
      setDeletingId(item.id);
      await removeAuthorizedEmail(item.id);
      onNotify(`Acesso removido para ${item.email}.`, "success");
      await fetchList();
    } catch (err) {
      console.error(err);
      onNotify("Erro ao remover e-mail.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">E-mails Autorizados</h2>
              <p className="text-xs text-slate-500 font-medium">Contas Google com permissão de acesso ao sistema</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Form to Add New Email */}
          <form onSubmit={handleAdd} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
            <label className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-700" />
              Autorizar Novo E-mail
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="ex: usuario@geranium.com.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !newEmail.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isSubmitting ? "Gravando..." : "+ Autorizar"}
              </button>
            </div>
          </form>

          {/* List of Authorized Emails */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                E-mails Permitidos ({emails.length})
              </h3>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm font-medium">
                Carregando e-mails autorizados...
              </div>
            ) : emails.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Nenhum e-mail cadastrado</p>
                <p className="text-xs text-slate-500 mt-1">Adicione ao menos um e-mail para restringir os acessos ao painel.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {emails.map((item) => {
                  const isSelf = currentUserEmail && item.email.toLowerCase() === currentUserEmail.toLowerCase();
                  return (
                    <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-xl shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm truncate">{item.email}</span>
                            {isSelf && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                                Você
                              </span>
                            )}
                          </div>
                          {item.addedAt && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              Autorizado em {new Date(item.addedAt).toLocaleDateString("pt-BR")}
                              {item.addedBy ? ` por ${item.addedBy}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemove(item)}
                        disabled={isSelf || deletingId === item.id}
                        title={isSelf ? "Não é possível remover seu próprio e-mail" : "Remover autorização"}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
