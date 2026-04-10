import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Building2,
  LayoutDashboard,
  DollarSign,
  FileText,
  ShoppingCart,
  Users,
  Shield,
  Settings,
  HardHat,
  ClipboardList,
  TrendingUp,
  Receipt,
  Wallet,
  ArrowLeftRight,
  Target,
  Package,
  Truck,
  FileCheck,
} from 'lucide-react';

const menuGroups = [
  {
    label: 'Financeiro',
    modulo: 'financeiro',
    items: [
      { title: 'Dashboard', url: '/financeiro', icon: LayoutDashboard, funcionalidade: 'dashboard' },
      { title: 'Lançamentos', url: '/financeiro/lancamentos', icon: Receipt, funcionalidade: 'lancamentos' },
      { title: 'Contas a Pagar', url: '/financeiro/contas-pagar', icon: Wallet, funcionalidade: 'contas_pagar' },
      { title: 'Contas a Receber', url: '/financeiro/contas-receber', icon: DollarSign, funcionalidade: 'contas_receber' },
      { title: 'Transferências', url: '/financeiro/transferencias', icon: ArrowLeftRight, funcionalidade: 'transferencias' },
      { title: 'Fluxo de Caixa', url: '/financeiro/fluxo-caixa', icon: TrendingUp, funcionalidade: 'fluxo_caixa' },
      { title: 'DRE', url: '/financeiro/dre', icon: FileText, funcionalidade: 'dre' },
      { title: 'Metas', url: '/financeiro/metas', icon: Target, funcionalidade: 'metas' },
      { title: 'Plano de Contas', url: '/financeiro/plano-contas', icon: ClipboardList, funcionalidade: 'plano_contas' },
      { title: 'Contas Bancárias', url: '/financeiro/contas-bancarias', icon: Wallet, funcionalidade: 'contas_bancarias' },
      { title: 'Formas de Pgto', url: '/financeiro/formas-pagamento', icon: Receipt, funcionalidade: 'formas_pagamento' },
      { title: 'Centros de Custo', url: '/financeiro/centros-custo', icon: Target, funcionalidade: 'centros_custo' },
    ],
  },
  {
    label: 'RDO',
    modulo: 'rdo',
    items: [
      { title: 'Dashboard', url: '/rdo', icon: LayoutDashboard, funcionalidade: 'dashboard' },
      { title: 'Relatórios Diários', url: '/rdo/relatorios', icon: FileText, funcionalidade: 'rdo' },
      { title: 'Obras', url: '/rdo/obras', icon: HardHat, funcionalidade: 'obras' },
      { title: 'Funcionários', url: '/rdo/funcionarios', icon: Users, funcionalidade: 'funcionarios' },
      { title: 'Equipamentos', url: '/rdo/equipamentos', icon: Settings, funcionalidade: 'equipamentos' },
    ],
  },
  {
    label: 'Compras',
    modulo: 'compras',
    items: [
      { title: 'Dashboard', url: '/compras', icon: LayoutDashboard, funcionalidade: 'dashboard' },
      { title: 'Solicitações', url: '/compras/solicitacoes', icon: ShoppingCart, funcionalidade: 'solicitacoes' },
      { title: 'Cotações', url: '/compras/cotacoes', icon: FileCheck, funcionalidade: 'cotacoes' },
      { title: 'Pedidos', url: '/compras/pedidos', icon: Package, funcionalidade: 'pedidos' },
      { title: 'Fornecedores', url: '/compras/fornecedores', icon: Truck, funcionalidade: 'fornecedores' },
      { title: 'Catálogo', url: '/compras/catalogo', icon: ClipboardList, funcionalidade: 'catalogo' },
    ],
  },
  {
    label: 'Administração',
    modulo: 'admin',
    items: [
      { title: 'Empresas', url: '/admin/empresas', icon: Building2, funcionalidade: 'empresas' },
      { title: 'Usuários', url: '/admin/usuarios', icon: Users, funcionalidade: 'usuarios' },
      { title: 'Perfis', url: '/admin/perfis', icon: Shield, funcionalidade: 'perfis' },
      { title: 'Configurações', url: '/admin/configuracoes', icon: Settings, funcionalidade: 'configuracoes' },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { isAdmin, canViewModule, canView } = usePermissions();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground leading-tight">Grupo Said</span>
              <span className="text-xs text-sidebar-foreground/60">Gestão Integrada</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuGroups.map((group) => {
          if (!isAdmin && !canViewModule(group.modulo)) return null;

          const visibleItems = group.items.filter(
            (item) => isAdmin || canView(group.modulo, item.funcionalidade)
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.modulo}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/financeiro' || item.url === '/rdo' || item.url === '/compras'}
                          className="hover:bg-sidebar-accent/50"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
