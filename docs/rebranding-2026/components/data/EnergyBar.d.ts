/**
 * Barra de energia do jogador, na escala vermelho→verde.
 * @startingPoint section="Data" subtitle="Escala de energia vermelho→verde" viewport="700x150"
 */
export interface EnergyBarProps {
  /** 0–100. Abaixo de 40 fica vermelha; acima de 80, verde. */
  value: number;
  width?: number | string;
  showValue?: boolean;
  /** Sobre o gramado: fundo escuro e sombra no texto. */
  onDark?: boolean;
  /** Rótulo curto antes da barra (posição do jogador). */
  prefix?: string;
}
export function EnergyBar(props: EnergyBarProps): JSX.Element;
export function energyColor(value: number): string;
