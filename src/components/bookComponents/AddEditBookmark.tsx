import { useBooksActions, useBooksStore } from "@/src/store/store-books";
import { formatSeconds } from "@/src/utils/formatUtils";
import { useUIActions, useUIStore } from "@store/store-ui";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const AddEditBookmark = () => {
  const visible = useUIStore((state) => state.bookmarkModalVisible);
  const { libraryItemId, position } = useUIStore((state) => state.bookmarkModalData);
  const uiActions = useUIActions();
  const booksActions = useBooksActions();
  const bookmarks = useBooksStore(
    (state) => libraryItemId && state.bookInfo[libraryItemId]?.bookmarks,
  );
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const bgColor = "#FFFFFF";
  const bgColorType = "light";
  let foregroundColor = "#000000";
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      if (bookmarks) {
        const bookmark = bookmarks.find((el) => el.time === position);
        setName(bookmark?.title || "");
        setNotes(bookmark?.notes || "");
      } else {
        setName("");
        setNotes("");
      }
      inputRef.current?.focus();
    }
  }, [visible, libraryItemId]);

  const handleSave = () => {
    booksActions.addBookmark(libraryItemId, { time: position, title: name, notes });
    uiActions.closeBookmarkModal();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={uiActions.closeBookmarkModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center items-center bg-black/50"
      >
        <View
          className="w-[90%]  rounded-xl p-5 shadow-lg"
          style={{
            backgroundColor: bgColor,
          }}
        >
          <Text
            className="text-xl font-bold mb-4"
            style={{
              color: foregroundColor,
            }}
          >
            Save Bookmark at {formatSeconds(position)}
          </Text>

          <View className="mb-4">
            <Text
              className="text-sm font-semibold mb-1 text-gray-700"
              style={{
                color: foregroundColor,
              }}
            >
              Bookmark Name
            </Text>
            <TextInput
              ref={inputRef}
              className="border border-gray-300 rounded p-2 bg-white"
              style={{ fontSize: 16 }}
              value={name}
              onChangeText={setName}
              placeholder="Enter bookmark name"
              numberOfLines={1}
            />
          </View>

          <View className="mb-6">
            <Text
              className="text-sm font-semibold mb-1 text-gray-700"
              style={{
                color: foregroundColor,
              }}
            >
              Notes
            </Text>
            <TextInput
              className="border border-gray-300 rounded p-2 h-24 bg-white"
              style={{ fontSize: 16 }}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter notes"
              multiline={true}
              textAlignVertical="top"
            />
          </View>

          <View className="flex-row justify-end space-x-4">
            <TouchableOpacity
              onPress={uiActions.closeBookmarkModal}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              <Text className="text-gray-800 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} className="px-4 py-2 bg-blue-600 rounded">
              <Text className="text-white font-medium">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddEditBookmark;
