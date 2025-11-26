import type { SFSymbol } from "expo-symbols";
import type { ReactNode } from "react";
import type { LayoutRectangle } from "react-native";

export interface MenuItemData {
  key: string;
  label: string;
  icon?: SFSymbol;
  iconColor?: string;
  textColor?: string;
  disabled?: boolean;
  onPress?: () => void;
}

export interface MenuContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  triggerLayout: LayoutRectangle | null;
  setTriggerLayout: (layout: LayoutRectangle) => void;
}

export interface AnimatedMenuProps {
  children: ReactNode;
  className?: string;
}

export interface MenuTriggerProps {
  children: ReactNode;
  className?: string;
}

export interface MenuContentProps {
  items: MenuItemData[];
  className?: string;
}

export interface MenuItemProps {
  item: MenuItemData;
  index: number;
  totalItems: number;
  onPress?: () => void;
}

export interface MenuSeparatorProps {
  className?: string;
}
