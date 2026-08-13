/**
 * Placas de publicidade em volta do campo — inventário de patrocínio do clube.
 * @startingPoint section="Game" subtitle="Placas horizontais e verticais" viewport="700x150"
 */
export interface AdBoardProps {
  items?: string[];
  /** Placas laterais, com texto na vertical. */
  vertical?: boolean;
  /** Altura (horizontal) ou largura base (vertical), em px. */
  thickness?: number;
}
export function AdBoard(props: AdBoardProps): JSX.Element;
