// ==== Firebase Imports ====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

// ==== Firebase Config (no Storage needed) ====
const firebaseConfig = {
  apiKey: "AIzaSyDyKuPBHPf7A6uMWBi3Z9ixYpzKzBJ0X8c",
  authDomain: "search-database-22dc4.firebaseapp.com",
  projectId: "search-database-22dc4",
  messagingSenderId: "22950548949",
  appId: "1:22950548949:web:b74534478450302d54195c",
  measurementId: "G-WZZWN98V1V"
};

// ==== SPECIES GIF URL ====
const DOG_GIF_URL = "https://res.cloudinary.com/dzzvvgh7u/image/upload/v1762775984/dog_ksqncm.gif";
const CAT_GIF_URL = "https://res.cloudinary.com/dzzvvgh7u/image/upload/v1762775984/cat_gdtw6j.gif";

// ==== SPECIES helper ====
function getSpeciesIcon(typeValue){
  if(!typeValue) return "";
  const first = typeValue.trim().charAt(0).toUpperCase();
  if(first === "D") return `<img src="${DOG_GIF_URL}" class="species-gif" />`;
  if(first === "C") return `<img src="${CAT_GIF_URL}" class="species-gif" />`;
  return "";
}

// ==== Initialize Firebase ====
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ==== Config ====
const ADMIN_EMAIL = 'teerapong6383@gmail.com';
let currentUser = null;

// ==== DOM ====
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const singleResult = document.getElementById('singleResult');

// Modal + FAB
const fabAdd = document.getElementById("fabAdd");
const formModal = document.getElementById("formModal");
const closeModal = document.getElementById("closeModal");
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');

// Form fields
const codeEl  = document.getElementById('code');
const nameEl  = document.getElementById('name');
const colorEl = document.getElementById('color');
const shapeEl = document.getElementById('shape');
const typeEl  = document.getElementById('type');

// ==== Cloudinary upload (Unsigned) ====
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "unsigned_preset"); // ต้องมี preset นี้ใน Cloudinary
  const res = await fetch("https://api.cloudinary.com/v1_1/dzzvvgh7u/image/upload", {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message || "อัปโหลดรูปไม่สำเร็จ");
  }
  return data.secure_url;
}

// ==== Auth ====
loginBtn.addEventListener('click', async () => {
  try { await signInWithPopup(auth, provider); }
  catch (err) { alert('เข้าสู่ระบบไม่สำเร็จ: ' + err.message); }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  loginBtn.style.display = user ? 'none' : 'block';
  logoutBtn.style.display = user ? 'block' : 'none';
  // FAB เฉพาะแอดมิน
  fabAdd.style.display = (user && user.email === ADMIN_EMAIL) ? 'block' : 'none';
});

// ==== Modal open/close ====
function openFormModal()  { formModal.style.display = "block"; }
function closeFormModal() { formModal.style.display = "none"; }
closeModal.addEventListener("click", closeFormModal);
window.addEventListener("click", (e) => { if (e.target === formModal) closeFormModal(); });

// FAB กดเพื่อเปิดฟอร์ม
fabAdd.addEventListener("click", () => {
  if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
    alert("Admin เท่านั้น");
    return;
  }
  // clear ฟอร์มทุกครั้งก่อนเปิด
  uploadForm.reset();
  openFormModal();
});

// ==== Render result card (แสดงปุ่มแก้ไข/ลบ เฉพาะ admin) ====
function renderItemCard(item) {
  const iconHTML = getSpeciesIcon(item.type);
  const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;

  singleResult.innerHTML = `
    <div class="card">
      <img src="${item.imageUrl || 'https://via.placeholder.com/600x400?text=no+image'}"
           style="width:100%;height:auto;border-radius:12px;" />
      <h3 style="text-align:center;margin:.5rem 0 0;">${item.code} • ${item.name || '-'}</h3>
      <p style="text-align:center;margin:.25rem 0 .5rem;">
        สี: ${item.color || '-'}<br>
        รูปร่าง: ${item.shape || '-'}<br>
        ประเภท: ${item.type || '-'}
      </p>
      ${iconHTML}
      ${isAdmin ? `
        <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;">
          <button class="smallBtn" data-action="edit" data-code="${item.code}">แก้ไข</button>
          <button class="smallBtn" data-action="delete" data-code="${item.code}">ลบ</button>
        </div>
      ` : ''}
    </div>
  `;
}

