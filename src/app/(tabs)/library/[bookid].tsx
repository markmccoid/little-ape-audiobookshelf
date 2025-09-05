import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Stack, useGlobalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";

const BookIdRoute = () => {
  const headerHeight = useHeaderHeight();
  const { bookid, cover, title } = useGlobalSearchParams<{
    bookid: string;
    cover: string;
    title: string;
  }>();

  return (
    <ScrollView
      className="flex-1"
      contentInset={{ top: headerHeight }}
      contentOffset={{ x: 0, y: -headerHeight }}
    >
      <Stack.Screen
        options={{
          headerTitle: title,
        }}
      />
      <View className="flex-row justify-center border">
        <Image source={cover} style={{ width: 200, height: 200, borderRadius: 15 }} />
      </View>

      <Text>BookIdRoute -- {bookid}</Text>
    </ScrollView>
  );
};

export default BookIdRoute;
