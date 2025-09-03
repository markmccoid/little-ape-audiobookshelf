import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ABSGetLibraries } from "../ABS/absAPIClass";
import { useAbsAPI } from "../ABS/absInit";

//# ----------------------------------------------
//# useLibraries - return user's libraries
//# ----------------------------------------------
export const useLibraries = () => {
  const absAPI = useAbsAPI();
  const [libraries, setLibraries] = useState<ABSGetLibraries>([]);
  const [activeLibrary, setActiveLibrary] = useState("");

  const handleSetActiveLibrary = async (activeLibraryId: string) => {
    absAPI.setActiveLibraryId(activeLibraryId);
    setActiveLibrary(activeLibraryId);
  };

  useEffect(() => {
    const getLibs = async () => {
      const libs = await absAPI.getLibraries();
      setLibraries(libs);
    };
    getLibs();
  }, [activeLibrary]);

  return { libraries, activeLibrary, setActiveLibrary: handleSetActiveLibrary };
};

//# ----------------------------------------------
//# useGetBooks
//# ----------------------------------------------
export const useGetBooks = async () => {
  const absAPI = useAbsAPI();
  const activeLibraryId = absAPI.getActiveLibraryId();
  console.log("ActiveLibId", activeLibraryId);

  const { data, isPending, isError, isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: async () => await absAPI.getLibraryItems({ libraryId: activeLibraryId }),
    staleTime: 1000 * 60 * 5, // Stale Minutes
  });
  const favs = useQuery({
    queryKey: ["FavsAndRead"],
    queryFn: async () => await absAPI.getFavoritedAndFinishedItems(),
    // staleTime: 1000 * 60 * 5, // Stale Minutes
  });

  console.log("QUERY", isPending, isLoading, isError);
  if (!isPending && data && !favs.isPending) {
    console.log(
      "Favs",
      favs.data?.map((el) => `${el.title}--${el.itemId}`)
    );
    console.log("ITEMS.Length", data?.length, data[0].cover);
  } else {
    console.log("PENDING");
  }
  return;
};
