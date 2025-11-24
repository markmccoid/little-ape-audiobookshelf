import { useSettingsActions } from "@/src/store/store-settings";
import { cssInterop } from "nativewind";
import { PressableScale } from "pressto";
import React from "react";
import { Alert, Text, View } from "react-native";

cssInterop(PressableScale, { className: "style" });
const AddNewBookshelf = () => {
  const actions = useSettingsActions();

  const handleNewBSPrompt = () => {
    Alert.prompt(
      "Enter New Bookshelf Label",
      "If it is not unique, it won't be added",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel",
        },
        {
          text: "OK",
          onPress: (name: string | undefined) => {
            console.log("NAME", name);
            if (name) {
              try {
                actions.addNewBookshelf(name);
              } catch (e: any) {
                // Checking for custom error being thrown
                if (e?.message?.includes("duplicate")) {
                  Alert.alert("Duplicate Bookshelf", "Bookshelf Already Exists, nothing added");
                }
              }
            }
          },
        },
      ],
      "plain-text",
      "",
      "default"
    );
  };

  return (
    <View className="flex-row justify-between items-center mx-3 my-2">
      <Text className="font-semibold text-lg">Manage Bookshelves</Text>
      <PressableScale
        className="bg-blue-400 p-2 rounded-lg border-hairline"
        onPress={handleNewBSPrompt}
      >
        <Text>Add New</Text>
      </PressableScale>
    </View>
  );
};

export default AddNewBookshelf;
