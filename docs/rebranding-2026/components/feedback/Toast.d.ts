/**
 * Aviso passageiro do jogo. Um por vez, empilhado no rodapé central.
 * @startingPoint section="Feedback" subtitle="Avisos: sucesso, atenção, erro, processo" viewport="700x220"
 */
export interface ToastProps {
  /** info = neutro do clube; success ✓; warn ⚠; danger ✖; progress = "Conectando…". */
  tone?: 'info' | 'success' | 'warn' | 'danger' | 'progress';
  /** Sobrescreve o glifo padrão do tom (🔨 leilão, 💰 venda, 🎥 camarote). */
  glyph?: string;
  /** Ação opcional à direita, em amarelo — "Ver", "Desfazer". */
  action?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}
export function Toast(props: ToastProps): JSX.Element;
export function ToastStack(props: { children?: React.ReactNode }): JSX.Element;
