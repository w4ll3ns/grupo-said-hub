import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

import FinanceiroDashboard from "./pages/financeiro/Dashboard";
import RDODashboard from "./pages/rdo/Dashboard";
import ComprasDashboard from "./pages/compras/Dashboard";

import Empresas from "./pages/admin/Empresas";
import Usuarios from "./pages/admin/Usuarios";
import Perfis from "./pages/admin/Perfis";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Home />} />

              {/* Financeiro */}
              <Route path="/financeiro" element={<FinanceiroDashboard />} />

              {/* RDO */}
              <Route path="/rdo" element={<RDODashboard />} />

              {/* Compras */}
              <Route path="/compras" element={<ComprasDashboard />} />

              {/* Admin */}
              <Route path="/admin/empresas" element={<Empresas />} />
              <Route path="/admin/usuarios" element={<Usuarios />} />
              <Route path="/admin/perfis" element={<Perfis />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
