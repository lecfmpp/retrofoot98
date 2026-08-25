/**
 * Tabela de classificação com filete de zona à esquerda e a linha do seu time destacada.
 * @startingPoint section="Data" subtitle="Classificação com zonas e destaque" viewport="700x340"
 */
export interface StandingsRow {
  pos: string | number; name: string;
  j: string | number; v: string | number; e: string | number; d: string | number;
  goals: string; points: string | number;
  /** Cor do filete: --zone-promo | --zone-neutral | --zone-drop. */
  zone?: string;
  /** Destaca a linha do clube do jogador. */
  mine?: boolean;
}
export interface StandingsTableProps {
  rows?: StandingsRow[];
  /** Muda este valor ao trocar de competição para reexecutar o fade-up. */
  animateKey?: number | string;
}
export function StandingsTable(props: StandingsTableProps): JSX.Element;
