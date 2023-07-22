import { initializeApp } from "firebase/app";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

// connectStorageEmulator.json for GCP:
//   [
//   {
//     "origin": ["*"],
//     "method": ["GET"],
//     "maxAgeSeconds": 3600
//   }
//   ]

//   create a cors.json file with above contents

//  -> now to check for cors : gsutil cors get gs://sleeping-owl-storage-1.appspot.com
//  -> to set the above file for cors :  gsutil cors set cors.json gs://sleeping-owl-storage-1.appspot.com
//  -> copy files from one bucket to another : gsutil -m rsync -r gs://bucket-source/dir gs://bucket-destination/dir

const firebaseConfig = {
  apiKey: "AIzaSyCkEnCenHgql3r2Y-h90upmkH5DZMjFgzQ",
  authDomain: "sleeping-owl-storage-2.firebaseapp.com",
  projectId: "sleeping-owl-storage-2",
  storageBucket: "sleeping-owl-storage-2.appspot.com",
  messagingSenderId: "938664352207",
  appId: "1:938664352207:web:ecb581f930c7149381daba",
};

const app = initializeApp(firebaseConfig);

const storage = getStorage(app);

export const uploadAudio = async (
  blob,
  filename,
  progressCallback,
  urlCallback,
  errorCallback
) => {
  if (!blob) {
    errorCallback("File not found");
    return;
  }

  const storageRef = ref(storage, `songs/${filename}`);

  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const metadata = {
    contentType: "audio/mp3",
    contentDisposition: `filename="${filename}"`,
  };
  const task = uploadBytesResumable(storageRef, uint8Array, metadata);

  task.on(
    "state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressCallback(progress);
    },
    (error) => {
      errorCallback(error.message);
    },
    () => {
      getDownloadURL(storageRef).then((url) => {
        urlCallback(url);
      });
    }
  );

  const cancelUpload = () => task.cancel();

  return cancelUpload;
};