import { ABSGetLibraryItem } from "@/src/utils/AudiobookShelf/absAPIClass";
import { formatSeconds } from "@/src/utils/formatUtils";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { AudioLines, Calendar, Clock5, UserPen } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const placeholder = require("@/assets/images/NoImageFoundSmall.png");

const LibraryRenderItem = ({ item }: { item: ABSGetLibraryItem }) => {
  const router = useRouter();
  return (
    <Pressable
      // className="flex-row gap-2 py-1 border-b-hairline"
      className="h-[110]"
      onPress={() =>
        router.push({
          pathname: `/(tabs)/library/[bookid]`,
          params: { bookid: item.id, cover: item.coverFull, title: item.title },
        })
      }
    >
      <View className="flex-row gap-2 py-1 border-b-hairline border-black dark:border-gray-300 px-2">
        <Image
          source={item.cover}
          contentFit="cover"
          style={{
            width: 100,
            height: 100,
            borderRadius: 10,
            borderWidth: StyleSheet.hairlineWidth,
          }}
          placeholder={placeholder}
          placeholderContentFit="contain"
          recyclingKey={item.id}
        />
        <View className="flex-col flex-1 justify-between py-1 gap">
          <View className="gap-y-1">
            <View className="flex-row">
              <Text
                className="font-semibold text-base flex-1 dark:text-white"
                lineBreakMode="tail"
                numberOfLines={1}
              >
                {item?.title}
              </Text>
            </View>
            <View className="flex-row gap-1 items-center ">
              <UserPen size={16} color="gray" />
              <Text
                className="text-gray-600 text-sm flex-1 dark:text-gray-300"
                lineBreakMode="tail"
                numberOfLines={1}
              >
                {item?.author}
              </Text>
            </View>
            <View className="flex-row gap-1 items-center ">
              <AudioLines
                size={16}
                color="gray"
                style={{ display: item?.narratedBy ? "flex" : "none" }}
              />
              <Text
                className="text-gray-600 text-sm flex-1 dark:text-gray-300"
                lineBreakMode="tail"
                numberOfLines={1}
              >
                {item?.narratedBy}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row gap-1 items-center">
              <Clock5 size={16} color="green" />
              <Text className="text-green-800 dark:text-green-400">
                {formatSeconds(item?.duration)}
              </Text>
            </View>
            <View className="flex-row gap-1 items-center">
              <Calendar
                size={16}
                color="green"
                style={{ display: item?.publishedYear ? "flex" : "none" }}
              />
              <Text className="text-green-800">{item?.publishedYear}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default LibraryRenderItem;
