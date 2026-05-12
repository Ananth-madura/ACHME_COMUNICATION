import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import "../Styles/tailwind.css";
import logoImage from "../images/logo.png";
import loginBg from "../images/login-image.jpg";
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
      setError(err.response?.data?.message || "Failed to send OTP");
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
      const msg = err.response?.data?.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 font-sans text-[#1a1a1a] relative overflow-hidden"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(10,10,20,0.68)" }} aria-hidden="true" />

      {/* Container */}
      <div className="w-full max-w-[420px] relative z-10 bg-white rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoImage} alt="Logo" className="w-auto" style={{ height: "184px" }} />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold tracking-tight mb-2">Sign in</h1>
          <p className="text-[#787671] text-[16px]">Choose your preferred login method</p>
        </div>

        {/* Login Mode Toggle (Notion Segmented Style) */}
        <div className="flex border-b border-[#ede9e4] mb-8">
          <button
            onClick={() => { setLoginMode("password"); setError(""); }}
            className={`flex-1 pb-3 text-sm font-medium transition-all ${loginMode === "password" ? "text-[#1a1a1a] border-b-2 border-[#1a1a1a]" : "text-[#787671] hover:text-[#1a1a1a]"}`}
          >
            Password
          </button>
          <button
            onClick={() => { setLoginMode("otp"); setError(""); }}
            className={`flex-1 pb-3 text-sm font-medium transition-all ${loginMode === "otp" ? "text-[#1a1a1a] border-b-2 border-[#1a1a1a]" : "text-[#787671] hover:text-[#1a1a1a]"}`}
          >
            OTP
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-[13px] font-semibold text-[#37352f] mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email..."
              className="w-full h-11 px-3 bg-white border border-[#e5e3df] rounded-lg outline-none focus:border-[#5645d4] focus:ring-[1px] focus:ring-[#5645d4] transition-all text-[15px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {loginMode === "password" ? (
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
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>
          ) : (
            <div>
              <label className="block text-[13px] font-semibold text-[#37352f] mb-1.5 uppercase tracking-wider">
                OTP Verification
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="6-digit code"
                  className="flex-1 h-11 px-3 bg-white border border-[#e5e3df] rounded-lg outline-none focus:border-[#5645d4] focus:ring-[1px] focus:ring-[#5645d4] transition-all text-[15px]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                />
                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="h-11 px-4 bg-[#f6f5f4] hover:bg-[#ede9e4] text-[#37352f] rounded-lg text-sm font-medium transition disabled:opacity-50 border border-[#e5e3df]"
                >
                  Send OTP
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-[#fdf2f2] border border-[#f8d7da] rounded-lg text-[#e03131] text-[14px]">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full h-11 bg-[#5645d4] text-white rounded-lg font-semibold hover:bg-[#4534b3] transition shadow-sm disabled:opacity-50 text-[15px] mt-2"
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-8 pt-5 border-t border-[#ede9e4] text-center space-y-3">
          <p className="text-[14px] text-[#787671]">
            New to the platform?{" "}
            <Link to="/register" className="text-[#5645d4] hover:underline font-medium">
              Create account
            </Link>
          </p>
          <p className="text-[14px] text-[#787671]">
            Are you an administrator?{" "}
            <Link to="/login/admin" className="text-[#5645d4] hover:underline font-medium">
              Admin log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}