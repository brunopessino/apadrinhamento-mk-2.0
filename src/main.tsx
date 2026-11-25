import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { IS_EMBED } from './config/campaign';

// Na pré-visualização embutida, o visualizador bloqueia confirm() (sempre false);
// como só há dados fictícios, as confirmações são aceitas automaticamente ali.
if (IS_EMBED) window.confirm = () => true;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
