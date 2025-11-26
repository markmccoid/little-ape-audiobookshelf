import { createContext, useContext } from "react";
import type { MenuContextType } from "./types";

export const MenuContext = createContext<MenuContextType | null>(null);

export const useMenu = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error("useMenu must be used within an AnimatedMenu");
  }
  return context;
};
