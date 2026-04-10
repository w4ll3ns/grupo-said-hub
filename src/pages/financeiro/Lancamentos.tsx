import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LancamentosPage from './LancamentosPage';

export default function Lancamentos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>
        <p className="text-muted-foreground">Visão unificada de todos os lançamentos financeiros.</p>
      </div>
      <Tabs defaultValue="pagar">
        <TabsList>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
        </TabsList>
        <TabsContent value="pagar">
          <LancamentosPage tipo="pagar" title="" subtitle="" />
        </TabsContent>
        <TabsContent value="receber">
          <LancamentosPage tipo="receber" title="" subtitle="" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
