/**
 * Botão do sistema. A ação principal é sempre amarela (secundária do clube).
 * @startingPoint section="Core" subtitle="Variantes de botão" viewport="700x150"
 */
export interface ButtonProps {
  /** primary = CTA amarelo; secondary = branco com borda; dark = azul do clube; pill / quiet = ações menores. */
  variant?: 'primary' | 'secondary' | 'dark' | 'pill' | 'quiet';
  /** Pulso lento, só no Jogar. Para no hover. */
  pulse?: boolean;
  full?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): JSX.Element;
