import { useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import React from "react";
import { View } from "react-native";
import PagerView from "react-native-pager-view";

type BookQuickButtonsProps = {
  pagerRef: React.RefObject<PagerView>;
};

const BookQuickButtons = ({ pagerRef }: BookQuickButtonsProps) => {
  const themeColors = useThemeColors();

  return (
    // <View
    //   className="mx-5 border-hairline mt-5 px-2 py-1 h-[50] bg-white flex-row justify-evenly items-center"
    //   style={{ borderRadius: 15 }}
    // >
    <View
      className="mx-5 border-hairline mt-5 px-2 py-1 h-[50] bg-['#ffffffbb'] flex-row justify-evenly items-center overflow-hidden"
      style={{ borderRadius: 15 }}
    >
      <PressableScale onPress={() => pagerRef.current?.setPage(0)}>
        <SymbolView name="house" tintColor={themeColors.accent} size={35} />
      </PressableScale>
      <PressableScale onPress={() => pagerRef.current?.setPage(1)}>
        <SymbolView
          name="list.bullet.rectangle.portrait.fill"
          tintColor={themeColors.accent}
          size={35}
        />
      </PressableScale>
      <PressableScale onPress={() => pagerRef.current?.setPage(2)}>
        <SymbolView name="hare.fill" tintColor={themeColors.accent} size={35} />
      </PressableScale>
      <PressableScale onPress={() => pagerRef.current?.setPage(3)}>
        <SymbolView name="bookmark.fill" tintColor={themeColors.accent} size={35} />
      </PressableScale>
      {/* <SymbolView name="house" tintColor={themeColors.accent} size={35} /> */}
    </View>
    // </View>
  );
};

export default BookQuickButtons;
