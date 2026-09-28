import React, { useEffect, useState } from "react";
import { 
  Activity, 
  Cpu, 
  Bell, 
  Wrench, 
  ShieldAlert, 
  Gauge, 
  Flame, 
  Zap, 
  Play, 
  RefreshCw,
  Clock
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import api from "../services/api";

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Simulator state
  const [selectedMachine, setSelectedMachine] = useState("");
  const [induceType, setInduceType] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState("");

  const fetchData = async () => {
    try {
      setError("");
      const [statsRes, analyticsRes, machinesRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/dashboard/analytics"),
        api.get("/machines")
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setMachines(machinesRes.data);
      if (machinesRes.data.length > 0 && !selectedMachine) {
        setSelectedMachine(machinesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch dashboard intelligence. Verify API connectivity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [selectedMachine]);

  const handleSimulate = async () => {
    if (!selectedMachine) return;
    setSimulating(true);
    setSimSuccess("");
    setError("");
    try {
      // 1. Simulate telemetry point
      const simUrl = `/sensor-data/simulate?machine_id=${selectedMachine}` + 
        (induceType ? `&induce_anomaly=${induceType}` : "");
      const telemetryRes = await api.post(simUrl);
      
      // 2. Trigger ML Prediction for this machine immediately
      await api.post(`/predictions/predict/${selectedMachine}`);

      setSimSuccess(
        `Simulation telemetry sent: Temp: ${telemetryRes.data.temperature.toFixed(1)}°C, Vib: ${telemetryRes.data.vibration.toFixed(1)} mm/s. ML classification completed.`
      );
      
      // Refresh
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Simulation cycle failed.");
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // --- Chart Data Configurations ---
  const lineChartData = {
    labels: analytics?.health_trends.map(t => t.date) || [],
    datasets: [
      {
        fill: true,
        label: "Facility Avg Health Score (%)",
        data: analytics?.health_trends.map(t => t.health) || [],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.35,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#fff",
      }
    ]
  };

  const tempChartData = {
    labels: analytics?.temperature_trends.map(t => t.date) || [],
    datasets: [
      {
        label: "Mean Temperature (°C)",
        data: analytics?.temperature_trends.map(t => t.temperature) || [],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.35,
        fill: true,
        pointBackgroundColor: "#ef4444",
      }
    ]
  };

  const barChartData = {
    labels: analytics?.department_comparison.map(d => d.department) || [],
    datasets: [
      {
        label: "Mean Health Score",
        data: analytics?.department_comparison.map(d => d.avg_health) || [],
        backgroundColor: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"],
        borderRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        grid: {
          color: "rgba(148, 163, 184, 0.1)"
        },
        ticks: {
          color: "rgba(148, 163, 184, 0.7)"
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: "rgba(148, 163, 184, 0.7)"
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-slate-100">Factory Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Real-time predictive maintenance logs and analytics</p>
        </div>
        <button 
          onClick={fetchData} 
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold transition"
        >
          <RefreshCw className="w-4 h-4" />
          Force Sync
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Machines */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-5 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Asset Inventory</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{stats?.total_machines}</h3>
          </div>
        </div>

        {/* System Health */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-5 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Health Index</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{stats?.avg_health_score}%</h3>
          </div>
        </div>

        {/* Offline Machines */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-5 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 text-red-500">
            <ShieldAlert className="w-6 h-6 animate-pulse-slow" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Offline Assets</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{stats?.critical_machines}</h3>
          </div>
        </div>

        {/* Warning Flags */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-5 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Warnings</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{stats?.active_alerts_count}</h3>
          </div>
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Trend */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Equipment Health Index Curve</h3>
            <span className="text-xs font-medium text-slate-400">Past 7 days</span>
          </div>
          <div className="h-64">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Dept Health */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Department Performance</h3>
            <span className="text-xs font-medium text-slate-400">Avg health score</span>
          </div>
          <div className="h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* 3. Simulator Controls & Recent Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anomaly Simulator Controls */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Play className="w-5 h-5 text-blue-500 fill-blue-500/20" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Telemetry Injector</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">Induce hardware faults in real-time to test alerts triggering and ML model classification.</p>
            
            <div className="space-y-4">
              {/* Select Machine */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Equipment</label>
                <select
                  value={selectedMachine}
                  onChange={(e) => setSelectedMachine(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                >
                  <option value="" disabled>Select machine...</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Anomaly Category */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Anomaly Inject Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "Normal (Clear)", value: "" },
                    { name: "Overheat", value: "temperature" },
                    { name: "Vibration", value: "vibration" },
                    { name: "Pressure Surge", value: "pressure" },
                    { name: "Electrical Fault", value: "electrical" },
                  ].map(op => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setInduceType(op.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        induceType === op.value
                          ? "bg-blue-600/10 border-blue-500 text-blue-500"
                          : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      {op.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            {simSuccess && (
              <p className="text-xs text-emerald-500 bg-emerald-500/10 p-3 rounded-lg mb-3">
                {simSuccess}
              </p>
            )}
            <button
              onClick={handleSimulate}
              disabled={simulating || !selectedMachine}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
            >
              {simulating ? "Injecting Signals..." : "Fire Simulation Cycle"}
            </button>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Live Activity Feed</h3>
          </div>
          
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {stats?.recent_activity.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No recent logs recorded.</p>
            ) : (
              stats?.recent_activity.map((act, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg mt-0.5 ${
                    act.type === "alert" 
                      ? act.severity === "Critical" 
                        ? "bg-red-500/10 text-red-500" 
                        : "bg-amber-500/10 text-amber-500" 
                      : "bg-blue-500/10 text-blue-500"
                  }`}>
                    {act.type === "alert" ? <Bell className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                      {act.message}
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
