import React, { useEffect, useState } from "react";
import { Bell, ShieldCheck, AlertOctagon, CheckCircle2, Clock, Cpu } from "lucide-react";
import api from "../services/api";

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // "active", "resolved", or ""

  const fetchAlerts = async () => {
    try {
      setError("");
      const response = await api.get(`/alerts` + (statusFilter ? `?status=${statusFilter}` : ""));
      setAlerts(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch active alert feeds.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleResolve = async (id) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      fetchAlerts(); // Refresh
    } catch (err) {
      console.error(err);
      alert("Failed to resolve alert.");
    }
  };

  const getSeverityBadge = (type) => {
    return type === "Critical" 
      ? "bg-red-500/10 text-red-500 border border-red-500/20" 
      : "bg-amber-500/10 text-amber-500 border border-amber-500/20";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-slate-100">Alarms Center</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Review, diagnose, and resolve hardware fault triggers</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {[
          { name: "Active Alarms", value: "active" },
          { name: "Cleared Alarms", value: "resolved" },
          { name: "Full Archive", value: "" }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setLoading(true); }}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
              statusFilter === tab.value
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Feed List */}
      {alerts.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-bounce" style={{ animationDuration: "3s" }} />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">All systems operational</h3>
          <p className="text-sm text-slate-400 mt-1">No active telemetry breaches or failure logs detected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div 
              key={alert.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150"
            >
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 ${
                  alert.type === "Critical" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                }`}>
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{alert.machine_name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getSeverityBadge(alert.type)}`}>
                      {alert.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-350 mt-2 font-medium">{alert.message}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" />ID: {alert.machine_id.substring(0, 8)}...</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-4 md:pt-0">
                {alert.status === "active" ? (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/10 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolve Issue
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Cleared
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;
