/**
 * Banco de reservas agrupado por posição, sem rolagem, ao lado do campo.
 * @startingPoint section="Game" subtitle="Banco agrupado por posição" viewport="700x420"
 */
export interface BenchPlayer { number: number | string; name: string; force: number; energy: number; }
export interface BenchGroup { label: string; players: BenchPlayer[]; }
export interface BenchListProps {
  groups?: BenchGroup[];
  width?: number;
  total?: number;
}
export function BenchList(props: BenchListProps): JSX.Element;
