import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AudiobookshelfAuth } from "../ABS/absAuthClass";
import { useAbsAPI } from "../ABS/absInit";
import { LoginForm } from "../components/auth/LoginForm";
import Player from "../components/Player";

export default function Index() {
  const [isAuthed, setIsAuthed] = useState(AudiobookshelfAuth.isAssumedAuthedGlobal);
  const absAPI = useAbsAPI();
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
      <Text className="color-red-700">Edit app/index.tsx to edit this screen.</Text>
      {isAuthed && (
        <Pressable onPress={logOut} className="p-2 border rounded-lg bg-yellow-300">
          <Text>Log Out</Text>
        </Pressable>
      )}
      <LoginForm onSubmit={onSubmit} />
      <Player />
      <View>
        <Pressable onPress={hitABS}>
          <Text>Hit ABS</Text>
        </Pressable>
      </View>
    </View>
  );
}
