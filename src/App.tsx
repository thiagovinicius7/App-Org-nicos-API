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
import { LayoutDashboard, Sprout, ShoppingCart, Leaf, Droplets, Search, Menu, X, Bell, Info, CheckCircle2, AlertCircle, FileSpreadsheet, HelpCircle } from "lucide-react";
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

  useEffect(() => {
    // Run database seeding if collections are empty
    seedDatabaseIfEmpty();
  }, []);

  const addNotification = (msg: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, msg, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
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

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans print:bg-white print:text-black">
      
      {/* Sidebar (Desktop) - Hidden during Print */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 print:hidden">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-center">
          <GeraniumLogo variant="full" size={54} className="hover:scale-102 transition duration-200" />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Geranium Orgânicos v2.1
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 print:bg-white print:p-0">
        
        {/* Top Navbar (Mobile / Tablet header) - Hidden during Print */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center print:hidden">
          <GeraniumLogo variant="horizontal" size={38} />

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
