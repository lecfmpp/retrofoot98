/**
 * Card do próximo adversário, em azul do clube, com o confronto e o botão Jogar.
 * @startingPoint section="Game" subtitle="Próximo adversário com o CTA Jogar" viewport="700x300"
 */
export interface OpponentRow { name: string; j: string | number; v: string | number; d: string | number; goals: string; points: string | number; dim?: boolean; }
export interface OpponentCardProps {
  opponent?: string; initials?: string; crest?: string;
  meta?: string; date?: string;
  rows?: OpponentRow[];
  /** Normalmente <Button variant="primary" pulse full>⚽ Jogar</Button>. */
  action?: React.ReactNode;
  height?: number;
}
export function OpponentCard(props: OpponentCardProps): JSX.Element;
