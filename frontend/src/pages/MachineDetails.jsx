import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Cpu, 
  MapPin, 
  Clock, 
  Wrench, 
  Bell, 
  BrainCircuit, 
  Gauge, 
  Thermometer, 
  Activity, 
  ChevronRight,
  TrendingUp,
  RotateCw,
  FolderDot
} from "lucide-react";
import { Line } from "react-chartjs-2";
import api from "../services/api";

const MachineDetails = () => {
  const { id } = useParams();
  const [machine, setMachine] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Trigger on-demand ML evaluations
  const [evaluating, setEvaluating] = useState(false);
  const [evalSuccess, setEvalSuccess] = useState("");

  const fetchDetails = async () => {
    try {
      setError("");
      const [machRes, telRes] = await Promise.all([
        api.get(`/machines/${id}`),
        api.get(`/sensor-data?machine_id=${id}&limit=30`)
      ]);
      setMachine(machRes.data);
      setTelemetry(telRes.data.reverse()); // Chronological order
    } catch (err) {
      console.error(err);
      setError("Failed to fetch detailed specifications for this equipment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [id]);

  const handleTriggerPrediction = async () => {
    setEvaluating(true);
    setEvalSuccess("");
    setError("");
    try {
      const response = await api.post(`/predictions/predict/${id}`);
      setEvalSuccess(
        `On-demand evaluation complete! Model: ${response.data.model_used}. Health: ${response.data.health_score.toFixed(1)}%`
      );
      fetchDetails();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "ML evaluation failed. Ensure telemetry is simulated first."
      );
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 font-bold">Equipment not found</h3>
        <p className="text-sm text-slate-400 mt-1">This ID does not map to any active monitored hardware asset.</p>
        <Link to="/machines" className="text-blue-500 hover:underline mt-4 inline-block">Back to inventory</Link>
      </div>
    );
  }

  // --- Chart Setup (Temp and Vibration timelines) ---
  const timelineChartData = {
    labels: telemetry.map(t => new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })) || [],
    datasets: [
      {
        label: "Temperature (°C)",
        data: telemetry.map(t => t.temperature) || [],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.05)",
        tension: 0.3,
        yAxisID: "y-temp",
      },
      {
        label: "Vibration (mm/s)",
        data: telemetry.map(t => t.vibration) || [],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.05)",
        tension: 0.3,
        yAxisID: "y-vib",
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "rgba(148, 163, 184, 0.7)"
        }
      }
    },
    scales: {
      "y-temp": {
        type: "linear",
        position: "left",
        grid: {
          color: "rgba(148, 163, 184, 0.05)"
        },
        ticks: {
          color: "rgba(239, 68, 68, 0.8)",
          callback: (value) => `${value}°C`
        }
      },
      "y-vib": {
        type: "linear",
        position: "right",
        grid: {
          display: false
        },
        ticks: {
          color: "rgba(59, 130, 246, 0.8)",
          callback: (value) => `${value} mm/s`
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: "rgba(148, 163, 184, 0.7)",
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  // Get current telemetry readings
  const currentSensor = telemetry[telemetry.length - 1];
  const latestPrediction = machine.recent_predictions[0];
  
  // Health Colors
  const healthScore = latestPrediction?.health_score ?? 100.0;
  const failureProb = latestPrediction?.failure_probability ?? 0.05;
  const probPct = failureProb <= 1.0 ? failureProb * 100 : failureProb;

  const getHealthColor = (score) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "operational":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "maintenance_required":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "offline":
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 border border-slate-500/20";
    }
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Navigation links */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link to="/machines" className="hover:underline">Machines</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">{machine.name}</span>
        </div>
        <button
          onClick={handleTriggerPrediction}
          disabled={evaluating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
        >
          <BrainCircuit className="w-4 h-4" />
          {evaluating ? "Evaluating Models..." : "Run ML Prognosis"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {evalSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm animate-pulse">
          {evalSuccess}
        </div>
      )}

      {/* 1. Header Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-500">
              <Cpu className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{machine.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1.5">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{machine.factory_location}</span>
                <span className="flex items-center gap-1"><FolderDot className="w-3.5 h-3.5" />{machine.department?.name}</span>
                <span>Manufacturer: {machine.manufacturer}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mt-1.5 inline-block ${getStatusBadge(machine.status)}`}>
                {machine.status === "maintenance_required" ? "Warning" : machine.status}
              </span>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Hours Log</span>
              <span className="text-lg font-bold text-slate-700 dark:text-slate-350 block mt-1">{machine.operating_hours.toFixed(1)} Hrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ML Prognosis & Live Sensors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Prognosis Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <BrainCircuit className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100">AI Prognosis Panel</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Health Score */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Health Score</span>
                <span className={`text-3xl font-extrabold block mt-1.5 ${getHealthColor(healthScore)}`}>
                  {healthScore.toFixed(0)}%
                </span>
              </div>
              {/* Failure Risk */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Failure Risk</span>
                <span className={`text-3xl font-extrabold block mt-1.5 ${probPct > 50 ? "text-red-500" : probPct > 20 ? "text-amber-500" : "text-emerald-500"}`}>
                  {probPct.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Remaining Useful Life */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Useful Life</span>
                <span className="text-base font-bold text-slate-700 dark:text-slate-200 mt-1 block">
                  {latestPrediction ? `${latestPrediction.remaining_useful_life.toFixed(0)} Hours` : "Unknown"}
                </span>
              </div>
              <Clock className="w-8 h-8 text-slate-400" />
            </div>

            {/* AI Recommendation */}
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Recommendation Playbook</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                {latestPrediction?.recommendation || "Evaluate model to generate recommendation playbooks."}
              </p>
            </div>
          </div>
          <div className="text-[9px] font-semibold text-slate-500 text-center border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-6">
            INFERENCE ORACLE: {latestPrediction ? latestPrediction.model_used.toUpperCase() : "NONE"}
          </div>
        </div>

        {/* Live Telemetry Panels */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-6">
            <Gauge className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Live Telemetry Diagnostics</h3>
          </div>

          {!currentSensor ? (
            <p className="text-sm text-slate-500 text-center py-20">No telemetry signals recorded for this machine.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: "Temperature", val: `${currentSensor.temperature.toFixed(1)}°C`, icon: Thermometer, max: 120, current: currentSensor.temperature, color: "text-red-500", progress: (currentSensor.temperature / 120) * 100 },
                { name: "Vibration", val: `${currentSensor.vibration.toFixed(1)} mm/s`, icon: Activity, max: 15, current: currentSensor.vibration, color: "text-blue-500", progress: (currentSensor.vibration / 15) * 100 },
                { name: "Pressure", val: `${currentSensor.pressure.toFixed(1)} bar`, icon: Gauge, max: 10, current: currentSensor.pressure, color: "text-purple-500", progress: (currentSensor.pressure / 10) * 100 },
                { name: "Current Draw", val: `${currentSensor.current.toFixed(1)} A`, icon: TrendingUp, max: 25, current: currentSensor.current, color: "text-amber-500", progress: (currentSensor.current / 25) * 100 },
              ].map(tile => {
                const TileIcon = tile.icon;
                return (
                  <div key={tile.name} className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tile.name}</span>
                        <TileIcon className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{tile.val}</span>
                    </div>
                    {/* Progress indicator */}
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          tile.progress > 80 ? "bg-red-500" : tile.progress > 50 ? "bg-amber-500" : "bg-emerald-500"
                        }`} 
                        style={{ width: `${Math.min(100, tile.progress)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Secondary operational metrics */}
          {currentSensor && (
            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800/60 pt-6 mt-6 text-center text-xs">
              <div>
                <span className="text-slate-400 block font-semibold mb-1">Rotational Speed</span>
                <span className="font-bold text-slate-700 dark:text-slate-355">{currentSensor.rpm.toFixed(0)} RPM</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-1">Voltage Feed</span>
                <span className="font-bold text-slate-700 dark:text-slate-355">{currentSensor.voltage.toFixed(1)} V</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-1">Humidity</span>
                <span className="font-bold text-slate-700 dark:text-slate-355">{currentSensor.humidity.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sensor Timelines Chart */}
      {telemetry.length > 0 && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Telemetry Timelines (Temp & Vibration)</h3>
            <span className="text-xs font-semibold text-slate-400">Past 30 records</span>
          </div>
          <div className="h-64">
            <Line data={timelineChartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* 4. Logs Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Logs */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
            <Wrench className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Service Logs</h3>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto pr-1">
            {machine.recent_logs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">No servicing logs registered.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2">Date</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Cost</th>
                    <th className="py-2">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-600 dark:text-slate-350">
                  {machine.recent_logs.map(log => (
                    <tr key={log.id}>
                      <td className="py-3">{new Date(log.service_date).toLocaleDateString()}</td>
                      <td className="py-3 font-semibold">{log.action_taken}</td>
                      <td className="py-3">${log.cost.toFixed(2)}</td>
                      <td className="py-3">{log.performer_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Alerts Center */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
            <Bell className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Alarms History</h3>
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-1">
            {machine.recent_alerts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">No alerts logged.</p>
            ) : (
              <div className="space-y-3">
                {machine.recent_alerts.map(alert => (
                  <div key={alert.id} className="flex justify-between items-start gap-4 p-3.5 bg-slate-50 dark:bg-slate-950/20 rounded-xl">
                    <div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        alert.type === "Critical" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {alert.type}
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-2">{alert.message}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                        alert.status === "active" ? "text-red-500 font-bold" : "text-slate-400"
                      }`}>
                        {alert.status}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {new Date(alert.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineDetails;
