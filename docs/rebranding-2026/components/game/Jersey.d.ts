/**
 * Camisa do clube desenhada em CSS: corpo na primária, gola e mangas na secundária, número nas costas.
 * @startingPoint section="Game" subtitle="Camisa, goleiro, colete e capitão" viewport="700x150"
 */
export interface JerseyProps {
  number: number | string;
  size?: number;
  /** Inverte as cores — o goleiro veste o oposto do time. */
  goalkeeper?: boolean;
  /** Colete de reserva por cima da camisa. */
  bib?: boolean;
  captain?: boolean;
}
export function Jersey(props: JerseyProps): JSX.Element;
