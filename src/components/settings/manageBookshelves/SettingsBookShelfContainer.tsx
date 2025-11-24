import { useSettingsActions } from "@/src/store/store-settings";
import { Bookshelf } from "@/src/utils/AudiobookShelf/bookshelfTypes";
import { useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
import React, { useState } from "react";
import { Switch, Text, View } from "react-native";
import Sortable from "react-native-sortables";

type Props = {
  bookshelf: Bookshelf & { displayed: boolean };
};
const SettingsBookShelfContainer = ({ bookshelf }: Props) => {
  const themeColors = useThemeColors();
  const actions = useSettingsActions();
  const [enabled, setEnabled] = useState(bookshelf.displayed);

  const handleSetDisplayed = (val: boolean) => {
    setEnabled(val);
    actions.updateBookshelfDisplay(bookshelf.id, val);
  };

  return (
    <View
      className={`${
        bookshelf.displayed ? "bg-red-300" : "white"
      } p-2 border-hairline flex-row justify-between items-center mx-2`}
    >
      <View className="flex-row">
        <Switch
          value={enabled}
          style={{ transform: [{ scale: 0.7 }] }}
          onValueChange={handleSetDisplayed}
          trackColor={{
            false: "#d1d1d6",
            true: "#34c759",
          }}
          ios_backgroundColor="#d1d1d6"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        />
        <Text className="font-semibold text-lg">{bookshelf.label}</Text>
      </View>
      {bookshelf.type === "custom" && (
        <Sortable.Touchable
          style={{ paddingHorizontal: 8 }}
          hitSlop={10}
          onTap={() => {
            actions.deleteBookshelf(bookshelf.id);
          }}
        >
          <SymbolView name="trash.fill" tintColor={themeColors.destructive} />
        </Sortable.Touchable>
      )}
    </View>
  );
};

export default SettingsBookShelfContainer;
