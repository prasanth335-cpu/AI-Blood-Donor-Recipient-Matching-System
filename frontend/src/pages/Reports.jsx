import React, { useEffect, useState } from "react";
import { FileBarChart, Plus, Download, Trash, FileSpreadsheet, FileText, CheckCircle2, Clock } from "lucide-react";
import api from "../services/api";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Generator form state
  const [reportType, setReportType] = useState("health");
  const [format, setFormat] = useState("pdf");
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState("");

  const fetchReports = async () => {
    try {
      setError("");
      const response = await api.get("/reports");
      setReports(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load compiled reports archive.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGenSuccess("");
    setError("");
    try {
      const response = await api.post(`/reports/generate?report_type=${reportType}&format=${format}`);
      setGenSuccess(`Compiled report successfully: ${response.data.name}`);
      fetchReports(); // Refresh
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Report compilation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id, name) => {
    try {
      const response = await api.get(`/reports/download/${id}`, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to download compiled report file.");
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
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight dark:text-slate-100">Reports Center</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Compile, store, and export diagnostic logs and forecasts</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {genSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm animate-pulse">
          {genSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compiler Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <Plus className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Compile Report</h3>
          </div>
          
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Report Content</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300"
              >
                <option value="health">Equipment Health Summaries</option>
                <option value="maintenance">Maintenance Service Summaries</option>
                <option value="prediction">ML Prediction Archives</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Output Format</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "PDF Document", value: "pdf" },
                  { name: "CSV Spreadsheet", value: "csv" }
                ].map(op => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setFormat(op.value)}
                    className={`py-3 rounded-xl font-semibold text-xs border transition-all ${
                      format === op.value
                        ? "bg-blue-600/10 border-blue-500 text-blue-500 shadow-md shadow-blue-500/5"
                        : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    {op.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition disabled:opacity-50 mt-6"
            >
              {generating ? "Compiling..." : "Generate and Log Report"}
            </button>
          </form>
        </div>

        {/* Generated List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <FileBarChart className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Compiled Reports Archive</h3>
          </div>

          <div className="max-h-[380px] overflow-y-auto pr-1">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-20">No generated reports logged.</p>
            ) : (
              <div className="space-y-3.5">
                {reports.map(rep => {
                  const isCsv = rep.name.endsWith(".csv");
                  return (
                    <div 
                      key={rep.id} 
                      className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-200 dark:hover:border-slate-800 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                          isCsv ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        }`}>
                          {isCsv ? <FileSpreadsheet className="w-5.5 h-5.5" /> : <FileText className="w-5.5 h-5.5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-xs sm:max-w-md">{rep.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                            Type: {rep.report_type.toUpperCase()} | Generated {new Date(rep.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownload(rep.id, rep.name)}
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        title="Download report file"
                      >
                        <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
