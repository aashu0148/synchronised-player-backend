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
//  -> to get size of a directory : gsutil du -s gs://sleeping-owl-storage-1.appspot.com/songs | awk '{print $1/1048576 " MB"}'
//  -> to get length of a directory : gsutil ls gs://sleeping-owl-storage-1.appspot.com/songs | wc -l

const firebaseConfig = {
  apiKey: "AIzaSyAaqYGES4Fd9dx2PlS-GFN14t6sPsu85qA",
  authDomain: "sleeping-owl-storage-5.firebaseapp.com",
  projectId: "sleeping-owl-storage-5",
  storageBucket: "sleeping-owl-storage-5.appspot.com",
  messagingSenderId: "491922593758",
  appId: "1:491922593758:web:a986d9e398350edd04af4f",
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
