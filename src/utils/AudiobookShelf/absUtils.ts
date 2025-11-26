import { Book } from "@/src/store/store-books";
import { TypedPersonalizedView } from "./abstypes";

export type BookShelfItemType = {
  id: string;
  label: string;
  key?: string;
  position?: number;
  displayed?: boolean;
  books: BookShelfBook[];
};
export type BookShelfBook = Book & {
  currentTime?: number;
};

export const buildBookShelf = <T extends TypedPersonalizedView>(
  bookShelfItem: T
  // token: string,
  // absURL: string
) => {
  const baseInfo = { shelfId: bookShelfItem.id, shelfLabel: bookShelfItem.label };
  switch (bookShelfItem.type) {
    case "book":
      const books = bookShelfItem.entities.map((book) => ({
        libraryItemId: book.id,
        // title: book.media.metadata.title,
        // author: book.media.metadata.authorName,
        // coverURL: buildCoverURLSync(book.id, token, absURL).coverFull,
        // duration: book.media.duration,
      }));
      return { ...baseInfo, books: books as Pick<Book, "libraryItemId">[] };

    // case "series":
    //   return bookShelfItem.entities.map((series) => ({
    //     shelfId: bookShelfItem.id,
    //     shelfLabel: bookShelfItem.label,
    //     libraryItemId: series.id,
    //     title: series.name,
    //     seriesName: series.name,
    //     // Need to process these separately.
    //     // Function that returns an array of books with data...
    //     books: series.books.map((el) => el.libraryId),
    //     // Not image for series
    //     coverURL: buildCoverURLSync(series.id, token, absURL).coverFull,
    //   }));

    // case "authors":
    //   return bookShelfItem.entities.map((author) => ({
    //     shelfId: bookShelfItem.id,
    //     shelfLabel: bookShelfItem.label,
    //     libraryItemId: author.id,
    //     title: author.name,
    //     author: author.name,
    //     //Author image how to build -> https://api.audiobookshelf.org/#get-an-author-39-s-image
    //     // coverURL: buildCoverURLSync(author.id, token, absURL).coverFull,
    //   }));
  }
};

//## -------------------------------------
//## buildCoverURLSync
//## -------------------------------------
export function buildCoverURLSync(
  itemId: string,
  token: string,
  serverUrl: string,
  format: "webp" | "jpeg" = "webp"
) {
  // const auth = await AudiobookshelfAuth.create();
  // const serverUrl = this.auth.absURL;
  const coverThumb = `${serverUrl}/api/items/${itemId}/cover?format=${format}&width=240&token=${token}`;
  const coverFull = `${serverUrl}/api/items/${itemId}/cover?format=${format}&token=${token}`;
  return { coverThumb, coverFull };
}
