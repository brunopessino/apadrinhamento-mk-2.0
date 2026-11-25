import { Link } from 'react-router-dom';
import { Star } from '@/components/decor/Decor';

export default function NotFound() {
  return (
    <div className="container-mk flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <Star className="h-10 w-10 text-gold" />
      <h1 className="mt-4 text-3xl font-semibold text-burgundy">Página não encontrada</h1>
      <p className="mt-2 text-muted">O endereço pode ter mudado. Que tal voltar para a campanha?</p>
      <Link to="/" className="btn-primary mt-6">Ir para a página inicial</Link>
    </div>
  );
}
