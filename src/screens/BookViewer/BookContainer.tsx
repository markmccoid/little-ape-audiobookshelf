import BookControlsVertical from "@/src/components/bookComponents/BookControlsVertical";
import BookCornerDetails from "@/src/components/bookComponents/BookCornerDetails";
import BookDetails from "@/src/components/bookComponents/BookDetails";
import BookSlider from "@/src/components/bookComponents/BookSlider";
import RateSetter from "@/src/components/bookComponents/RateSetter";
import RateViewer from "@/src/components/bookComponents/RateViewer";
import { useBookData, useSmartPosition } from "@/src/hooks/trackPlayerHooks";
import { BlurView } from "expo-blur";
import { Image, ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useReducer } from "react";
import { ScrollView, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type BookContainerRoute = {
  libraryItemId: string;
  cover: string;
  title: string;
};

const BookContainer = () => {
  const { libraryItemId, cover, title } = useLocalSearchParams<BookContainerRoute>();
  const [viewFullDesc, toggleViewFullDesc] = useReducer((s) => !s, false);
  const bottomHeight = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { book, isLoading } = useBookData(libraryItemId);
  //!!
  useSmartPosition(libraryItemId);
  // console.log("BOOK DATA", isBookActive, book?.title, book?.chapters, book?.authors);
  // const { data, isPending } = useGetItemDetails(libraryItemId);
  // console.log("GET DATA", data?.media?.metadata.authorName);
  // console.log("BOOK ACTIVe", isBookActive, isLoaded);
  // const { position, isLoading, error } = useSmartPosition(bookid);

  return (
    // Enclosing View for Image Background and BlurView
    <View className="flex-1 pt-[100] ">
      {cover && (
        <ImageBackground
          source={{ uri: cover }}
          style={StyleSheet.absoluteFillObject}
          // style={{
          //   position: "absolute",
          //   top: 0,
          //   left: 0,
          //   right: 0,
          //   height: "70%", // top half only
          // }}
          contentFit="cover"
        >
          {/* Smooth gradient fade from image to background */}
          {/* <LinearGradient
            colors={["transparent", colorScheme === "dark" ? "#000" : "#fff"]}
            locations={[0.6, 1]} // adjust fade curve
            style={{
              ...StyleSheet.absoluteFillObject,
            }}
          /> */}
          <LinearGradient
            colors={[
              "transparent", // 0%–40% image shows
              colorScheme === "dark" ? "#000" : "#fff", // 40%–80% fade to white
              "transparent", // 80%–100% fade back to image
            ]}
            locations={[0, 0.55, 1]}
            style={{ ...StyleSheet.absoluteFillObject }}
          />
        </ImageBackground>
      )}
      <Stack.Screen options={{ title: title }} />
      {/* Native iOS Blur Effect */}
      <BlurView
        intensity={90}
        tint={colorScheme === "dark" ? "dark" : "light"}
        // tint="systemMaterialDark"
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        className="flex-1"
        contentInset={{ bottom: bottomHeight.bottom + 49 }}
        // contentOffset={{ x: 0, y: -headerHeight }}
      >
        <View className="flex-row mx-2 justify-between items-center pt-10 ">
          <View className="absolute z-10 left-[-20]">
            <RateSetter />
          </View>
          <Image
            source={book?.coverURI || cover}
            style={{
              width: 250,
              height: 250,
              borderRadius: 15,
              overflow: "hidden",
              borderWidth: StyleSheet.hairlineWidth,
            }}
            transition={200}
          />
          {/* Book Controls */}
          <View className="flex-1 flex-col h-[250] justify-between gap-2">
            <View className="flex-1 justify-end ml-2 gap-2">
              <BookCornerDetails />

              <RateViewer />
            </View>
            <BookControlsVertical libraryItemId={libraryItemId} />
          </View>
        </View>

        {/* BOOK SLIDER */}
        <View className="flex-1 mb-2">
          <BookSlider libraryItemId={libraryItemId} />
        </View>

        {/* BOOK DETAILS - Description, Genres, tags */}
        <BookDetails />

        {/* {data &&
          data.media.chapters.map((el) => {
            return (
              <View key={el.id} className="flex-row gap-2">
                <Text className="text-foreground">{el.title}</Text>
                <Text className="text-foreground">
                  {formatSeconds(el.end - el.start, "compact")}
                </Text>
                <Text className="text-foreground">{el.end}</Text>
              </View>
            );
          })} */}
      </ScrollView>
    </View>
  );
};

export default BookContainer;
