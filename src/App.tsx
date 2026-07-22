import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Crops from "./components/Crops";
import Purchases from "./components/Purchases";
import Plantings from "./components/Plantings";
import Harvests from "./components/Harvests";
import Traceability from "./components/Traceability";
import Importer from "./components/Importer";
import UserGuide from "./components/UserGuide";
import GeraniumLogo from "./components/GeraniumLogo";
import { seedDatabaseIfEmpty } from "./components/SeedingData";
import { auth, googleSignIn, logout } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  LayoutDashboard, 
  Sprout, 
  ShoppingCart, 
  Leaf, 
  Droplets, 
  Search, 
  Menu, 
  X, 
  Bell, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  HelpCircle,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type ActiveTab = "dashboard" | "crops" | "purchases" | "plantings" | "harvests" | "traceability" | "import" | "guide";

interface Notification {
  id: string;
  msg: string;
  type: "success" | "error" | "info";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        // Run database seeding if collections are empty
        seedDatabaseIfEmpty();
      }
    });
    return () => unsubscribe();
  }, []);

  const addNotification = (msg: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, msg, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      addNotification("Sessão encerrada com sucesso.", "success");
    } catch (err: any) {
      addNotification("Erro ao desconectar da conta.", "error");
    }
  };

  const menuItems = [
    { id: "dashboard" as const, label: "Painel", icon: LayoutDashboard },
    { id: "crops" as const, label: "Culturas", icon: Leaf },
    { id: "purchases" as const, label: "Compras & Estoque", icon: ShoppingCart },
    { id: "plantings" as const, label: "Plantio / Campo", icon: Sprout },
    { id: "harvests" as const, label: "Colheita Diária", icon: Droplets },
    { id: "traceability" as const, label: "Rastreabilidade", icon: Search },
    { id: "import" as const, label: "Importar Planilha", icon: FileSpreadsheet },
    { id: "guide" as const, label: "Guia de Uso", icon: HelpCircle },
  ];

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/50 shadow-xs animate-pulse">
            <Leaf className="w-10 h-10 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Carregando painel seguro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-50 to-emerald-50/20 flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl flex flex-col items-center text-center">
          <GeraniumLogo variant="full" size={240} className="mb-6 hover:scale-[1.02] transition duration-300" />
          
          <h1 className="font-sans font-extrabold text-2xl tracking-tight text-slate-900 mt-2">
            Área de Acesso Seguro
          </h1>
          <p className="text-sm text-slate-500 mt-3 max-w-sm leading-relaxed">
            Faça login com sua conta autorizada para gerenciar cultivos, estoque, canteiros, colheitas e rastreabilidade da Geranium Orgânicos.
          </p>

          <button
            onClick={async () => {
              try {
                setIsSigningIn(true);
                const result = await googleSignIn();
                if (result) {
                  addNotification(`Bem-vindo, ${result.user.displayName}!`, "success");
                }
              } catch (err: any) {
                console.error(err);
                addNotification("Falha na autenticação com Google.", "error");
              } finally {
                setIsSigningIn(false);
              }
            }}
            disabled={isSigningIn}
            className="w-full mt-8 flex items-center justify-center gap-3 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition duration-150 disabled:opacity-50 cursor-pointer"
          >
            {isSigningIn ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Conectando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 bg-white rounded-full p-0.5 shadow-xs shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-.1.1.1.1 1.14-.76 2.11-1.4 2.81-2.07l3.21.13 2.12.18-.32.12zm-11.745 4.5c2.34 0 4.3-.77 5.73-2.1l-2.81-2.17c-.82.55-1.87.88-2.92.88-2.25 0-4.15-1.52-4.83-3.57l-3.21.23-.23 3c1.44 2.88 4.41 4.73 7.82 4.73z" />
                  <path fill="#EA4335" d="M7.085 13.1c-.17-.5-.27-1.04-.27-1.6s.1-1.1.27-1.6l-3.21-.23-.62.53a11.96 11.96 0 000 10.1l3.83-.4c.1-.2 0-.2-.1-.8z" />
                  <path fill="#FBBC05" d="M12 7.27c1.27 0 2.42.44 3.32 1.3l2.84-2.84c-1.72-1.6-3.97-2.58-6.16-2.58C8.59 3.15 5.62 5 4.18 7.88l3.44 2.66c.68-2.05 2.58-3.27 4.83-3.27z" />
                </svg>
                Acessar com Conta Google
              </>
            )}
          </button>
        </div>

        {/* Global Floating Notifications inside Login */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none print:hidden px-4">
          <AnimatePresence>
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-start gap-3 pointer-events-auto ${
                  n.type === "success"
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                    : n.type === "error"
                    ? "bg-rose-50 border-rose-100 text-rose-800"
                    : "bg-indigo-50 border-indigo-100 text-indigo-800"
                }`}
              >
                {n.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : n.type === "error" ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{n.msg}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans print:bg-white print:text-black">
      
      {/* Sidebar (Desktop) - Hidden during Print */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 print:hidden justify-between">
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-center">
            <GeraniumLogo variant="full" size={180} className="hover:scale-[1.02] transition duration-200" />
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-150 border ${
                    isActive
                      ? "bg-slate-100 text-emerald-700 border-slate-200/60 shadow-xs"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer, User Info & Logout Button */}
        <div className="p-4 border-t border-slate-200 flex flex-col gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || ""} 
                className="w-9 h-9 rounded-full border border-slate-200 shrink-0" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                {user.displayName?.charAt(0) || "U"}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-700 truncate leading-none">
                {user.displayName}
              </span>
              <span className="text-[10px] text-slate-400 truncate mt-1">
                {user.email}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50/30 hover:border-rose-100 transition duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>

          <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 space-y-0.5">
            <div>Geranium Orgânicos v2.2</div>
            <div className="text-[9px] font-medium text-slate-400 normal-case tracking-normal">criado por Thiago Vinicius P. Leite</div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 print:bg-white print:p-0">
        
        {/* Top Navbar (Mobile / Tablet header) - Hidden during Print */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center print:hidden">
          <GeraniumLogo variant="horizontal" size={120} />

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition border border-transparent hover:border-slate-200"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-b border-slate-200 print:hidden overflow-hidden"
            >
              <div className="p-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition border ${
                        isActive
                          ? "bg-slate-100 text-emerald-700 border-slate-200"
                          : "text-slate-500 hover:bg-slate-50 border-transparent"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                      {item.label}
                    </button>
                  );
                })}

                {/* Mobile User Info & Logout */}
                <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center gap-3 px-4 py-1">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || ""} 
                        className="w-9 h-9 rounded-full border border-slate-200 shrink-0" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {user.displayName?.charAt(0) || "U"}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-700 truncate leading-none">
                        {user.displayName}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate mt-1">
                        {user.email}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="mx-4 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50/30 hover:border-rose-100 transition duration-150 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full print:p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "dashboard" && <Dashboard />}
              {activeTab === "crops" && <Crops onNotify={addNotification} />}
              {activeTab === "purchases" && <Purchases onNotify={addNotification} />}
              {activeTab === "plantings" && <Plantings onNotify={addNotification} />}
              {activeTab === "harvests" && <Harvests onNotify={addNotification} />}
              {activeTab === "traceability" && <Traceability onNotify={addNotification} />}
              {activeTab === "import" && <Importer onNotify={addNotification} />}
              {activeTab === "guide" && <UserGuide />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modern Floating Notification System (Hidden during Print) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none print:hidden px-4">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-start gap-3 pointer-events-auto ${
                n.type === "success"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                  : n.type === "error"
                  ? "bg-rose-50 border-rose-100 text-rose-800"
                  : "bg-indigo-50 border-indigo-100 text-indigo-800"
              }`}
            >
              {n.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : n.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{n.msg}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
