import { AudiobookshelfAuth } from "@/src/ABS/absAuthClass";
import { getAbsAuth, useAbsAPI } from "@/src/ABS/absInit";
import { LoginForm } from "@/src/components/auth/LoginForm";
import Player from "@/src/components/Player";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import ABSLibrarySelect from "./ABSLibrarySelect";

export default function Index() {
  const [isAuthed, setIsAuthed] = useState(AudiobookshelfAuth.isAssumedAuthedGlobal);
  const absAPI = useAbsAPI();
  const absAuth = getAbsAuth();
  const hitABS = async () => {
    const libraries = await absAPI.getLibraries();
    const me = await absAPI.getUserInfo();
    console.log("ME", me);
    console.log(
      "Library",
      libraries.map((el) => `${el.name}-${el.active}-${el.id}`)
    );
    const activeLib = absAPI.getActiveLibraryId();
    console.log("ActiveLib", activeLib);
  };

  const onSubmit = async (url: string, username: string, password: string) => {
    const auth = await AudiobookshelfAuth.create(url);
    const info = await auth.login({ username, password });
    console.log(info.user.librariesAccessible);
    setIsAuthed(AudiobookshelfAuth.isAssumedAuthedGlobal);
    const libraries = await absAPI.getLibraries();
    console.log("Library", libraries);
  };

  // useEffect(() => {
  //   console.log("Assumed Global Changed", isAuthed, AudiobookshelfAuth.isAssumedAuthedGlobal);
  //   setIsAuthed(AudiobookshelfAuth.isAssumedAuthedGlobal);
  // }, [AudiobookshelfAuth.isAssumedAuthedGlobal]);

  const logOut = async () => {
    const auth = await AudiobookshelfAuth.create();
    await auth.logout();
    setIsAuthed(AudiobookshelfAuth.isAssumedAuthedGlobal);
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {isAuthed && (
        <View className="flex-1 mt-4 w-full px-5">
          <View className="flex-row items-center mb-2">
            <Text className="font-semibold">ABS URL: </Text>
            <Text className="border-hairline bg-gray-200 text-gray-600 p-2 flex-1 rounded-md">
              {absAuth.absURL}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Text className="font-semibold">Username: </Text>
            <Text className="border-hairline bg-gray-200 text-gray-600 rounded-md p-2 flex-1 ">
              {absAuth.username}
            </Text>
          </View>
          <ABSLibrarySelect />
          <Pressable onPress={logOut} className="p-2 border rounded-lg bg-yellow-300 my-4">
            <Text>Log Out</Text>
          </Pressable>
          <Player />
          <View>
            <Pressable onPress={hitABS}>
              <Text>Hit ABS</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!isAuthed && <LoginForm onSubmit={onSubmit} />}
    </View>
  );
}
