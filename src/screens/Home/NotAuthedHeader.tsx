import { AudiobookshelfAuth } from "@/src/utils/AudiobookShelf/absAuthClass";
import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const NotAuthedHeader = () => {
  const isAuthed = AudiobookshelfAuth.isAssumedAuthedGlobal;
  if (isAuthed) return null;

  return (
    <View className="bg-red-600 p-2 rounded-xl">
      <Link href="/settings">
        <Text className="color-white text-lg font-semibold">Not Authenticated. Please login</Text>
      </Link>
    </View>
  );
};

export default NotAuthedHeader;
