import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <LandingPage onAuthSuccess={() => setIsAuthenticated(true)} />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? 
                <Dashboard onLogout={() => setIsAuthenticated(false)} /> : 
                <Navigate to="/" replace />
            } 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
