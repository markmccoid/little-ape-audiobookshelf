import React from "react";
import { Button, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  useAllFilters,
  useAuthor,
  useFilterCounts,
  useFiltersActions,
  useGenres,
  useHasActiveFilters,
  useSearchValue,
  useTags,
} from "./store-filters";

// Example component showing how to use the filters store
export const FiltersExample = () => {
  // Using atomic selectors (recommended approach)
  const searchValue = useSearchValue();
  const genres = useGenres();
  const tags = useTags();
  const author = useAuthor();

  // Getting all actions
  const {
    setSearchValue,
    addGenre,
    removeGenre,
    clearGenres,
    addTag,
    removeTag,
    clearTags,
    setAuthor,
    clearAllFilters,
    clearSearchAndAuthor,
  } = useFiltersActions();

  // Helper hooks
  const hasActiveFilters = useHasActiveFilters();
  const { genresCount, tagsCount, totalActiveFilters } = useFilterCounts();

  return (
    <View style={{ padding: 20 }}>
      {/* Search */}
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Search</Text>
      <TextInput
        value={searchValue}
        onChangeText={setSearchValue}
        placeholder="Search audiobooks..."
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          marginBottom: 20,
          borderRadius: 5,
        }}
      />

      {/* Author */}
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Author</Text>
      <TextInput
        value={author}
        onChangeText={setAuthor}
        placeholder="Filter by author..."
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          marginBottom: 20,
          borderRadius: 5,
        }}
      />

      {/* Genres */}
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Genres ({genresCount} selected)
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            onPress={() => removeGenre(genre)}
            style={{
              backgroundColor: "#007AFF",
              padding: 8,
              margin: 4,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "white" }}>{genre} ×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <Button title="Add Fantasy" onPress={() => addGenre("Fantasy")} />
        <Button title="Add Sci-Fi" onPress={() => addGenre("Science Fiction")} />
        <Button title="Add Mystery" onPress={() => addGenre("Mystery")} />
        <Button title="Clear Genres" onPress={clearGenres} />
      </View>

      {/* Tags */}
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Tags ({tagsCount} selected)
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag}
            onPress={() => removeTag(tag)}
            style={{
              backgroundColor: "#34C759",
              padding: 8,
              margin: 4,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "white" }}>{tag} ×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <Button title="Add Finished" onPress={() => addTag("Finished")} />
        <Button title="Add Favorite" onPress={() => addTag("Favorite")} />
        <Button title="Add New" onPress={() => addTag("New")} />
        <Button title="Clear Tags" onPress={clearTags} />
      </View>

      {/* Filter Status */}
      <Text style={{ fontSize: 16, marginBottom: 10 }}>Active Filters: {totalActiveFilters}</Text>

      {hasActiveFilters && (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <Button title="Clear Search & Author" onPress={clearSearchAndAuthor} />
          <Button title="Clear All Filters" onPress={clearAllFilters} />
        </View>
      )}

      {/* Current State Display */}
      <Text style={{ fontSize: 14, color: "#666", marginTop: 20 }}>
        Current Filters:{"\n"}
        Search: "{searchValue}"{"\n"}
        Author: "{author}"{"\n"}
        Genres: {genres.join(", ") || "None"}
        {"\n"}
        Tags: {tags.join(", ") || "None"}
      </Text>
    </View>
  );
};

// Alternative: Using the combined selector when you need all values
export const AlternativeFiltersExample = () => {
  // This approach gets all filter values at once
  const allFilters = useAllFilters();
  const actions = useFiltersActions();
  const hasActiveFilters = useHasActiveFilters();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        All Filters Combined
      </Text>

      <Text>Search: {allFilters.searchValue}</Text>
      <Text>Author: {allFilters.author}</Text>
      <Text>Genres: {allFilters.genres.length}</Text>
      <Text>Tags: {allFilters.tags.length}</Text>

      {hasActiveFilters && (
        <Button title="Clear All" onPress={actions.clearAllFilters} style={{ marginTop: 20 }} />
      )}
    </View>
  );
};

// Example of using filters with React Query or similar data fetching
export const FilteredDataExample = () => {
  const searchValue = useSearchValue();
  const genres = useGenres();
  const tags = useTags();
  const author = useAuthor();

  // This would be used with your data fetching logic
  const filterParams = {
    search: searchValue,
    genres,
    tags,
    author,
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Query parameters for API call:</Text>
      <Text>{JSON.stringify(filterParams, null, 2)}</Text>
    </View>
  );
};
