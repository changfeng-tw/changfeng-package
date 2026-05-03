import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot } from "firebase/firestore";

// 你的 Firebase 設定（已填好金鑰）
const firebaseConfig = {
  apiKey: "AIzaSyCmBJs92V1D3dTPljMspTu6k5dEAflr4hc",
  authDomain: "changfeng-package.firebaseapp.com",
  projectId: "changfeng-package",
  storageBucket: "changfeng-package.firebasestorage.app",
  messagingSenderId: "896942420055",
  appId: "1:896942420055:web:618606fd1cc59e722a3312"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 包裹資料的「集合」名稱
const PACKAGES_COL = "packages";
const SETTINGS_COL = "settings";

// ===== 包裹相關 =====

// 取得所有包裹
export async function loadPackages() {
  const snap = await getDocs(collection(db, PACKAGES_COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// 新增或更新包裹
export async function savePackage(pkg) {
  await setDoc(doc(db, PACKAGES_COL, pkg.id), pkg);
}

// 刪除包裹
export async function removePackage(id) {
  await deleteDoc(doc(db, PACKAGES_COL, id));
}

// 即時監聽包裹變動（其他裝置改了會立刻通知）
export function subscribePackages(callback) {
  return onSnapshot(collection(db, PACKAGES_COL), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}