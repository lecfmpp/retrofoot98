/**
 * Campo com faixas de grama, marcações completas e o onze escalado.
 * @startingPoint section="Game" subtitle="Campo com o onze escalado" viewport="700x560"
 */
export interface PitchPlayer { number: number | string; name: string; pos: string; energy: number; captain?: boolean; }
export interface PitchProps {
  /** Linhas de cima para baixo — ataque primeiro, goleiro por último. */
  lines?: PitchPlayer[][];
  /** URL do escudo, mostrado como marca-d'água a 10%. */
  watermark?: string;
  minHeight?: number;
}
export function Pitch(props: PitchProps): JSX.Element;
