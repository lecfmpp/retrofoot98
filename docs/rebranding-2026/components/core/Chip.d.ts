/**
 * Chip: formação com atalho (hint), competição, ou status.
 * @startingPoint section="Core" subtitle="Chips de formação, competição e status" viewport="700x150"
 */
export interface ChipProps {
  label: string;
  /** Segunda linha em mono — o atalho de teclado (F1…F6). */
  hint?: string;
  active?: boolean;
  tone?: 'default' | 'info' | 'warn';
  onClick?: () => void;
}
export function Chip(props: ChipProps): JSX.Element;
