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
export const useGetBooks = () => {
  const absAPI = useAbsAPI();
  const activeLibraryId = absAPI.getActiveLibraryId();

  const { data, isPending, isError, isLoading, ...rest } = useQuery({
    queryKey: ["books", activeLibraryId],
    queryFn: async () => await absAPI.getLibraryItems({ libraryId: activeLibraryId }),
    staleTime: 1000 * 60 * 5, // Stale Minutes
  });
  // const favs = useQuery({
  //   queryKey: ["FavsAndRead"],
  //   queryFn: async () => await absAPI.getFavoritedAndFinishedItems(),
  //   // staleTime: 1000 * 60 * 5, // Stale Minutes
  // });

  return { data, isPending, isError, isLoading, ...rest };
};

//# ----------------------------------------------
//# useGetItemDetails
//# ----------------------------------------------
export const useGetItemDetails = (itemId?: string) => {
  const absAPI = useAbsAPI();

  const { data, isPending, isError, isLoading, error, ...rest } = useQuery({
    queryKey: ["itemDetails", itemId],
    queryFn: async () => await absAPI.getItemDetails(itemId),
    enabled: !!itemId, // Only run query if itemId is provided
    staleTime: 1000 * 60 * 5, // Stale for 5 minutes
  });

  return { data, isPending, isError, isLoading, error, ...rest };
};
