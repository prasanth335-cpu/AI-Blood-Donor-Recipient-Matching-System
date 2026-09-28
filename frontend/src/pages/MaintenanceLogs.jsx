import React, { useEffect, useState } from "react";
import { Wrench, Plus, X, Calendar, DollarSign, Cpu, FileText } from "lucide-react";
import api from "../services/api";

const MaintenanceLogs = () => {
  const [logs, setLogs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formMachineId, setFormMachineId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formActionTaken, setFormActionTaken] = useState("");
  const [formCost, setFormCost] = useState("0");
  const [formDate, setFormDate] = useState("");
  const [submitError, setSubmitError] = useState("");

  const fetchData = async () => {
    try {
      setError("");
      const [logRes, machRes] = await Promise.all([
        api.get("/maintenance-logs"),
        api.get("/machines")
      ]);
      setLogs(logRes.data);
      setMachines(machRes.data);
      if (machRes.data.length > 0 && !formMachineId) {
        setFormMachineId(machRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch maintenance history logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setFormMachineId(machines[0]?.id || "");
    setFormDescription("");
    setFormActionTaken("");
    setFormCost("0");
    setFormDate(new Date().toISOString().substring(0, 16)); // YYYY-MM-DDTHH:MM
    setSubmitError("");
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const payload = {
      machine_id: formMachineId,
      description: formDescription,
      action_taken: formActionTaken,
      cost: parseFloat(formCost) || 0.0,
      service_date: new Date(formDate).toISOString()
    };

    try {
      await api.post("/maintenance-logs", payload);
      setModalOpen(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.detail || "Failed to log maintenance event.");
    }
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-slate-100">Service Logs</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Record machinery servicing, parts replacement, and maintenance costs</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          Log Service
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Logs Table */}
      {logs.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No logs registered</h3>
          <p className="text-sm text-slate-400 mt-1 font-medium">Clear diagnostics and log your first machinery checkup.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-4 px-6">Equipment</th>
                  <th className="py-4 px-6">Action Performed</th>
                  <th className="py-4 px-6">Diagnosis / Details</th>
                  <th className="py-4 px-6">Service Date</th>
                  <th className="py-4 px-6">Cost</th>
                  <th className="py-4 px-6">Signed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-sm text-slate-600 dark:text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-750 dark:text-slate-200">
                      {log.machine?.name || `Machine ID: ${log.machine_id.substring(0, 8)}`}
                    </td>
                    <td className="py-4 px-6 font-semibold">{log.action_taken}</td>
                    <td className="py-4 px-6 text-xs max-w-xs truncate text-slate-450 dark:text-slate-400" title={log.description}>
                      {log.description}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400 font-medium">
                      {new Date(log.service_date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-4 px-6 font-bold text-blue-500">${log.cost.toFixed(2)}</td>
                    <td className="py-4 px-6 text-xs text-slate-450 dark:text-slate-400 font-semibold">{log.performer_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- RECORD MAINTENANCE MODAL --- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-850 dark:text-slate-100 mb-6">
              Record Maintenance Event
            </h3>

            {submitError && (
              <p className="p-3 mb-4 text-xs bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
                {submitError}
              </p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-slate-700 dark:text-slate-350">
              <div className="grid grid-cols-2 gap-4">
                {/* Machine selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Equipment</label>
                  <div className="relative">
                    <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                    <select
                      value={formMachineId}
                      onChange={(e) => setFormMachineId(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300 dark:bg-slate-900"
                    >
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Service Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Service Datetime</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                    <input
                      type="datetime-local"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Action Taken */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Action Performed</label>
                <div className="relative">
                  <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Replaced spindle radiator fan"
                    value={formActionTaken}
                    onChange={(e) => setFormActionTaken(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
              </div>

              {/* Cost */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Material & Labor Cost ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-455" />
                  <input
                    type="number"
                    step="any"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Detailed Diagnostic Observations</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
                  <textarea
                    rows="3"
                    required
                    placeholder="Describe failure causes, components wear level, test cycles run, etc."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-white"
                  ></textarea>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-semibold italic">
                *Submitting registers the event and returns the target asset's operational status to Healthy.
              </p>

              <button
                type="submit"
                className="w-full py-3 mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition"
              >
                File Service Log
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceLogs;
