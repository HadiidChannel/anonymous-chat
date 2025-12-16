import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   FIREBASE CONFIG
================================ */
const firebaseConfig = {
  apiKey: "AIzaSyBgVHkZT34AZ1k0i_s2UsEuy8y6eB0KWws",
  authDomain: "anonymous-chat-web-fb822.firebaseapp.com",
  projectId: "anonymous-chat-web-fb822",
  storageBucket: "anonymous-chat-web-fb822.firebasestorage.app",
  messagingSenderId: "129582559508",
  appId: "1:129582559508:web:0195fa4eb891352218d201"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ===============================
   DOM
================================ */
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const themeBtn = document.getElementById("themeBtn");
const onlineCountEl = document.getElementById("onlineCount");

/* ===============================
   IDENTITAS ANONIM
================================ */
const avatars = ["🐱","🐶","🦊","🐼","🐸","🐵","🦁"];

let avatar = localStorage.getItem("avatar");
let senderId = localStorage.getItem("senderId");

if (!avatar) {
  avatar = avatars[Math.floor(Math.random() * avatars.length)];
  localStorage.setItem("avatar", avatar);
}

if (!senderId) {
  senderId = "anon-" + Math.random().toString(36).slice(2, 9);
  localStorage.setItem("senderId", senderId);
}

/* ===============================
   ONLINE USER TRACKING
================================ */
const onlineRef = doc(db, "online_users", senderId);

// Update status tiap 15 detik
async function updateOnlineStatus() {
  await setDoc(onlineRef, {
    senderId,
    lastActive: serverTimestamp()
  });
}

updateOnlineStatus();
setInterval(updateOnlineStatus, 15000);

// Hitung user online (aktif < 30 detik)
const onlineQuery = query(collection(db, "online_users"));

onSnapshot(onlineQuery, snapshot => {
  const now = Date.now();
  let count = 0;

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.lastActive?.seconds) {
      const diff = now - data.lastActive.seconds * 1000;
      if (diff < 30000) count++;
    }
  });

  onlineCountEl.textContent = count;
});

/* ===============================
   KIRIM PESAN
================================ */
sendBtn.onclick = sendMessage;
input.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  await addDoc(collection(db, "chat_messages"), {
    text,
    avatar,
    senderId,
    timestamp: new Date(),
    deleted: false
  });

  input.value = "";
}

/* ===============================
   REALTIME CHAT
================================ */
const q = query(collection(db, "chat_messages"), orderBy("timestamp"));

onSnapshot(q, snapshot => {
  chatBox.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const isSelf = data.senderId === senderId;

    const div = document.createElement("div");
    div.className = "message" + (isSelf ? " self" : "");

    if (data.deleted) {
      div.innerHTML = "<i>Pesan dihapus</i>";
    } else {
      const time = data.timestamp?.seconds
        ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString()
        : "";

      div.innerHTML = `
        <strong>${data.avatar}</strong> ${data.text}
        <small>${time}</small>
        ${isSelf ? `<button onclick="hapus('${docSnap.id}')">🗑</button>` : ""}
      `;
    }

    chatBox.appendChild(div);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
});

/* ===============================
   HAPUS PESAN SENDIRI
================================ */
window.hapus = async (id) => {
  await updateDoc(doc(db, "chat_messages", id), {
    deleted: true,
    senderId
  });
};

/* ===============================
   DARK MODE
================================ */
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

themeBtn.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
};
