import { lazy, Suspense, useEffect, useState } from 'react';
import { SiteIntro, shouldShowIntro } from '@/components/SiteIntro';
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { IS_EMBED } from '@/config/campaign';
import { DataProvider } from '@/hooks/DataContext';
import { PublicLayout } from '@/components/Layout';
import Home from '@/pages/Home';

const Privacy = lazy(() => import('@/pages/Privacy'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const AdminApp = lazy(() => import('@/pages/admin/AdminApp'));

function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // Área administrativa nunca deve ser indexada (complementa robots.txt e cabeçalho X-Robots-Tag).
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    meta.content = pathname.startsWith('/admin') ? 'noindex, nofollow' : 'index, follow';
    if (IS_EMBED) { window.scrollTo(0, 0); return; }
    if (!hash) window.scrollTo(0, 0);
    else requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
  }, [pathname, hash]);
  return null;
}

/** Abertura natalina exibida a cada carregamento completo do site (não na navegação interna). */
function IntroGate() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(() => shouldShowIntro(pathname));
  return show ? <SiteIntro onDone={() => setShow(false)} /> : null;
}

const Loading = () => <div className="grid min-h-[40vh] place-items-center text-muted" role="status">Carregando…</div>;

const Router = IS_EMBED ? MemoryRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <DataProvider>
        <RouteEffects />
        <IntroGate />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/privacidade" element={<PublicLayout><Privacy /></PublicLayout>} />
            <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
          </Routes>
        </Suspense>
      </DataProvider>
    </Router>
  );
}
