/**
 * Barra de índice do clube: moral do plantel, segurança no cargo.
 * @startingPoint section="Data" subtitle="Moral e segurança no cargo" viewport="700x150"
 */
export interface StatBarProps {
  label?: string;
  value: number;
  max?: number;
  /** Texto pequeno à direita do número (sequência, leitura da direção). */
  note?: string;
  color?: string;
  height?: string;
}
export function StatBar(props: StatBarProps): JSX.Element;
