import crypto from "crypto";
import { parseBuffer } from "music-metadata";
import axios from "axios";

import { uploadAudio } from "./firebase.js";

const createError = (res, message, code = 400, err = "") => {
  res.status(code).json({
    success: false,
    message: message || "Something gone wrong",
    error: err,
  });
};

const createResponse = (res, data, code = 200) => {
  res.status(code).json({
    success: true,
    data,
  });
};

function getRandomInteger(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const validateEmail = (email) => {
  if (!email) return false;
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
};

function formatSecondsToMinutesSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = parseInt(seconds % 60);

  return `${minutes}:${
    remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds
  }`;
}

function getBlobDuration(blob) {
  return new Promise((resolve, reject) => {
    blob.arrayBuffer().then(async (buffer) => {
      const audioBuffer = Buffer.from(buffer);

      const audioMetadata = await parseBuffer(audioBuffer, "audio/mp3");

      if (!audioMetadata) {
        console.log("Failed to read meta-data from audio");
        reject(0);
        return;
      }

      const durationInSeconds = audioMetadata.format.duration;
      resolve(durationInSeconds);
    });
  });
}

const getFileHashSha256 = async (blob) => {
  if (!blob) return;

  const uint8Array = new Uint8Array(await blob.arrayBuffer());
  const hashBuffer = await crypto.subtle.digest("SHA-256", uint8Array);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((h) => h.toString(16).padStart(2, "0")).join("");
};

const uploadAudioSync = (blob, filename) => {
  if (!filename) return "";

  let lastLoggedProgress = 0;

  return new Promise((res) => {
    uploadAudio(
      blob,
      filename,
      (p) => {
        if (p - lastLoggedProgress >= 30) {
          console.log(`${parseInt(p)}% done`);
          lastLoggedProgress = p;
        }
      },
      (url) => res(url),
      (err) => {
        console.log(err);
        res(null);
      }
    );
  });
};

// function downloadFile(url, fileName) {
//   console.log(`Downloading file:${fileName}`);
//   return new Promise((res) =>
//     fetch(url)
//       .then((response) => {
//         const totalSize = response.headers.get("Content-Length");
//         let downloadedSize = 0;
//         let lastLoggedProgress = 0;
//         const chunks = [];

//         const reader = response.body.getReader();

//         const pump = () => {
//           return reader.read().then(({ value, done }) => {
//             if (done) {
//               console.log("🟢Download completed");
//               const blob = new Blob(chunks);

//               res(blob);
//               return;
//             }

//             downloadedSize += value.length;
//             const progress = Math.floor((downloadedSize / totalSize) * 100);

//             if (progress - lastLoggedProgress >= 30) {
//               console.log(`${progress}% done`);
//               lastLoggedProgress = progress;
//             }

//             chunks.push(value);
//             return pump();
//           });
//         };

//         pump();
//       })
//       .catch((err) => console.log("Error downloading song", err))
//   );
// }

function downloadFile(url, fileName) {
  console.log(`Downloading file:${fileName}`);
  return new Promise((resolve, _reject) => {
    let lastLoggedProgress = 0;
    axios({
      url: url,
      method: "GET",
      responseType: "arraybuffer",
      onDownloadProgress: (progressEvent) => {
        const totalSize = progressEvent.total;
        const downloadedSize = progressEvent.loaded;
        const progress = Math.floor((downloadedSize / totalSize) * 100);

        if (!isNaN(progress) && progress - lastLoggedProgress > 30) {
          lastLoggedProgress = progress;
          console.log(`${progress}% done`);
        }
      },
    })
      .then((res) => {
        console.log("🟢Download completed");
        const blob = new Blob([res.data], { type: "audio/mp3" });

        resolve(blob);
      })
      .catch((err) => {
        console.log("Error downloading file", err?.message);
        resolve(null);
      });
  });
}

function shuffleArray(arr = []) {
  if (!Array.isArray(arr) || !arr.length) return;

  const array = [...arr];
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export {
  createError,
  createResponse,
  validateEmail,
  formatSecondsToMinutesSeconds,
  uploadAudioSync,
  getFileHashSha256,
  downloadFile,
  getBlobDuration,
  getRandomInteger,
  shuffleArray,
};
