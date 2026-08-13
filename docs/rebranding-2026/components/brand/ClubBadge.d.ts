/**
 * Escudo do clube com fallback de iniciais nas cores do time.
 * @startingPoint section="Brand" subtitle="Escudo com fallback de iniciais" viewport="700x150"
 */
export interface ClubBadgeProps {
  /** Iniciais mostradas quando não há escudo (ou ele falha). */
  initials?: string;
  /** URL do escudo. */
  crest?: string;
  /** Lado do quadrado, em px. */
  size?: number;
  /** Raio do canto, em px. */
  radius?: number;
  background?: string;
  color?: string;
  /** Anel na cor secundária, usado no cabeçalho. */
  ring?: boolean;
}
export function ClubBadge(props: ClubBadgeProps): JSX.Element;
