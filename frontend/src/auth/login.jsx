import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import "../Styles/tailwind.css";
import logoImage from "../images/logo.png";
import backheadImage from "../images/backhead.png";
import { API } from "../config/api";

const API_BACKEND = API;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("password"); // "password" or "otp"

  const sendOtp = async () => {
    if (!email.trim()) {
      setError("Please enter email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API_BACKEND}/api/auth/send-email-otp`, { email: email.trim().toLowerCase() });
      alert("OTP sent to your email");
    } catch (err) {
      try {
        await axios.post("/api/auth/send-email-otp", { email: email.trim().toLowerCase() });
        alert("OTP sent to your email");
      } catch (err2) {
        setError(err2.response?.data?.message || "Failed to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!email.trim()) {
      setError("Please enter email");
      return;
    }
    if (loginMode === "otp" && !otp.trim()) {
      setError("Please enter OTP");
      return;
    }
    if (loginMode === "password" && !password.trim()) {
      setError("Please enter password");
      return;
    }

    setLoading(true);
    setError("");

    const payload = loginMode === "password" 
      ? { email: email.trim().toLowerCase(), password }
      : { email: email.trim().toLowerCase(), otp };

    try {
      const res = await axios.post(`${API_BACKEND}/api/auth/login`, payload);
      login({ ...res.data.user, token: res.data.token });
      navigate("/dashboard/team");
    } catch (err) {
      try {
        const res = await axios.post("/api/auth/login", payload);
        login({ ...res.data.user, token: res.data.token });
        navigate("/dashboard/team");
      } catch (err2) {
        const msg = err2.response?.data?.message || "Login failed";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-end relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={backheadImage} 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90"></div>
      </div>

      {/* Login Card - Right Side */}
      <div className="relative z-10 w-full max-w-md mx-4 my-auto mr-8 md:mr-16 lg:mr-24">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="Logo" className="h-16 w-auto object-contain" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white text-center">
            Welcome Back
          </h1>
          <p className="text-slate-400 text-center mt-2">
            Sign in to your account to continue
          </p>

          {/* Login Mode Toggle */}
          <div className="flex bg-white/10 rounded-lg p-1 mt-6">
            <button
              onClick={() => { setLoginMode("password"); setError(""); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${loginMode === "password" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Password Login
            </button>
            <button
              onClick={() => { setLoginMode("otp"); setError(""); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${loginMode === "otp" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              OTP Login
            </button>
          </div>

          {/* Form */}
          <div className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {loginMode === "password" ? (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    OTP Code
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Enter OTP"
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      onClick={sendOtp}
                      disabled={loading}
                      className="px-4 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      Send OTP
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>

          {/* Register Link */}
          <p className="text-center text-slate-400 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Register here
            </Link>
          </p>

          {/* Admin Login Link */}
          <p className="text-center text-slate-500 mt-4 text-sm">
            Are you an admin?{" "}
            <Link to="/login/admin" className="text-blue-400 hover:text-blue-300">
              Admin Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}