import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "../auth/AuthContext";
import "./Styles/tailwind.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
