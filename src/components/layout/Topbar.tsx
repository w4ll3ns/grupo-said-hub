import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, LogOut, Moon, Sun, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function Topbar() {
  const { user, signOut } = useAuth();
  const { empresas, empresaAtiva, setEmpresaAtiva } = useEmpresa();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDark(!dark);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = user?.user_metadata?.nome
    ? user.user_metadata.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        {empresas.length > 1 && (
          <Select
            value={empresaAtiva?.id}
            onValueChange={(id) => {
              const emp = empresas.find((e) => e.id === id);
              if (emp) setEmpresaAtiva(emp);
            }}
          >
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="Selecionar empresa" />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {empresas.length === 1 && empresaAtiva && (
          <span className="text-sm font-medium text-foreground">{empresaAtiva.nome}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm hidden sm:inline">{user?.user_metadata?.nome || user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/perfil')}>
              <User className="mr-2 h-4 w-4" /> Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
