(function(){
  async function fetchJSON(url){
    const r = await fetch(url,{cache:"no-store"});
    if(!r.ok) throw new Error("Manifest fetch failed: "+r.status);
    return await r.json();
  }
  async function sha256HexOf(url){
    const r = await fetch(url,{cache:"no-store"});
    const buf = await r.arrayBuffer();
    const h = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  function createBadge(){
    const b = document.createElement("div");
    Object.assign(b.style,{position:"absolute",top:"8px",right:"8px",padding:"6px 8px",fontSize:"12px",
      borderRadius:"6px",background:"rgba(0,0,0,.75)",color:"#fff",cursor:"pointer",userSelect:"none"});
    b.textContent="CR"; b.title="Content Credentials"; return b;
  }
  function createModal(){
    const overlay=document.createElement("div");
    Object.assign(overlay.style,{position:"fixed",inset:"0",background:"rgba(0,0,0,.6)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:"9999"});
    const box=document.createElement("div");
    Object.assign(box.style,{background:"#fff",borderRadius:"12px",maxWidth:"620px",width:"92%",
      padding:"16px",boxShadow:"0 10px 30px rgba(0,0,0,.2)",fontFamily:"system-ui,Segoe UI,Roboto,Arial,sans-serif"});
    const h=document.createElement("h3"); h.textContent="Content Credentials"; h.style.marginTop="0";
    const pre=document.createElement("pre");
    Object.assign(pre.style,{whiteSpace:"pre-wrap",fontSize:"12px",lineHeight:"1.4",
      background:"#0f172a",color:"#e5e7eb",padding:"12px",borderRadius:"8px",overflow:"auto"});
    const close=document.createElement("button"); close.textContent="Close"; close.style.marginTop="12px";
    close.onclick=()=>document.body.removeChild(overlay);
    box.appendChild(h); box.appendChild(pre); box.appendChild(close); overlay.appendChild(box);
    return {overlay, pre};
  }
  async function attach(img){
    const manifestUrl=img.getAttribute("data-manifest-url"); if(!manifestUrl) return;
    const wrap=document.createElement("div"); wrap.style.position="relative";
    img.parentNode.insertBefore(wrap,img); wrap.appendChild(img);
    const badge=createBadge(); wrap.appendChild(badge);
    badge.addEventListener("click", async ()=>{
      const m=createModal(); document.body.appendChild(m.overlay);
      try{
        const man=await fetchJSON(manifestUrl);
        const expected = man.source_sha256 || (man.asset && man.asset.sha256);
        let verify=null, error=null;
        try {
          const actual = await sha256HexOf(img.getAttribute("src"));
          verify = { expected, actual, pass: (actual===expected) };
        } catch(e){ error="Hashing failed: "+e.message; }
        m.pre.textContent = JSON.stringify({
          summary:{ creator:man.creator, created_at:man.created_at, tool:man.tool,
                    filename:(man.asset&&man.asset.filename)||man.source_file },
          verify, raw:man, error
        }, null, 2);
      }catch(e){ m.pre.textContent="Error: "+e.message; }
    });
  }
  function boot(){ document.querySelectorAll("img[data-manifest-url]").forEach(attach); }
  (document.readyState==="loading")?document.addEventListener("DOMContentLoaded",boot):boot();
  window.ProofLensVerify={attach};
})();

