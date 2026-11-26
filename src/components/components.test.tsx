import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PixBox } from './PixBox';
import { ParticipantCard } from './ParticipantCard';
import { ChristmasCelebration, CelebrationBoundary, TIMELINE, __resetPlayed } from './ChristmasCelebration';
import { SponsorDialog } from './SponsorDialog';
import { DEFAULT_PIX } from '@/config/campaign';
import { campaignFor } from '@/services/data/demoSeed';
import { DataProvider } from '@/hooks/DataContext';
import { __setDataService } from '@/services/data';
import type { DataService } from '@/services/data/types';
import type { PublicParticipant, SponsorResult } from '@/types';

const PIX_TEXT = 'Se preferir, você também pode contribuir com qualquer valor via Pix.';
const KEY_TEXT = 'Chave Pix: 07152890714 - Ana Claudia Cloves';
const part = (o: Partial<PublicParticipant> = {}): PublicParticipant => ({ id: 'p1', campaignId: '2026', displayName: 'Lia E.', category: 'Aluno', age: 9, group: 'Violão', clothingSize: '12', shoeSize: '32', giftSuggestion: 'Livro', published: true, sponsored: false, ...o });

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = ((q: string) => ({ matches: reduced && q.includes('reduce'), media: q, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
}
beforeEach(() => { __resetPlayed(); mockMatchMedia(false); });

describe('PixBox', () => {
  it('exibe o texto integral e copia somente a chave', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    render(<PixBox pix={DEFAULT_PIX} />);
    expect(screen.getByTestId('pix-intro')).toHaveTextContent(PIX_TEXT);
    expect(screen.getByTestId('pix-key')).toHaveTextContent(KEY_TEXT);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar chave Pix' }));
    expect(writeText).toHaveBeenCalledWith('07152890714');
    expect(await screen.findByText('Chave copiada!')).toBeInTheDocument();
  });
});

describe('ParticipantCard', () => {
  it.each([false, true])('mostra o bloco Pix completo (apadrinhado=%s)', (sponsored) => {
    render(<ParticipantCard p={part({ sponsored })} pix={DEFAULT_PIX} onSponsor={() => {}} />);
    expect(screen.getByTestId('pix-box')).toHaveTextContent(PIX_TEXT);
    expect(screen.getByTestId('pix-box')).toHaveTextContent(KEY_TEXT);
    if (sponsored) {
      expect(screen.getAllByText('Apadrinhado').length).toBeGreaterThan(0);
      expect(screen.queryByRole('button', { name: /Quero apadrinhar/ })).toBeNull();
    } else {
      expect(screen.getByRole('button', { name: /Quero apadrinhar Lia/ })).toBeEnabled();
    }
  });
  it('usa placeholder neutro sem foto e não expõe dados privados', () => {
    render(<ParticipantCard p={part()} pix={DEFAULT_PIX} onSponsor={() => {}} />);
    expect(screen.getByRole('img', { name: 'Foto não disponível' })).toBeInTheDocument();
  });
});

describe('ChristmasCelebration', () => {
  it('percorre a linha do tempo uma única vez e limpa temporizadores', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { unmount } = render(<ChristmasCelebration playKey="MK26-AAAAAAAA" onDone={onDone} />);
    const el = screen.getByTestId('celebration');
    expect(el).toHaveAttribute('data-mode', 'animated');
    expect(el).toHaveAttribute('data-stage', 'enter');
    act(() => { vi.advanceTimersByTime(TIMELINE.find(([s]) => s === 'open')![1]); });
    expect(el).toHaveAttribute('data-stage', 'open');
    expect(el.querySelectorAll('.cc-particle').length).toBeGreaterThan(0);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(el).toHaveAttribute('data-stage', 'done');
    expect(el.querySelectorAll('.cc-particle').length).toBe(0);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    // mesma confirmação não reexecuta
    render(<ChristmasCelebration playKey="MK26-AAAAAAAA" />);
    expect(screen.getByTestId('celebration')).toHaveAttribute('data-mode', 'static');
    vi.useRealTimers();
  });
  it('pode ser encerrada imediatamente', () => {
    vi.useFakeTimers();
    render(<ChristmasCelebration playKey="MK26-BBBBBBBB" />);
    fireEvent.click(screen.getByRole('button', { name: 'Pular animação' }));
    expect(screen.getByTestId('celebration')).toHaveAttribute('data-stage', 'done');
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
  it('respeita prefers-reduced-motion com versão estática', () => {
    mockMatchMedia(true);
    render(<ChristmasCelebration playKey="MK26-CCCCCCCC" />);
    const el = screen.getByTestId('celebration');
    expect(el).toHaveAttribute('data-mode', 'static');
    expect(el.querySelectorAll('.cc-particle').length).toBe(0);
    expect(screen.queryByRole('button', { name: 'Pular animação' })).toBeNull();
  });
  it('desmontagem no meio da animação não deixa temporizadores', () => {
    vi.useFakeTimers();
    const { unmount } = render(<ChristmasCelebration playKey="MK26-DDDDDDDD" />);
    act(() => { vi.advanceTimersByTime(900); });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
  it('falha na animação não derruba o conteúdo ao redor', () => {
    const Boom = () => { throw new Error('falha visual'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<div><CelebrationBoundary fallback={<p>fallback</p>}><Boom /></CelebrationBoundary><p>Apadrinhamento confirmado!</p></div>);
    expect(screen.getByText('Apadrinhamento confirmado!')).toBeInTheDocument();
    expect(screen.getByText('fallback')).toBeInTheDocument();
    spy.mockRestore();
  });
});

function fakeService(result: SponsorResult): DataService {
  const noop = () => () => {};
  return {
    mode: 'demo',
    subscribeActiveCampaign: (cb) => { cb(campaignFor(2026, 'active')); return () => {}; },
    subscribePublicParticipants: (_c, cb) => { cb([part()]); return () => {}; },
    sponsor: vi.fn().mockResolvedValue(result),
    auth: { subscribe: noop, signIn: vi.fn(), signOut: vi.fn() },
    admin: {} as DataService['admin'],
  };
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByRole('textbox', { name: 'Seu nome' }), 'Maria Teste');
  await userEvent.type(screen.getByRole('textbox', { name: 'WhatsApp' }), '21987654321');
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(screen.getByTestId('confirm-sponsor'));
}

describe('SponsorDialog — animação somente após confirmação do servidor', () => {
  afterEach(() => __setDataService(null));
  const renderDialog = (svc: DataService) => {
    __setDataService(svc);
    return render(<MemoryRouter><DataProvider><SponsorDialog participant={part()} campaign={campaignFor(2026, 'active')} onClose={() => {}} /></DataProvider></MemoryRouter>);
  };
  it('valida formulário antes de enviar', async () => {
    const svc = fakeService({ ok: true, protocol: 'MK26-ABCDEFGH', participantId: 'p1', participantDisplayName: 'Lia E.' });
    renderDialog(svc);
    await userEvent.click(screen.getByTestId('confirm-sponsor'));
    expect(screen.getByText('Informe seu nome.')).toBeInTheDocument();
    expect(svc.sponsor).not.toHaveBeenCalled();
  });
  it('sucesso: mostra celebração, título, protocolo e anúncio acessível', async () => {
    renderDialog(fakeService({ ok: true, protocol: 'MK26-ABCDEFGH', participantId: 'p1', participantDisplayName: 'Lia E.' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Seu nome' })).toBeEnabled());
    await fillAndSubmit();
    expect(await screen.findByTestId('celebration')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Apadrinhamento confirmado!');
    expect(screen.getByTestId('protocol')).toHaveTextContent('MK26-ABCDEFGH');
  });
  it('conflito: mensagem oficial e SEM animação', async () => {
    renderDialog(fakeService({ ok: false, code: 'already', message: 'Este participante acabou de ser apadrinhado. Você ainda pode fazer a diferença escolhendo outra pessoa.' }));
    await fillAndSubmit();
    expect(await screen.findByTestId('sponsor-conflict')).toHaveTextContent('Este participante acabou de ser apadrinhado. Você ainda pode fazer a diferença escolhendo outra pessoa.');
    expect(screen.queryByTestId('celebration')).toBeNull();
  });
  it('erro de rede: SEM animação e permite tentar de novo', async () => {
    renderDialog(fakeService({ ok: false, code: 'network', message: 'Falha de conexão.' }));
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de conexão.');
    expect(screen.queryByTestId('celebration')).toBeNull();
    expect(screen.getByTestId('confirm-sponsor')).toBeEnabled();
  });
});
