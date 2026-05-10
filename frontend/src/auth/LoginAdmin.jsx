import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import "../Styles/tailwind.css";
import logoImage from "../images/logo.png";
import backheadImage from "../images/backhead.png";
import { API } from "../config/api";

const API_BACKEND = API;

export default function LoginAdmin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tryLogin = async () => {
    if (!email.trim()) {
      setError("Please enter admin ID (email)");
      return;
    }
    if (!password) {
      setError("Please enter password");
      return;
    }

    setLoading(true);
    setError("");

    let res;
    try {
      res = await axios.post(`${API_BACKEND}/api/auth/admin-login`, {
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (err) {
      try {
        res = await axios.post("/api/auth/admin-login", {
          email: email.trim().toLowerCase(),
          password,
        });
      } catch (err2) {
        setLoading(false);
        if (err2.response) {
          const status = err2.response.status;
          const msg = err2.response.data?.message || "Unknown error";
          if (status === 401) {
            setError("Invalid credentials");
          } else if (status === 400) {
            setError("Missing email or password");
          } else {
            setError(`Error: ${msg}`);
          }
        } else {
          setError("Cannot connect to server. Start backend on port 5000");
        }
        return;
      }
    }

    if (res?.data?.token && res?.data?.user) {
      login({ ...res.data.user, token: res.data.token });
      navigate("/dashboard/team");
    } else {
      setError("Invalid response from server");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-end relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={backheadImage} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 my-auto mr-8 md:mr-16 lg:mr-24">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="Logo" className="h-16 w-auto object-contain" />
          </div>

          <h1 className="text-3xl font-bold text-white text-center">Admin Login</h1>
          <p className="text-slate-400 text-center mt-2">Access your admin dashboard</p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Admin ID (Email)</label>
              <input
                type="email"
                placeholder="admin@example.com"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && tryLogin()}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">{error}</div>
            )}

            <button
              onClick={tryLogin}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Logging in..." : "Login as Admin"}
            </button>
          </div>

          <p className="text-center text-slate-400 mt-6">
            Not an admin?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">User Login</Link>
          </p>

          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-center">
            <p className="text-xs text-slate-400">Demo Credentials:</p>
            <p className="text-sm text-slate-300">admin@madhura.com / admin@123#</p>
          </div>
        </div>
      </div>
    </div>
  );
}