// ProofLens Lite (caption-mode, no on-image overlay)
// Adds a tiny "• verified" chip inside captions/credits if present.
// If none found, stays invisible but still verifies on page load.

async function sha256HexOf(url){
  const r = await fetch(url,{cache:"no-store"}); if(!r.ok) throw new Error("img "+r.status);
  const buf = await r.arrayBuffer();
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function fetchJSON(url){
  const r = await fetch(url,{cache:"no-store"}); if(!r.ok) throw new Error("manifest "+r.status);
  return r.json();
}

// Try common caption/credit locations near the image
function findCreditNode(img){
  const fig = img.closest("figure");
  if (fig){
    const cap = fig.querySelector("figcaption.credit, figcaption .credit, figcaption, .credit, .caption, [data-credit]");
    if (cap) return cap.tagName.toLowerCase()==="figcaption" ? cap : fig.querySelector("figcaption") || cap;
  }
  // sibling within container
  const sib = img.parentElement?.querySelector(".credit, .caption, [data-credit], figcaption");
  return sib || null;
}

function makeChip(ok){
  const a=document.createElement("a");
  a.href="#"; a.textContent = (ok? "✓ verified" : "check failed");
  Object.assign(a.style,{
    marginLeft:"6px", fontSize:"12px", color: ok ? "#7af5c4" : "#ffd166",
    textDecoration:"none", border:"1px solid rgba(255,255,255,.12)",
    padding:"2px 6px", borderRadius:"999px"
  });
  a.addEventListener("click", e=>{ e.preventDefault(); if (a._proof) showProof(a._proof); });
  return a;
}

function showProof(data){
  const overlay=document.createElement("div");
  Object.assign(overlay.style,{position:"fixed",inset:"0",background:"rgba(0,0,0,.6)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:"9999"});
  const box=document.createElement("div");
  Object.assign(box.style,{background:"#0f172a",color:"#e5e7eb",border:"1px solid rgba(255,255,255,.12)",
    borderRadius:"12px",maxWidth:"720px",width:"92%",padding:"16px",boxShadow:"0 10px 30px rgba(0,0,0,.3)",
    fontFamily:"system-ui,Segoe UI,Roboto,Arial,sans-serif"});
  const h=document.createElement("h3"); h.textContent="Image Proof"; h.style.marginTop="0";
  const pre=document.createElement("pre");
  Object.assign(pre.style,{whiteSpace:"pre-wrap",fontSize:"12px",lineHeight:"1.4",
    background:"#0b1224",padding:"12px",borderRadius:"8px",overflow:"auto"});
  const close=document.createElement("button"); close.textContent="Close";
  Object.assign(close.style,{marginTop:"12px",background:"#1f2a44",color:"#fff",border:"0",padding:"8px 12px",borderRadius:"8px"});
  close.onclick=()=>document.body.removeChild(overlay);
  pre.textContent = JSON.stringify(data,null,2);
  box.appendChild(h); box.appendChild(pre); box.appendChild(close); overlay.appendChild(box);
  document.body.appendChild(overlay);
}

async function attach(img){
  const manUrl = img.getAttribute("data-manifest-url");
  if (!manUrl) return;
  try{
    const [man, actual] = await Promise.all([fetchJSON(manUrl), sha256HexOf(img.src)]);
    const expected = man.source_sha256 || (man.asset && man.asset.sha256);
    const pass = Boolean(expected && actual===expected);

    const creditNode = findCreditNode(img);
    if (creditNode){
      // append tiny inline verification chip
      const chip = makeChip(pass);
      chip._proof = {
        pass, expected, actual,
        summary:{ creator:man.creator, created_at:man.created_at, tool:man.tool, file:man.source_file },
        manifest: man
      };
      const sep = document.createTextNode(" \u2022 "); // dot separator if needed
      // only add if not already present
      if (![...creditNode.childNodes].some(n=>n._prooflensChip)) {
        creditNode.appendChild(sep);
        creditNode.appendChild(chip);
        chip._prooflensChip = true;
      }
    } else {
      // no visible UI; expose hook if integrators want to listen
      window.dispatchEvent(new CustomEvent("ProofLensVerified", { detail: { img, pass } }));
    }
  }catch(e){
    console.warn("ProofLens lite verify error:", e);
  }
}

function boot(){ document.querySelectorAll("img[data-manifest-url]").forEach(attach); }
(document.readyState==="loading")?document.addEventListener("DOMContentLoaded",boot):boot();
window.ProofLensLite = { attach };
