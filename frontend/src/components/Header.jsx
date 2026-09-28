import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Sun, Moon, Bell, User as UserIcon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const Header = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  // Fetch active alerts count periodically
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const response = await api.get("/alerts?status=active");
        setActiveAlertCount(response.data.length);
      } catch (err) {
        console.error("Error fetching alert counts in header:", err);
      }
    };

    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard Cockpit";
    if (path.startsWith("/machines")) return "Machine Inventory";
    if (path === "/alerts") return "Active Alerts Center";
    if (path === "/logs") return "Maintenance Service Logs";
    if (path === "/reports") return "Analytics & Reports Center";
    if (path === "/assistant") return "AI Maintenance Copilot";
    if (path === "/admin") return "System Administration";
    return "Operations Console";
  };

  return (
    <header className="fixed top-0 right-0 left-64 z-10 flex items-center justify-between h-16 px-8 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md transition-colors duration-200">
      {/* Title / Breadcrumb */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {getPageTitle()}
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Real-time diagnostics and prognosis
        </span>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-4">
        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          title="Toggle appearance"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications badge */}
        <Link
          to="/alerts"
          className="relative p-2 text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          title="Alerts center"
        >
          <Bell className="w-5 h-5" />
          {activeAlertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
        </Link>

        {/* User indicator */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-none">
              {user?.full_name || "Factory Operator"}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {user?.role === "admin" ? "Administrator" : "Maintenance Engineer"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
