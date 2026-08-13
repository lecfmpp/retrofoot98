/**
 * Barra de navegação única, no topo. O jogo não tem segunda barra lateral.
 * @startingPoint section="Core" subtitle="Menu principal com ícones e contador" viewport="1240x70"
 */
export interface MenuBarItem { icon?: string; label: string; badge?: string | number; }
export interface MenuBarProps {
  /** Item, ou a string '|' para um separador. */
  items?: (MenuBarItem | string)[];
  activeIndex?: number;
  onSelect?: (index: number) => void;
  trailing?: React.ReactNode;
}
export function MenuBar(props: MenuBarProps): JSX.Element;
