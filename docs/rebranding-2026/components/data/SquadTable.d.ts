/**
 * Lista do elenco: POS, NOME, ID, FRC, NOTA, ENER, SAL., VALOR.
 * @startingPoint section="Data" subtitle="Elenco completo com todas as colunas" viewport="700x400"
 */
export interface SquadPlayer {
  /** 'T' titular, 'R' reserva, 'G' fora dos planos. */
  status: 'T' | 'R' | 'G';
  pos: string; name: string; age: number; force: number;
  /** Nota do último jogo, vazio quando não jogou. */
  rating?: string;
  energy: number; wage: string; value: string;
}
export interface SquadTableProps {
  players?: SquadPlayer[];
  maxHeight?: number;
  onSelect?: (player: SquadPlayer) => void;
}
export function SquadTable(props: SquadTableProps): JSX.Element;
