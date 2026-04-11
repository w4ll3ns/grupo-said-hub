import { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  HardHat,
  ShoppingCart,
  Settings,
  LogIn,
  Search,
  BookOpen,
  Lightbulb,
} from 'lucide-react';
import { tutoriaisData } from '@/data/tutoriais';

const iconMap: Record<string, React.ElementType> = {
  DollarSign,
  HardHat,
  ShoppingCart,
  Settings,
  LogIn,
};

export default function Tutoriais() {
  const [busca, setBusca] = useState('');

  const filteredModulos = useMemo(() => {
    if (!busca.trim()) return tutoriaisData;
    const term = busca.toLowerCase();
    return tutoriaisData
      .map((modulo) => ({
        ...modulo,
        tutoriais: modulo.tutoriais.filter(
          (t) =>
            t.titulo.toLowerCase().includes(term) ||
            t.descricao.toLowerCase().includes(term) ||
            t.passos.some((p) => p.toLowerCase().includes(term))
        ),
      }))
      .filter((m) => m.tutoriais.length > 0);
  }, [busca]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tutoriais</h1>
          <p className="text-muted-foreground">
            Guia completo de todas as funcionalidades do sistema
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar tutorial..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredModulos.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">
          Nenhum tutorial encontrado para "{busca}".
        </p>
      )}

      <Accordion type="multiple" className="space-y-2" defaultValue={tutoriaisData.map((m) => m.modulo)}>
        {filteredModulos.map((modulo) => {
          const Icon = iconMap[modulo.icon] || BookOpen;
          return (
            <AccordionItem key={modulo.modulo} value={modulo.modulo} className="border rounded-lg px-2">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{modulo.label}</span>
                  <Badge variant="secondary">{modulo.tutoriais.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  {modulo.tutoriais.map((tutorial) => (
                    <Card key={tutorial.id} className="border-muted">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{tutorial.titulo}</CardTitle>
                        <CardDescription>{tutorial.descricao}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-2">Passo a passo:</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            {tutorial.passos.map((passo, i) => (
                              <li key={i}>{passo}</li>
                            ))}
                          </ol>
                        </div>
                        {tutorial.dicas && tutorial.dicas.length > 0 && (
                          <div className="bg-muted/50 rounded-md p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Lightbulb className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-medium">Dicas</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                              {tutorial.dicas.map((dica, i) => (
                                <li key={i}>{dica}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
