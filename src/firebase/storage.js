import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "./config";

const storage = getStorage(app);

export { storage, ref, uploadBytes, getDownloadURL, deleteObject };
