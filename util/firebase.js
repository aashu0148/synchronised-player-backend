import { initializeApp } from "firebase/app";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDLviPuwr5eUzpXT-ChHUEMujf2iffhUbA",
  authDomain: "sleeping-owl-storage-1.firebaseapp.com",
  projectId: "sleeping-owl-storage-1",
  storageBucket: "sleeping-owl-storage-1.appspot.com",
  messagingSenderId: "124129053116",
  appId: "1:124129053116:web:6c45a9575e7fc0f41703b9",
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
