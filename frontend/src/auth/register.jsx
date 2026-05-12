import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../Styles/tailwind.css";
import logoImage from "../images/logo.png";
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
      await axios.post(`${API_BACKEND}/api/auth/send-email-otp`, { email: form.email.trim().toLowerCase() });
      setOtpSent(true);
      alert("OTP sent to your email");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!form.first_name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!form.emp_id.trim()) {
      setError("Please enter your Employee ID");
      return;
    }
    if (!form.email.trim()) {
      setError("Please enter your email");
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
      await axios.post(`${API_BACKEND}/api/auth/register`, {
        ...form,
        email: form.email.trim().toLowerCase()
      });
      alert("Registration successful! Your account is pending admin approval.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans text-[#1a1a1a]">
      {/* Container */}
      <div className="w-full max-w-[450px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoImage} alt="Logo" className="h-10 w-auto grayscale opacity-80" />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold tracking-tight mb-2">Create an account</h1>
          <p className="text-[#787671] text-[16px]">Join the workspace</p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#37352f] mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full h-11 px-3 bg-white border border-[#e5e3df] rounded-lg outline-none focus:border-[#5645d4] focus:ring-[1px] focus:ring-[#5645d4] transition-all text-[15px]"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#37352f] mb-1.5 uppercase tracking-wider">
                Employee ID
              </label>
              <input
                type="text"
                placeholder="EMP001"
                className="w-full h-11 px-3 bg-white border border-[#e5e3df] rounded-lg outline-none focus:border-[#5645d4] focus:ring-[1px] focus:ring-[#5645d4] transition-all text-[15px]"
                value={form.emp_id}
                onChange={(e) => setForm({ ...form, emp_id: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#37352f] mb-1.5 uppercase tracking-wider">
              Work Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="name@company.com"
                className="flex-1 h-11 px-3 bg-white border border-[#e5e3df] rounded-lg outline-none focus:border-[#5645d4] focus:ring-[1px] focus:ring-[#5645d4] transition-all text-[15px]"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={loading || otpSent}
              />
              <button
                onClick={sendOtp}
                disabled={loading || otpSent}
                className="h-11 px-4 bg-[#f6f5f4] hover:bg-[#ede9e4] text-[#37352f] rounded-lg text-sm font-medium transition disabled:opacity-50 border border-[#e5e3df] whitespace-nowrap"
              >
                {otpSent ? "Sent" : "Get OTP"}
              </button>
            </div>
          </div>

          {otpSent && (
            <div>
              <label className="block text-[13px] font-semibold text-[#37352f] mb-1.5 uppercase tracking-wider">
                OTP Verification
              </label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                className="w-full h-11 px-3 bg-white border border-[#e5e3df] rounded-lg outline-none focus:border-[#5645d4] focus:ring-[1px] focus:ring-[#5645d4] transition-all text-[15px]"
                value={form.otp}
                onChange={(e) => setForm({ ...form, otp: e.target.value })}
                disabled={loading}
              />
            </div>
          )}

          

          <div>
            <label className="block text-[13px] font-semibold text-[#37352f] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              className="w-full h-11 px-3 bg-white border border-[#e5e3df] rounded-lg outline-none focus:border-[#5645d4] focus:ring-[1px] focus:ring-[#5645d4] transition-all text-[15px]"
              value={form.user_password}
              onChange={(e) => setForm({ ...form, user_password: e.target.value })}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-[#fdf2f2] border border-[#f8d7da] rounded-lg text-[#e03131] text-[14px]">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full h-11 bg-[#5645d4] text-white rounded-lg font-semibold hover:bg-[#4534b3] transition shadow-sm disabled:opacity-50 text-[15px] mt-4"
          >
            {loading ? "Creating..." : "Sign up"}
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-[#ede9e4] text-center">
          <p className="text-[14px] text-[#787671]">
            Already have an account?{" "}
            <Link to="/login" className="text-[#5645d4] hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}