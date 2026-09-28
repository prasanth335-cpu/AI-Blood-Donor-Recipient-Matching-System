import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Activity, Mail, Lock, User as UserIcon, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("engineer"); // "admin" or "engineer"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !fullName || !password) {
      setError("Please fill in all profile fields.");
      return;
    }
    
    setError("");
    setLoading(true);
    try {
      await register(email, password, fullName, role);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Operator registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 px-4 transition-all duration-200">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-emerald-600/5 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md shadow-2xl relative z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-4 animate-pulse-slow">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Register Operator
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Create your AegisPredict credentials
          </p>
        </div>

        {/* Success Dialog */}
        {success && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm animate-pulse">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>Profile Created! Redirecting to login console...</span>
          </div>
        )}

        {/* Error Alert Bar */}
        {error && (
          <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-sm animate-shake">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Operator Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="operator@factory.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Password (Min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Factory Authorization Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("engineer")}
                className={`py-3 rounded-xl font-semibold text-xs border transition-all ${
                  role === "engineer"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10"
                    : "bg-slate-900/40 border-slate-700 text-slate-400 hover:bg-slate-800/40"
                }`}
              >
                Maintenance Engineer
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`py-3 rounded-xl font-semibold text-xs border transition-all ${
                  role === "admin"
                    ? "bg-amber-600/20 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10"
                    : "bg-slate-900/40 border-slate-700 text-slate-400 hover:bg-slate-800/40"
                }`}
              >
                System Admin
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3.5 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "Registering Profile..." : "Create Operator Profile"}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-8 text-center border-t border-slate-800 pt-5">
          <p className="text-sm text-slate-400">
            Already registered?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">
              Operator Sign-in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
