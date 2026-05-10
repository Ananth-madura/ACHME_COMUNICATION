import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../Styles/tailwind.css";
import logoImage from "../images/logo.png";
import backheadImage from "../images/backhead.png";
import { API } from "../config/api";

const API_BACKEND = API;

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    user_password: "",
    email: "",
    otp: "",
    emp_name: "",
    emp_id: "",
  });

  const sendOtp = async () => {
    if (!form.email) {
      setError("Please enter email");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await axios.post(`${API_BACKEND}/api/auth/send-email-otp`, { email: form.email });
      setOtpSent(true);
      alert("OTP sent to your email");
    } catch (err) {
      try {
        await axios.post("/api/auth/send-email-otp", { email: form.email });
        setOtpSent(true);
        alert("OTP sent to your email");
      } catch (err2) {
        setError(err2.response?.data?.message || "Failed to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!form.first_name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!form.otp) {
      setError("Please enter OTP");
      return;
    }
    if (form.user_password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.post(`${API_BACKEND}/api/auth/register`, form);
      alert("Registration successful! Your account is pending admin approval.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
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

      {/* Register Card - Right Side */}
      <div className="relative z-10 w-full max-w-md mx-4 my-auto mr-8 md:mr-16 lg:mr-24">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="Logo" className="h-16 w-auto object-contain" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white text-center">
            Create Account
          </h1>
          <p className="text-slate-400 text-center mt-2">
            Join our team today
          </p>

          {/* Form */}
          <div className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Employee Name
              </label>
              <input
                type="text"
                placeholder="Enter employee name"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                value={form.emp_name}
                onChange={(e) => setForm({ ...form, emp_name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Employee ID Number
              </label>
              <input
                type="text"
                placeholder="Enter employee ID (e.g., EMP001)"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                value={form.emp_id}
                onChange={(e) => setForm({ ...form, emp_id: e.target.value })}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={loading || otpSent}
                />
                <button
                  onClick={sendOtp}
                  disabled={loading || otpSent}
                  className="px-4 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {otpSent ? "Sent" : "Get OTP"}
                </button>
              </div>
            </div>

            {otpSent && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Create password (min 6 characters)"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                value={form.user_password}
                onChange={(e) => setForm({ ...form, user_password: e.target.value })}
                disabled={loading}
              />
            </div>

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
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </div>

          {/* Login Link */}
          <p className="text-center text-slate-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </Link>
          </p>

          {/* Admin Login Link */}
          <p className="text-center text-slate-500 mt-3 text-sm">
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