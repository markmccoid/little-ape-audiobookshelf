import { useAuth, useSafeAbsAPI } from "@/src/contexts/AuthContext";
import { LoginForm } from "@/src/screens/Settings/auth/LoginForm";
import { AudiobookshelfAuth } from "@/src/utils/AudiobookShelf/absAuthClass";
import { queryClient } from "@/src/utils/queryClient";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import ABSLibrarySelect from "./ABSLibrarySelect";

export default function ABSAuthMain() {
  const { isAuthenticated, authInfo, logout, initializeAfterLogin } = useAuth();
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Always call hooks at the top level, regardless of conditional rendering
  const absAPI = useSafeAbsAPI();
  console.log("ABSAuthMain.tsx", authInfo);
  const debugAbsAPI = async () => {
    if (!absAPI) {
      console.log("ABS API not available");
      return;
    }
    try {
      const libraries = await absAPI.getLibraries();
      // const me = await absAPI.getUserInfo();
      // console.log("ME", me);
      // console.log(
      //   "Library",
      //   libraries.map((el) => `${el.name}-${el.active}-${el.id}`)
      // );
      const activeLib = absAPI.getActiveLibraryId();
    } catch (error) {
      console.error("Error debugging ABS API:", error);
    }
  };

  const onSubmit = async (url: string, username: string, password: string) => {
    try {
      setIsLoggingIn(true);
      setError(undefined);
      const auth = await AudiobookshelfAuth.create(url);
      const info = await auth.login({ username, password });
      // console.log(info.user.librariesAccessible);
      console.log("Initializing after login...");
      // Initialize both auth and API after successful login
      await initializeAfterLogin(queryClient);

      console.log("Login successful, auth and API initialized");
    } catch (error) {
      console.error("Login failed:", error);
      setError(error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoggingIn(false);
    }
  };

  // useEffect(() => {
  //   console.log("Assumed Global Changed", isAuthed, AudiobookshelfAuth.isAssumedAuthedGlobal);
  //   setIsAuthed(AudiobookshelfAuth.isAssumedAuthedGlobal);
  // }, [AudiobookshelfAuth.isAssumedAuthedGlobal]);

  const handleLogout = async () => {
    await logout();
  };

  // Always render ABSLibrarySelect to prevent hook order changes
  // It handles its own conditional rendering internally
  const librarySelectComponent = <ABSLibrarySelect />;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {isAuthenticated ? (
        <View className="flex-1 mt-4 w-full px-5">
          <View className="flex-row items-center mb-2">
            <Text className="font-semibold text-lg">ABS URL: </Text>
            <Text className="border-hairline bg-gray-200 text-gray-600 p-2 flex-1 rounded-md text-lg">
              {authInfo.serverUrl || "Not available"}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Text className="font-semibold">Username: </Text>
            <Text className="border-hairline bg-gray-200 text-gray-600 rounded-md p-2 flex-1 ">
              {authInfo.username || "Not available"}
            </Text>
          </View>
          {/* Always render this component to maintain hook order */}
          {librarySelectComponent}
          {/* <Pressable onPress={debugAbsAPI} className="p-2 border rounded-lg bg-blue-300 my-2">
            <Text>Debug ABS API</Text>
          </Pressable> */}
          <Pressable onPress={handleLogout} className="p-2 border rounded-lg bg-yellow-300 my-4">
            <Text>Log Out</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <LoginForm onSubmit={onSubmit} isLoggingIn={isLoggingIn} />
          {error && (
            <View className="border bg-red-400 rounded-lg p-2 mx-4">
              <Text className="text-xl font-semibold">Error Logging In -- {error.message}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
