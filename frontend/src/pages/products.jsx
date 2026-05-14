import { useState, useEffect } from "react";
import axios from "axios";
import { X, Search, Plus, Eye, ChevronLeft, ChevronRight, Edit, Trash2 } from "lucide-react";
import "../Styles/tailwind.css";

import { API as BASE_API } from "../config";

function Products() {
  const API = `${BASE_API}/api`;
  const userRole = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").role || "employee"; } catch { return "employee"; } })();
  const canEditDelete = userRole === "admin" || userRole === "subadmin";

  const [showModal, setShowModal] = useState(false);
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [client, setClient] = useState("");
  const [material, setMaterial] = useState("");
  const [warranty, setWarranty] = useState("");
  const [amc, setAmc] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [issues, setIssues] = useState("");

  const [clients, setClients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  // Edit State
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  // Carousel State
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔥 FETCH SERVICES
  const fetchServices = async () => {
    try {
      const res = await axios.get(`${API}/services`);
      setServices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // 🔍 CLIENT SEARCH
  const fetchClients = async (query) => {
    try {
      const res = await axios.get(`${API}/client/search?name=${query}`);
      setClients(res.data);
    } catch (err) {
      // If search endpoint doesn't exist, we could fetch all and filter locally
      try {
        const allRes = await axios.get(`${API}/client`);
        const filtered = allRes.data.filter(c => 
          c.name?.toLowerCase().includes(query.toLowerCase()) || 
          c.company_name?.toLowerCase().includes(query.toLowerCase())
        );
        setClients(filtered);
      } catch (err2) {
        console.error(err2);
      }
    }
  };

  const handleClientChange = (e) => {
    const value = e.target.value;
    setClient(value);

    if (value.length > 1) {
      fetchClients(value);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  // 🖼️ IMAGE PREVIEW
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);

    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setPreviews(previewUrls);
  };

  // 📤 SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("client", client);
    formData.append("material", material);
    formData.append("warranty", warranty);
    formData.append("amc", amc);
    formData.append("date", date);
    formData.append("issues", issues);

    images.forEach((img) => formData.append("images", img));

    try {
      if (isEdit) {
        await axios.put(`${API}/services/${editId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        alert("Service updated successfully");
      } else {
        await axios.post(`${API}/services`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        alert("Service added successfully");
      }

      fetchServices();
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Error saving service: " + (err.response?.data?.message || err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await axios.delete(`${API}/services/${id}`);
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (service) => {
    setEditId(service.id);
    setIsEdit(true);
    setClient(service.client);
    setMaterial(service.material);
    setWarranty(service.warranty);
    setAmc(service.amc === 1 || service.amc === true);
    setDate(service.date?.split("T")[0]);
    setIssues(service.issues || "");
    setPreviews([]); // In a real app we might show existing images
    setImages([]);
    setShowModal(true);
  };

  const resetForm = () => {
    setClient("");
    setMaterial("");
    setWarranty("");
    setAmc(false);
    setDate(new Date().toISOString().slice(0, 10));
    setIssues("");
    setImages([]);
    setPreviews([]);
    setIsEdit(false);
    setEditId(null);
  };

  const openCarousel = (imgs) => {
    if (imgs && imgs.length > 0) {
      let imageList = imgs;
      if (typeof imgs === "string") {
        try {
          imageList = JSON.parse(imgs);
        } catch (e) {
          imageList = [imgs];
        }
      }
      setCurrentImages(imageList);
      setCurrentIndex(0);
      setCarouselOpen(true);
    }
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % currentImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + currentImages.length) % currentImages.length);
  };

  useEffect(() => {
    if (showModal || carouselOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [showModal, carouselOpen]);

  // Material-based search logic
  const filteredServices = services.filter(s => 
    s.material?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.client?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-[111vh] p-6">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-[#1694CE]">Products</h1>
        <a className="text-sm text-gray-500" href="/dashboard"> Dashboard &gt; Services &gt; Products </a>
      </div>

      {/* ----------------- FILTER & SEARCH BAR ----------------- */}
      <div className="bg-[#F3F8FA] p-4 rounded-xl flex justify-between items-center shadow mb-4">
        {/* Search */}
        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg shadow border w-80">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search by Material or Client"
            className="outline-none text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Add Button */}
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#FF3355] text-white w-12 h-12 rounded-full flex justify-center items-center shadow-lg hover:bg-[#e62848]"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F3F8FA] text-gray-700">
            <tr>
              <th className="p-4 font-semibold border-b">Client</th>
              <th className="p-4 font-semibold border-b">Material</th>
              <th className="p-4 font-semibold border-b">Warranty</th>
              <th className="p-4 font-semibold border-b">AMC</th>
              <th className="p-4 font-semibold border-b">Date</th>
              <th className="p-4 font-semibold border-b text-center">Images</th>
              <th className="p-4 font-semibold border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50 border-b">
                <td className="p-4">{s.client}</td>
                <td className="p-4 font-medium">{s.material}</td>
                <td className="p-4">{s.warranty}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${s.amc ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {s.amc ? "Active" : "None"}
                  </span>
                </td>
                <td className="p-4">{s.date?.split("T")[0]}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => openCarousel(s.images)}
                    className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                    title="View Images"
                  >
                    <Eye size={18} />
                  </button>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => startEdit(s)}
                      className="text-blue-600 hover:text-blue-800 transition"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    {canEditDelete && <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredServices.length === 0 && (
          <div className="p-8 text-center text-gray-500">No products found.</div>
        )}
      </div>

      {/* MODAL FORM */}
      <div className={`overlay ${showModal ? "show" : ""} justify-items-center`}>
        <div className={`${showModal ? "show" : ""} task-application bg-white shadow-2xl p-9 rounded-xl w-[60%] z-50 mt-10 max-h-[90vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-700">{isEdit ? "Edit Product" : "Add New Product"}</h2>
            <span className="x-icon cursor-pointer" onClick={() => setShowModal(false)}><X size={24} /></span>
          </div>

          <form onSubmit={handleSubmit} className="task-form space-y-6">
            <div className="flex items-center gap-6 relative">
              <label className="w-40 text-lg">Client*</label>
              <div className="w-[60%] relative">
                <input
                  type="text"
                  value={client}
                  onChange={handleClientChange}
                  className="form-control w-full border rounded-lg p-2"
                  placeholder="Search & Select Client"
                  required
                />
                {showDropdown && clients.length > 0 && (
                  <div className="absolute bg-white border rounded-lg shadow-lg w-full z-10 mt-1 max-h-40 overflow-y-auto">
                    {clients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setClient(c.name || c.company_name);
                          setShowDropdown(false);
                        }}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                      >
                        {c.name} {c.company_name ? `- ${c.company_name}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="w-40 text-lg">Material*</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="form-control w-[60%] border rounded-lg p-2"
                required
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="w-40 text-lg">Warranty*</label>
              <input
                type="text"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                className="form-control w-[60%] border rounded-lg p-2"
                placeholder="e.g. 1 Year"
                required
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="w-40 text-lg">Date*</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-control w-[60%] border rounded-lg p-2"
                required
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="w-40 text-lg">Issues</label>
              <textarea
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                className="form-control w-[60%] border rounded-lg p-2 h-20"
                placeholder="Mention any damages or issues here..."
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="w-40 text-lg">AMC Status</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={amc}
                  onChange={(e) => setAmc(e.target.checked)}
                  className="w-5 h-5 accent-blue-600"
                />
                <span className="text-gray-600">AMC Clear</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-6">
                <label className="w-40 text-lg">Images</label>
                <input
                  type="file"
                  multiple
                  onChange={handleImageChange}
                  className="w-[60%] text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <p className="text-xs text-gray-500 ml-46">Supports large files and various dimensions.</p>
              <div className="flex gap-2 ml-46 mt-2 overflow-x-auto pb-2">
                {previews.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} className="w-20 h-20 object-cover rounded-lg border shadow-sm" alt="preview" />
                    <button
                      type="button"
                      onClick={() => {
                        const newPreviews = previews.filter((_, idx) => idx !== i);
                        const newFiles = Array.from(images).filter((_, idx) => idx !== i);
                        setPreviews(newPreviews);
                        setImages(newFiles);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 transition shadow-md"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="bg-gray-400 text-white px-8 py-2 rounded-lg hover:bg-red-500 transition shadow-md"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* IMAGE CAROUSEL */}
      <div className={`overlay ${carouselOpen ? "show" : ""} flex justify-center items-center`}>
        <div className="relative bg-black/95 w-[90%] h-[90vh] rounded-2xl flex items-center justify-center p-4">
          <button
            onClick={() => setCarouselOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-red-500 transition z-50 bg-white/10 p-2 rounded-full"
          >
            <X size={32} />
          </button>

          {currentImages.length > 0 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-6 text-white bg-white/10 p-4 rounded-full hover:bg-white/20 transition z-50"
              >
                <ChevronLeft size={48} />
              </button>

              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={`${BASE_API}/uploads/${currentImages[currentIndex]}`}
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  alt={`Product img ${currentIndex + 1}`}
                />
              </div>

              <button
                onClick={nextImage}
                className="absolute right-6 text-white bg-white/10 p-4 rounded-full hover:bg-white/20 transition z-50"
              >
                <ChevronRight size={48} />
              </button>

              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 px-6 py-2 rounded-full text-white font-medium backdrop-blur-md">
                {currentIndex + 1} / {currentImages.length}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Products;
