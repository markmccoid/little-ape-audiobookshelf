import { Buffer } from "buffer";

// btoa
if (typeof global.btoa === "undefined") {
  global.btoa = (str) => Buffer.from(str, "utf-8").toString("base64");
}

// atob
if (typeof global.atob === "undefined") {
  global.atob = (b64Encoded) => Buffer.from(b64Encoded, "base64").toString("utf-8");
}
