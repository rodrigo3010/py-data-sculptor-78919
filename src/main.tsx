import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import axios from "axios";
// Quick development fix: direct all axios requests to the backend.
// Uses VITE_API_URL when provided, otherwise falls back to localhost:5050.
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:5050";

createRoot(document.getElementById("root")!).render(<App />);
