import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, Search, Plus, Trash2, Eye, MapPin, Edit3, X, SlidersHorizontal } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const MachineList = () => {
  const { isAdmin } = useAuth();
  
  const [machines, setMachines] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // Create/Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formManufacturer, setFormManufacturer] = useState("");
  const [formInstallDate, setFormInstallDate] = useState("");
  const [formStatus, setFormStatus] = useState("operational");
  const [formHours, setFormHours] = useState("0");
  const [submitError, setSubmitError] = useState("");

  const fetchMachinesAndDepts = async () => {
    try {
      setError("");
      const [machRes, deptRes] = await Promise.all([
        api.get("/machines"),
        api.get("/departments")
      ]);
      setMachines(machRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch equipment listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachinesAndDepts();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingMachine(null);
    setFormName("");
    setFormDeptId(departments[0]?.id || "");
    setFormLocation("");
    setFormManufacturer("");
    setFormInstallDate(new Date().toISOString().substring(0, 10));
    setFormStatus("operational");
    setFormHours("0");
    setSubmitError("");
    setModalOpen(true);
  };

  const handleOpenEditModal = (machine) => {
    setEditingMachine(machine);
    setFormName(machine.name);
    setFormDeptId(machine.department_id);
    setFormLocation(machine.factory_location);
    setFormManufacturer(machine.manufacturer);
    setFormInstallDate(machine.installation_date.substring(0, 10));
    setFormStatus(machine.status);
    setFormHours(machine.operating_hours.toString());
    setSubmitError("");
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    
    const payload = {
      name: formName,
      department_id: parseInt(formDeptId),
      factory_location: formLocation,
      manufacturer: formManufacturer,
      installation_date: new Date(formInstallDate).toISOString(),
      status: formStatus,
      operating_hours: parseFloat(formHours) || 0.0
    };

    try {
      if (editingMachine) {
        // Update Machine
        await api.put(`/machines/${editingMachine.id}`, payload);
      } else {
        // Create Machine
        await api.post("/machines", payload);
      }
      setModalOpen(false);
      fetchMachinesAndDepts();
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.detail || "Operation failed. Review input fields.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to decommission this asset from the records?")) return;
    try {
      await api.delete(`/machines/${id}`);
      fetchMachinesAndDepts();
    } catch (err) {
      console.error(err);
      alert("Failed to delete machine. Administrative role required.");
    }
  };

  // Filter application
  const filteredMachines = machines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                          m.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
                          m.factory_location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? m.status === statusFilter : true;
    const matchesDept = deptFilter ? m.department_id === parseInt(deptFilter) : true;
    return matchesSearch && matchesStatus && matchesDept;
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-slate-100">Equipment Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Add, configure, and monitor heavy machinery</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, site location, or maker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none text-slate-500 dark:text-slate-400"
          >
            <option value="">All Statuses</option>
            <option value="operational">Operational</option>
            <option value="maintenance_required">Maintenance Warning</option>
            <option value="offline">Offline/Critical</option>
          </select>
        </div>

        {/* Dept Filter */}
        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none text-slate-500 dark:text-slate-400"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Grid */}
      {filteredMachines.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No assets match your search</h3>
          <p className="text-sm text-slate-400 mt-1">Try relaxing filters or add a new machine to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMachines.map(m => (
            <div 
              key={m.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition duration-200 shadow-sm"
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{m.name}</h3>
                    <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      {m.manufacturer} | Installed {new Date(m.installation_date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(m.status)}`}>
                    {m.status === "maintenance_required" ? "Warning" : m.status}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-5 space-y-3.5 border-t border-slate-100 dark:border-slate-800/60 pt-4 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{m.factory_location}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span>Operating Hours</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{m.operating_hours.toFixed(1)} Hrs</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <Link
                  to={`/machines/${m.id}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition flex-1 text-slate-700 dark:text-slate-300"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Cockpit
                </Link>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(m)}
                      className="p-2 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition"
                      title="Edit specifications"
                    >
                      <Edit3 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-2 border border-red-200/40 hover:border-red-300/40 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500"
                      title="Decommission machine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
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
              {editingMachine ? `Edit Asset: ${editingMachine.name}` : "Log New Asset Parameters"}
            </h3>

            {submitError && (
              <p className="p-3 mb-4 text-xs bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
                {submitError}
              </p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Equipment Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CNC Lathe C"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Department</label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300 dark:bg-slate-900"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Factory Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bay 2, Grid G-1"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Manufacturer</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mazak"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Installation Date</label>
                  <input
                    type="date"
                    required
                    value={formInstallDate}
                    onChange={(e) => setFormInstallDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Initial Operating Hours</label>
                  <input
                    type="number"
                    step="any"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
              </div>

              {editingMachine && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Operational State Override</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300 dark:bg-slate-900"
                  >
                    <option value="operational">Operational (Healthy)</option>
                    <option value="maintenance_required">Maintenance Warning</option>
                    <option value="offline">Offline / Critical Alert</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition"
              >
                {editingMachine ? "Apply Updates" : "Register Machine Asset"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineList;
