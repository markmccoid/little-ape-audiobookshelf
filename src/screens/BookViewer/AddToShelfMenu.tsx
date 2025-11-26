import {
  AnimatedMenu,
  MenuContent,
  MenuItemData,
  MenuTrigger,
} from "@/src/components/AnimatedMenu";
import { useBooksActions, useBooksStore } from "@/src/store/store-books";
import { useSettingsStore } from "@/src/store/store-settings";
import { useThemeColors } from "@/src/utils/theme";

import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";
import { View } from "react-native";

type Props = {
  libraryItemId: string;
};

//!! addBooks overwrites.  Need to create new functions for single Add/Delete of books.
const AddToShelfMenu = ({ libraryItemId }: Props) => {
  const bookActions = useBooksActions();
  const loadedShelves = useBooksStore((state) => state.bookshelves);

  const shelves = useSettingsStore((state) => state.allBookshelves).filter(
    (el) => el.type === "custom"
  );
  const router = useRouter();
  const themeColors = useThemeColors();
  const shelfMenuItems: MenuItemData[] = shelves.map((shelf) => {
    const bookInShelf = loadedShelves?.[shelf.id]?.includes(libraryItemId);
    return {
      key: shelf.id,
      label: shelf.label,
      icon: bookInShelf ? ("checkmark.circle.fill" as const) : undefined,
      iconColor: bookInShelf ? themeColors.accent : undefined,
      textColor: bookInShelf ? themeColors.accent : undefined,
      onPress: () =>
        bookInShelf
          ? bookActions.removeBookFromBookshelf(libraryItemId, shelf.id)
          : bookActions.addBookToBookshelf(libraryItemId, shelf.id),
    };
  });
  const menuItems: MenuItemData[] = [
    {
      key: "manageshelves",
      label: "Manage Bookshelves",
      icon: "link",
      onPress: () => router.push("/settings/managebookshelves"),
    },
    {
      key: "separator",
      label: "",
    },
    ...shelfMenuItems,
  ];

  return (
    <View>
      <AnimatedMenu>
        <MenuTrigger>
          <View className="w-[44] h-[44] pb-2 justify-center items-center">
            <SymbolView name="plus" size={32} />
          </View>
        </MenuTrigger>

        <MenuContent items={menuItems} />
      </AnimatedMenu>
    </View>
  );
};

export default AddToShelfMenu;

{
  /* <ContextMenu.Trigger>
          <View className="w-[44] h-[44] pb-2 justify-center items-center">
            <SymbolView name="plus" size={32} />
          </View>
        </ContextMenu.Trigger> */
}
