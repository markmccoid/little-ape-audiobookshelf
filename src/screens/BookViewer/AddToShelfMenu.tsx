import { useBooksActions, useBooksStore } from "@/src/store/store-books";
import { useSettingsStore } from "@/src/store/store-settings";
import { Button, ContextMenu, Host, Image } from "@expo/ui/swift-ui"; // or '@expo/ui' APIs per SDK
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";

import { useRouter } from "expo-router";
import React from "react";

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

  return (
    <Host
      style={{
        width: 44,
        height: 44,
        flexDirection: "row",
        alignItems: "center",
        transform: [{ translateY: -4 }],
      }}
    >
      <ContextMenu modifiers={[buttonStyle("automatic")]}>
        <ContextMenu.Items>
          {shelves.length !== 0 && (
            <Button onPress={() => router.push("/settings/managebookshelves")}>
              Add a Custom Shelf
            </Button>
          )}
          {shelves.map((shelf) => {
            const bookInShelf = loadedShelves[shelf.id].includes(libraryItemId);
            return (
              <Button
                systemImage={shelf.displayed ? "eye" : "eye.slash"}
                key={shelf.id}
                onPress={() =>
                  bookInShelf
                    ? bookActions.removeBookFromBookshelf(libraryItemId, shelf.id)
                    : bookActions.addBookToBookshelf(libraryItemId, shelf.id)
                }
              >
                {`${shelf.label} ${bookInShelf ? "🚫" : "✅"} `}
              </Button>
            );
          })}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <Image systemName="plus" />
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
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
