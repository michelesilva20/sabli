import { Link } from 'react-router';
import { Button } from '@/design-system/components/button';

export function NotFoundPage() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div className="grid gap-3">
        <h1 className="text-3xl font-extrabold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          Esse caminho não existe nesta versão do Sabli.
        </p>
        <Button asChild>
          <Link to="/inicio">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
