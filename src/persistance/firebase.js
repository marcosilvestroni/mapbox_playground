import firebase from "firebase";

const firebaseConfig = {
  apiKey: "AIzaSyDo9sP4zYWEe-ZozjJETWupwMZkcC_mAWE",
  authDomain: "mapbox-pers.firebaseapp.com",
  databaseURL: "https://mapbox-pers.firebaseio.com",
  projectId: "mapbox-pers",
  storageBucket: "mapbox-pers.appspot.com",
  messagingSenderId: "552859291147",
  appId: "1:552859291147:web:202360d18542fcba81c10e",
  measurementId: "G-RD5ER8C7CE"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

export default firebase;
