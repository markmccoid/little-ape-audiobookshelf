import LibraryContainer from "@/src/screens/Library/LibraryContainer";
import { useFiltersStore } from "@/src/store/store-filters";
import { useNavigation } from "expo-router";
import React from "react";
import { View } from "react-native";

const Books = () => {
  const filterSheetShown = useFiltersStore((state) => state.filterSheetShown);
  const detentIndex = useFiltersStore((state) => state.detentIndex);

  const navigation = useNavigation();
  console.log("filterSheetShown", filterSheetShown, detentIndex);
  // useLayoutEffect(() => {
  //   navigation.setOptions({
  //     headerRight: () => {
  //       if (filterSheetShown) return null;
  //       return (
  //         <PressableScale onPress={() => TrueSheet.present("filter-sheet")}>
  //           <HeaderButton>
  //             <SymbolView name="brain.fill" size={20} />
  //           </HeaderButton>
  //         </PressableScale>
  //       );
  //     },
  //     headerLeft: () => {
  //       return (
  //         <Link href={{ pathname: "/(tabs)/(home)" }} asChild>
  //           <HeaderButton>
  //             <SymbolView name="house.fill" size={25} />
  //           </HeaderButton>
  //         </Link>
  //       );
  //     },
  //   });
  // }, [filterSheetShown]);
  return (
    <View className="flex-1">
      <LibraryContainer />
    </View>
  );
};

export default Books;
