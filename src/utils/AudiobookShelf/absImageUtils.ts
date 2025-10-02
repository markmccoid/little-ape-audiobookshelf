import { Image } from "react-native";

export const defaultImages = {
  image01: require("../../assets/images/little-ape-abs-001.png"),
  image02: require("../../assets/images/little-ape-abs-002.png"),
};

export function getRandomNumber() {
  const imageCount = Object.keys(defaultImages).length;
  const randomNumber = Math.floor(Math.random() * imageCount) + 1; // Generate random number between 1 and imageCount
  return randomNumber.toString().padStart(2, "0"); // Pad number with leading zero if less than 10
}

// -- getCoverURI
export const getCoverURI = async (
  coverURL: string
): Promise<{ coverURL: string; type: "passthrough" | "localasset" }> => {
  let cover: string;
  try {
    const coverRes = await getImageSize(coverURL);
    return { coverURL, type: "passthrough" };
  } catch (err) {
    // Using the passed coverURL (if it doesn't exist), hash it to a a number/index
    // This allows us to use the same image for each file (hashed on its)
    const hashImageIndex = getImageIndex(coverURL);
    // console.log("hashImageIndex", hashImageIndex);
    const randomImageInfo = Image.resolveAssetSource(defaultImages[`image${hashImageIndex}`]);
    const randomImageAspect = randomImageInfo.width / randomImageInfo.height;
    return { coverURL: randomImageInfo.uri, type: "localasset" };
  }
};

//--=================================
//-- getImageSize
//--=================================
export const getImageSize = async (
  uri: string
): Promise<{ width: number; height: number; aspectRatio: number }> => {
  const promise = new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => {
        resolve({ width, height, aspectRatio: width / height });
      },
      // reject
      (err) => resolve({ width: undefined, height: undefined })
    );
  });

  return (await promise) as {
    width: number;
    height: number;
    aspectRatio: number;
  };
};

//--=================================
//-- hashStringToNumber
//--=================================
const hashStringToNumber = (str: string) => {
  // let hash = 0;
  // for (let i = 0; i < str.length; i++) {
  //   hash = str.charCodeAt(i) + ((hash << 5) - hash);
  //   hash = hash & hash; // Convert to 32bit integer
  // }
  // return Math.abs(hash);

  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

//--=================================
//-- getImageIndex
//--=================================
export const getImageIndex = (filename: string) => {
  const hash = hashStringToNumber(filename);
  const num = (hash % Object.keys(defaultImages).length) + 1;
  return num.toString().padStart(2, "0");
};
