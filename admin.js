// Admin gate + data-source handling for /app.html.
// - On load, if sessionStorage has a validated admin key, hide the gate.
// - Else show the gate; on submit POST to /api/admin-auth and cache the key.
// - Exposes window.CS_ADMIN with: getKey(), logout(), fetchListings(), patchListing()
//   and a `dataSource` + `realProfiles` cache.

(function () {
"use strict";

const STORAGE_KEY = "cyclestay_admin_key";
const gate = document.getElementById("admin-gate");
const form = document.getElementById("admin-gate-form");
const input = document.getElementById("admin-gate-input");
const errorBox = document.getElementById("admin-gate-error");

let adminKey = sessionStorage.getItem(STORAGE_KEY) || "";
let dataSource = "synthetic"; // "synthetic" | "real"
let realProfiles = null;

function showGate() {
  gate.removeAttribute("hidden");
  gate.style.display = "flex";
  setTimeout(() => input.focus(), 40);
}
function hideGate() {
  gate.style.display = "none";
}

if (adminKey) {
  hideGate();
} else {
  showGate();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.setAttribute("hidden", "");
  const key = input.value.trim();
  if (!key) return;
  try {
    const r = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (r.ok) {
      adminKey = key;
      sessionStorage.setItem(STORAGE_KEY, key);
      hideGate();
      input.value = "";
      // Re-run initial matcher flow now that gate is cleared.
      if (window.CS_APP_READY && typeof window.CS_APP_READY === "function") {
        window.CS_APP_READY();
      }
    } else {
      const body = await r.json().catch(() => ({}));
      errorBox.textContent = body.error || "Invalid key.";
      errorBox.removeAttribute("hidden");
    }
  } catch {
    errorBox.textContent = "Network error — try again.";
    errorBox.removeAttribute("hidden");
  }
});

const logout = document.getElementById("admin-logout");
if (logout) {
  logout.addEventListener("click", () => {
    sessionStorage.removeItem(STORAGE_KEY);
    adminKey = "";
    location.reload();
  });
}

// Airtable record → matcher profile mapping with permissive defaults.
function airtableToProfile(rec, idx) {
  const f = rec.fields || {};
  return {
    id: idx,
    recordId: rec.id,
    name: f.name || "Anonymous",
    email: f.email || "",
    origin: f.origin,
    dest: f.dest,
    start: f.start_date ? new Date(f.start_date) : new Date(2026, 5, 1),
    end: f.end_date ? new Date(f.end_date) : new Date(2026, 7, 22),
    status: f.status || "submitted",
    offered: {
      unit: f.unit_type || "1br",
      hasPets: false,
      hasParking: false,
      isPrivate: (f.unit_type || "1br") !== "room",
      nearTransit: true,
    },
    needs: {
      noPets: false,
      parking: false,
      privateRoom: false,
      nearTransit: false,
      units: new Set([f.unit_type || "1br"]),
    },
  };
}

async function fetchListings() {
  if (!adminKey) throw new Error("No admin key");
  const r = await fetch("/api/listings", { headers: { "x-admin-key": adminKey } });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `Fetch failed (${r.status})`);
  }
  const data = await r.json();
  const records = data.records || [];
  realProfiles = records.map((rec, i) => airtableToProfile(rec, i));
  return realProfiles;
}

async function patchListing(recordId, status) {
  if (!adminKey) throw new Error("No admin key");
  const r = await fetch("/api/listings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify({ id: recordId, status }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `Patch failed (${r.status})`);
  }
  return r.json();
}

window.CS_ADMIN = {
  getKey: () => adminKey,
  isAuthed: () => !!adminKey,
  logout: () => { sessionStorage.removeItem(STORAGE_KEY); adminKey = ""; location.reload(); },
  fetchListings,
  patchListing,
  setDataSource: (v) => { dataSource = v; },
  getDataSource: () => dataSource,
  getRealProfiles: () => realProfiles,
};

})();
