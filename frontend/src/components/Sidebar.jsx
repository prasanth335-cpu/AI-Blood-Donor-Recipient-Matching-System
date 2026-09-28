import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Cpu, 
  Bell, 
  Wrench, 
  FileBarChart, 
  Shield, 
  LogOut, 
  MessageSquareCode,
  Activity
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const { logout, isAdmin } = useAuth();
  const location = useLocation();

  const links = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, role: "engineer" },
    { name: "Machines", path: "/machines", icon: Cpu, role: "engineer" },
    { name: "Alerts Center", path: "/alerts", icon: Bell, role: "engineer" },
    { name: "Maintenance Logs", path: "/logs", icon: Wrench, role: "engineer" },
    { name: "Reports Center", path: "/reports", icon: FileBarChart, role: "engineer" },
    { name: "AI Assistant", path: "/assistant", icon: MessageSquareCode, role: "engineer" },
  ];

  const activeClass = "bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20";
  const inactiveClass = "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60";

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex flex-col w-64 bg-white border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/30">
          <Activity className="w-6 h-6 animate-pulse-slow" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">
            AegisPredict
          </h1>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
            Predictive Maintenance
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 ${
                isActive ? activeClass : inactiveClass
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{link.name}</span>
            </Link>
          );
        })}

        {/* Admin Link */}
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 ${
              location.pathname === "/admin" ? activeClass : inactiveClass
            }`}
          >
            <Shield className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <span>Admin Panel</span>
          </Link>
        )}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={logout}
          className="flex items-center justify-between w-full px-4 py-3 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors duration-150"
        >
          <span className="text-sm font-semibold">Sign Out</span>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
