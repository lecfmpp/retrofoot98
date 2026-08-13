/**
 * Faixa do clube no topo de toda tela logada: escudo, time, treinador, forma, caixa e contagem.
 * @startingPoint section="Brand" subtitle="Faixa do clube no topo da tela" viewport="1240x120"
 */
export interface ClubHeaderProps {
  club?: string;
  /** Nome do treinador — único uso de serifa na tela. */
  manager?: string;
  meta?: string;
  crest?: string;
  initials?: string;
  /** Últimos cinco resultados, 'V' | 'E' | 'D'. */
  form?: string[];
  cash?: string;
  payroll?: string;
  countdown?: string;
  /** Slot à direita, normalmente <Button variant="secondary">💾 Gravar</Button>. */
  action?: React.ReactNode;
}
export function ClubHeader(props: ClubHeaderProps): JSX.Element;
