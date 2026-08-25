/**
 * Grade das formações do jogo com os atalhos F1–F6, mais Auto e 11+ Melhores.
 * @startingPoint section="Game" subtitle="Formações com atalhos F1–F6" viewport="700x200"
 */
export interface Formation { name: string; key: string; }
export interface FormationGridProps {
  formations?: Formation[];
  active?: string;
  columns?: number;
  onSelect?: (name: string) => void;
  /** Ação abaixo da grade — normalmente "🟩 Seleccionar descansados". */
  footer?: React.ReactNode;
}
export function FormationGrid(props: FormationGridProps): JSX.Element;
export const FORMATIONS: Formation[];
