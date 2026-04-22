import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import { EmpresaProvider, useEmpresa } from '@/hooks/useEmpresa';
import { Skeleton } from '@/components/ui/skeleton';

function AppLayoutContent() {
  const { semEmpresaVinculada, isLoading } = useEmpresa();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (semEmpresaVinculada) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-foreground">Nenhuma empresa vinculada</h1>
          <p className="text-muted-foreground">
            Seu usuário ainda não está vinculado a nenhuma empresa. Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function AppLayout() {
  return (
    <EmpresaProvider>
      <AppLayoutContent />
    </EmpresaProvider>
  );
}
