import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import "../Styles/tailwind.css";
import logoImage from "../images/logo.png";
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
      setError("Please enter admin ID");
      return;
    }
    if (!password) {
      setError("Please enter password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_BACKEND}/api/auth/admin-login`, {
        email: email.trim().toLowerCase(),
        password,
      });
      login({ ...res.data.user, token: res.data.token });
      navigate("/dashboard/team");
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans text-[#1a1a1a] relative overflow-hidden">
      {/* Watermark logo */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden="true"
      >
        <img
          src={logoImage}
          alt=""
          className="w-[340px] h-auto opacity-[0.06] grayscale"
          style={{ animation: "watermarkPulse 6s ease-in-out infinite" }}
        />
      </div>
      <style>{`
        @keyframes watermarkPulse {
          0%, 100% { opacity: 0.06; transform: scale(1); }
          50% { opacity: 0.10; transform: scale(1.03); }
        }
      `}</style>

      {/* Container */}
      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src={logoImage} alt="Logo" className="h-12 w-auto grayscale opacity-80" />
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold tracking-tight mb-2">Admin Log in</h1>
          <p className="text-[#787671] text-[16px]">Secure access for administrators</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-[13px] font-semibold text-[#37352f] mb-1.5 uppercase tracking-wider">
              Admin ID (Email)
            </label>
            <input
              type="email"
              placeholder="admin@madhura.com"
              className="w-full h-11 px-3 bg-white border border-[#e5e3df] rounded-lg outline-none focus:border-[#5645d4] focus:ring-[1px] focus:ring-[#5645d4] transition-all text-[15px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#37352f] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password..."
              className="w-full h-11 px-3 bg-white border border-[#e5e3df] rounded-lg outline-none focus:border-[#5645d4] focus:ring-[1px] focus:ring-[#5645d4] transition-all text-[15px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && tryLogin()}
            />
          </div>

          {error && (
            <div className="p-3 bg-[#fdf2f2] border border-[#f8d7da] rounded-lg text-[#e03131] text-[14px]">
              {error}
            </div>
          )}

          <button
            onClick={tryLogin}
            disabled={loading}
            className="w-full h-11 bg-[#5645d4] text-white rounded-lg font-semibold hover:bg-[#4534b3] transition shadow-sm disabled:opacity-50 text-[15px] mt-2"
          >
            {loading ? "Authenticating..." : "Log in as Admin"}
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-10 pt-6 border-t border-[#ede9e4] text-center space-y-3">
          <p className="text-[14px] text-[#787671]">
            Not an administrator?{" "}
            <Link to="/login" className="text-[#5645d4] hover:underline font-medium">
              User log in
            </Link>
          </p>
        </div>

        {/* Demo Credentials Hint */}
        <div className="mt-8 p-4 bg-[#f6f5f4] rounded-lg border border-[#e5e3df]">
          <p className="text-[12px] font-semibold text-[#787671] uppercase tracking-wider mb-2">Demo Credentials</p>
          <p className="text-[14px] text-[#37352f] font-medium">admin@madhura.com</p>
          <p className="text-[14px] text-[#787671]">admin@123#</p>
        </div>
      </div>
    </div>
  );
}