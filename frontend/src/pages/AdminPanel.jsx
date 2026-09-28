import React, { useEffect, useState } from "react";
import { Shield, Users, Trash2, Edit2, CheckCircle2, UserCheck, X } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const AdminPanel = () => {
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("engineer");
  const [editError, setEditError] = useState("");

  const fetchUsers = async () => {
    try {
      setError("");
      const response = await api.get("/users");
      setUsers(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch registered operator directories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id, email) => {
    if (email === currentUser.email) {
      alert("Administrators cannot delete their own accounts.");
      return;
    }
    if (!window.confirm(`Are you sure you want to revoke system access for operator: ${email}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to delete user.");
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditError("");
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setEditError("");
    try {
      await api.put(`/users/${editingUser.id}`, { role: editRole });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setEditError(err.response?.data?.detail || "Failed to update role.");
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-500" />
          System Administration
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage user credentials, security authorization keys, and roles</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Users List Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/20">
          <Users className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Registered System Operators ({users.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Operator Name</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Role Authorization</th>
                <th className="py-4 px-6">Registered Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-sm text-slate-650 dark:text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 px-6 font-semibold">{u.full_name}</td>
                  <td className="py-4 px-6 font-mono text-xs">{u.email}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      u.role === "admin" 
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-400 font-semibold">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right space-x-3">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 transition"
                      title="Modify user parameters"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      disabled={u.email === currentUser.email}
                      className="p-1.5 border border-red-200/20 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30 disabled:pointer-events-none"
                      title="Deactivate account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODIFY ROLE DIALOG --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100 mb-2">
              Modify Authorization
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 mb-6 font-mono">{editingUser.email}</p>

            {editError && (
              <p className="p-3 mb-4 text-xs bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
                {editError}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-2">Select Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditRole("engineer")}
                    className={`py-3 rounded-xl font-semibold text-xs border transition-all ${
                      editRole === "engineer"
                        ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10"
                        : "bg-slate-900/40 border-slate-700 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    Maintenance Engineer
                  </button>
                  <button
                    type="button"
                    disabled={editingUser.email === currentUser.email}
                    onClick={() => setEditRole("admin")}
                    className={`py-3 rounded-xl font-semibold text-xs border transition-all ${
                      editRole === "admin"
                        ? "bg-amber-600/20 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10"
                        : "bg-slate-900/40 border-slate-700 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    System Admin
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveRole}
                className="w-full py-3 mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition"
              >
                Apply Role Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