// คลิกปุ่มแก้ไข/ลบ ใต้รูป
singleResult.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  const code = btn.dataset.code;
  if (!code) return;

  if (action === 'edit') {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return alert('Admin เท่านั้น');
    const ref = doc(db, 'items', code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return alert('ไม่พบข้อมูล');

    const it = snap.data();
    // เติมค่าลงฟอร์ม
    codeEl.value  = it.code || '';
    nameEl.value  = it.name || '';
    colorEl.value = it.color || '';
    shapeEl.value = it.shape || '';
    typeEl.value  = it.type || '';
    // ไม่บังคับอัปโหลดรูปใหม่ จะใช้รูปเดิมก็ได้
    openFormModal();

  } else if (action === 'delete') {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return alert('Admin เท่านั้น');
    if (!confirm(`ลบรายการรหัส ${code} ใช่หรือไม่?`)) return;
    await deleteDoc(doc(db, 'items', code));
    alert('🗑️ ลบเรียบร้อย');
    singleResult.innerHTML = '';
  }
});

// ==== Submit form (เพิ่ม/แก้) ====
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser || currentUser.email !== ADMIN_EMAIL)
    return alert('คุณไม่มีสิทธิ์เพิ่มหรือแก้ไขข้อมูล');

  const code  = codeEl.value.trim();
  const name  = nameEl.value.trim();
  const color = colorEl.value.trim();
  const shape = shapeEl.value.trim();
  const type  = typeEl.value.trim();
  const file  = fileInput.files[0];

  if (!code || !name) return alert('กรุณากรอกรหัสและชื่อ');

  try {
    let imageUrl = null;

    // ถ้ามีไฟล์ → อัปโหลด Cloudinary ใหม่
    if (file) {
      imageUrl = await uploadToCloudinary(file);
    } else {
      // ไม่มีไฟล์: เก็บรูปเดิมถ้ามี (อ่านค่าจาก doc ก่อน)
      const ref = doc(db, 'items', code);
      const snap = await getDoc(ref);
      if (snap.exists()) imageUrl = snap.data().imageUrl || null;
    }

    await setDoc(doc(db, 'items', code), {
      code, name, color, shape, type,
      imageUrl: imageUrl || null,
      updatedAt: new Date().toISOString()
    });

    alert('✅ บันทึกเรียบร้อย');
    closeFormModal();

    // โชว์ผลลัพธ์ล่าสุด
    renderItemCard({ code, name, color, shape, type, imageUrl });

    // เคลียร์ไฟล์
    fileInput.value = '';
  } catch (err) {
    alert('ผิดพลาด: ' + err.message);
  }
});

// ==== Search (รองรับมือถือ: keydown/search/change) ====
async function handleSearch(e){
  // Desktop: ทำงานเมื่อ Enter เท่านั้น
  if (e.type === 'keydown' && e.key !== 'Enter') return;

  const q = searchInput.value.trim();
  if (!q) return;

  const ref = doc(db, 'items', q);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    singleResult.innerHTML = `<p style="color:#c33;text-align:center;">ไม่พบรหัส "${q}"</p>`;
    return;
  }
  renderItemCard(snap.data());
}
searchInput.addEventListener('keydown', handleSearch);
searchInput.addEventListener('search', handleSearch);  // mobile keyboard "Search"
searchInput.addEventListener('change', handleSearch);  // fallback mobile
