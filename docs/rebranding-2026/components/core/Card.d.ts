/**
 * Superfície base: branca com hairline e raio 18, ou azul do clube.
 * @startingPoint section="Core" subtitle="Card claro, do clube e afundado" viewport="700x180"
 */
export interface CardProps {
  tone?: 'light' | 'club' | 'quiet';
  pad?: string;
  /** flex:1 — use para o card que fecha a coluna, igualando as bases. */
  grow?: boolean;
  height?: number | string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function Card(props: CardProps): JSX.Element;
