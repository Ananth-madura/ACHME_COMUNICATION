import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Search, X, User, Building2, Phone, MapPin, Loader2 } from "lucide-react";
import { API } from "../config";

const ClientSearchDropdown = ({ 
  value, 
  onSelect, 
  placeholder = "Search client name, company, phone or email...",
  required = false,
  className = "" 
}) => {
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Sync internal search term with external value if it changes externally
  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const handleSearch = async (val) => {
    setSearchTerm(val);
    if (val.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/api/client/search?name=${encodeURIComponent(val)}`, getAuthConfig());
      setResults(res.data || []);
      setIsOpen(true);
    } catch (error) {
      console.error("Client search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (client) => {
    setSearchTerm(client.name || "");
    setIsOpen(false);
    onSelect(client);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setResults([]);
    setIsOpen(false);
    onSelect({ name: "", phone: "", email: "", gst_number: "", city: "", address: "", company_name: "" });
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all text-sm font-medium placeholder:text-gray-400"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-[9999] left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top">
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {results.length > 0 ? (
              results.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-b-0 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {client.name?.charAt(0).toUpperCase() || "C"}
                      </div>
                      <span className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">
                        {client.name}
                      </span>
                    </div>
                    {client.gst_number && (
                      <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        GST: {client.gst_number}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                      <Building2 size={12} className="text-gray-400 flex-shrink-0" />
                      {client.company_name || "Personal"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                      <Phone size={12} className="text-gray-400 flex-shrink-0" />
                      {client.phone || "No contact"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap col-span-2">
                      <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                      {client.address ? `${client.address}, ${client.city || ""}` : "No address"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 font-medium">No results found for "{searchTerm}"</p>
                <p className="text-xs text-gray-400 mt-1">Try a different name, company, phone or email</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientSearchDropdown;
