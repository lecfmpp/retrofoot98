/**
 * Popup de acontecimento do save: oferta de emprego, título conquistado, leilão encerrado, artilharia.
 * Itens de menu NÃO são diálogos — viram página.
 * @startingPoint section="Feedback" subtitle="Popup de acontecimento do jogo" viewport="700x400"
 */
export interface DialogProps {
  title: string;
  glyph?: string;
  /** Pílula amarela à direita do título — data, valor, prazo. */
  badge?: string;
  subtitle?: string;
  width?: number;
  /** club = cabeçalho azul do clube, para celebração; light = neutro. */
  tone?: 'light' | 'club';
  onClose?: () => void;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}
export function Dialog(props: DialogProps): JSX.Element;
