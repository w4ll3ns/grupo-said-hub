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
import PlanoContas from "./pages/financeiro/PlanoContas";
import ContasBancarias from "./pages/financeiro/ContasBancarias";
import FormasPagamento from "./pages/financeiro/FormasPagamento";
import CentrosCusto from "./pages/financeiro/CentrosCusto";
import ContasPagar from "./pages/financeiro/ContasPagar";
import ContasReceber from "./pages/financeiro/ContasReceber";
import Lancamentos from "./pages/financeiro/Lancamentos";
import Transferencias from "./pages/financeiro/Transferencias";
import FluxoCaixa from "./pages/financeiro/FluxoCaixa";
import DRE from "./pages/financeiro/DRE";
import Metas from "./pages/financeiro/Metas";
import RDODashboard from "./pages/rdo/Dashboard";
import Obras from "./pages/rdo/Obras";
import Funcionarios from "./pages/rdo/Funcionarios";
import EquipamentosPage from "./pages/rdo/Equipamentos";
import Relatorios from "./pages/rdo/Relatorios";
import ComprasDashboard from "./pages/compras/Dashboard";
import Solicitacoes from "./pages/compras/Solicitacoes";
import Cotacoes from "./pages/compras/Cotacoes";
import Pedidos from "./pages/compras/Pedidos";
import Fornecedores from "./pages/compras/Fornecedores";
import Catalogo from "./pages/compras/Catalogo";

import Empresas from "./pages/admin/Empresas";
import Usuarios from "./pages/admin/Usuarios";
import Perfis from "./pages/admin/Perfis";
import Configuracoes from "./pages/admin/Configuracoes";

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
              <Route path="/financeiro/plano-contas" element={<PlanoContas />} />
              <Route path="/financeiro/contas-bancarias" element={<ContasBancarias />} />
              <Route path="/financeiro/formas-pagamento" element={<FormasPagamento />} />
              <Route path="/financeiro/centros-custo" element={<CentrosCusto />} />
              <Route path="/financeiro/contas-pagar" element={<ContasPagar />} />
              <Route path="/financeiro/contas-receber" element={<ContasReceber />} />
              <Route path="/financeiro/lancamentos" element={<Lancamentos />} />
              <Route path="/financeiro/transferencias" element={<Transferencias />} />
              <Route path="/financeiro/fluxo-caixa" element={<FluxoCaixa />} />
              <Route path="/financeiro/dre" element={<DRE />} />
              <Route path="/financeiro/metas" element={<Metas />} />
              {/* RDO */}
              <Route path="/rdo" element={<RDODashboard />} />
              <Route path="/rdo/relatorios" element={<Relatorios />} />
              <Route path="/rdo/obras" element={<Obras />} />
              <Route path="/rdo/funcionarios" element={<Funcionarios />} />
              <Route path="/rdo/equipamentos" element={<EquipamentosPage />} />

              {/* Compras */}
              <Route path="/compras" element={<ComprasDashboard />} />
              <Route path="/compras/solicitacoes" element={<Solicitacoes />} />
              <Route path="/compras/cotacoes" element={<Cotacoes />} />
              <Route path="/compras/pedidos" element={<Pedidos />} />
              <Route path="/compras/fornecedores" element={<Fornecedores />} />
              <Route path="/compras/catalogo" element={<Catalogo />} />

              {/* Admin */}
              <Route path="/admin/empresas" element={<Empresas />} />
              <Route path="/admin/usuarios" element={<Usuarios />} />
              <Route path="/admin/perfis" element={<Perfis />} />
              <Route path="/admin/configuracoes" element={<Configuracoes />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
