import { useState, useRef } from "react";

const uid = () => Math.random().toString(36).slice(2, 8);
const money = (n) => `$${n.toFixed(2)}`;

const COLORS = [
  { bg: "#E86A33", lt: "#FFF0E8" }, { bg: "#3A7BD5", lt: "#E8F0FF" },
  { bg: "#9B59B6", lt: "#F3E8FF" }, { bg: "#E84393", lt: "#FFE8F3" },
  { bg: "#00B894", lt: "#E8FFF6" }, { bg: "#FDCB6E", lt: "#FFF8E1" },
];

const freshState = () => ({
  items: [{ id: uid(), name: "", price: "" }],
  taxVal: "",
  charges: [],
  tipPct: 18,
  customTip: "",
  people: [
    { id: uid(), name: "Me", ci: 0 },
    { id: uid(), name: "Friend", ci: 1 },
  ],
  claims: {},
  photos: [],
});

export default function App() {
  const [step, setStep] = useState("home");
  const [state, setState] = useState(freshState);
  const [active, setActive] = useState(null);
  const [photoExpanded, setPhotoExpanded] = useState(false);

  const camRef = useRef();
  const galRef = useRef();
  const camAddRef = useRef();

  const { items, taxVal, charges, tipPct, customTip, people, claims, photos } = state;
  const setItems = (v) => setState(s => ({ ...s, items: typeof v === "function" ? v(s.items) : v }));
  const setTaxVal = (v) => setState(s => ({ ...s, taxVal: v }));
  const setCharges = (v) => setState(s => ({ ...s, charges: typeof v === "function" ? v(s.charges) : v }));
  const setTipPct = (v) => setState(s => ({ ...s, tipPct: v }));
  const setCustomTip = (v) => setState(s => ({ ...s, customTip: v }));
  const setPeople = (v) => setState(s => ({ ...s, people: typeof v === "function" ? v(s.people) : v }));
  const setClaims = (v) => setState(s => ({ ...s, claims: typeof v === "function" ? v(s.claims) : v }));
  const setPhotos = (v) => setState(s => ({ ...s, photos: typeof v === "function" ? v(s.photos) : v }));

  const tax = parseFloat(taxVal) || 0;
  const totalCharges = charges.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const validItems = items.filter(i => i.name.trim() && parseFloat(i.price) > 0);
  const activeTip = customTip !== "" ? (parseFloat(customTip) || 0) : tipPct;

  // ── Helpers ──
  const updateItem = (id, f, v) => setItems(items.map(i => i.id === id ? { ...i, [f]: v } : i));
  const addRow = () => setItems([...items, { id: uid(), name: "", price: "" }]);
  const removeRow = (id) => {
    if (items.length <= 1) { setItems([{ id: uid(), name: "", price: "" }]); return; }
    setItems(items.filter(i => i.id !== id));
    setClaims(c => { const nc = { ...c }; delete nc[id]; return nc; });
  };
  const addCharge = () => setCharges([...charges, { id: uid(), name: "", amount: "" }]);
  const updateCharge = (id, f, v) => setCharges(charges.map(c => c.id === id ? { ...c, [f]: v } : c));
  const removeCharge = (id) => setCharges(charges.filter(c => c.id !== id));
  const addPerson = () => setPeople([...people, { id: uid(), name: `Person ${people.length + 1}`, ci: people.length % COLORS.length }]);
  const renamePerson = (pid, name) => setPeople(people.map(p => p.id === pid ? { ...p, name } : p));
  const removePerson = (pid) => {
    if (people.length <= 2) return;
    setPeople(people.filter(p => p.id !== pid));
    setClaims(c => { const nc = { ...c }; Object.keys(nc).forEach(k => delete nc[k][pid]); return nc; });
    if (active === pid) setActive(people.find(p => p.id !== pid)?.id || null);
  };
  const toggle = (itemId) => {
    if (!active) return;
    setClaims(c => {
      const nc = { ...c };
      if (!nc[itemId]) nc[itemId] = {};
      else nc[itemId] = { ...nc[itemId] };
      if (nc[itemId][active]) delete nc[itemId][active];
      else nc[itemId][active] = true;
      return nc;
    });
  };

  // ── FULL RESET when starting fresh ──
  const startFresh = (action) => {
    // Revoke old photo URLs to free memory
    photos.forEach(p => URL.revokeObjectURL(p.url));
    setState(freshState());
    setActive(null);
    setPhotoExpanded(false);
    // Then trigger the action
    setTimeout(() => action(), 0);
  };

  const handleNewPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const url = URL.createObjectURL(file);
    setPhotos([{ id: uid(), url }]);
    setStep("entry");
  };

  // ── Add additional photo to existing bill (long receipt) ──
  const handleAddPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const url = URL.createObjectURL(file);
    setPhotos(p => [...p, { id: uid(), url }]);
  };

  const removePhoto = (pid) => {
    setPhotos(p => {
      const target = p.find(x => x.id === pid);
      if (target) URL.revokeObjectURL(target.url);
      return p.filter(x => x.id !== pid);
    });
  };

  const goCamera = () => startFresh(() => camRef.current?.click());
  const goGallery = () => startFresh(() => galRef.current?.click());
  const goManual = () => startFresh(() => setStep("entry"));
  const goNewBill = () => { startFresh(() => setStep("home")); };

  const getShares = () => {
    const sub = validItems.reduce((s, i) => s + parseFloat(i.price), 0);
    const taxR = sub > 0 ? tax / sub : 0;
    const chargeR = sub > 0 ? totalCharges / sub : 0;
    const tipAmt = sub * (activeTip / 100);
    return people.map(p => {
      let pSub = 0; const pItems = [];
      validItems.forEach(it => {
        const cl = claims[it.id] || {};
        if (cl[p.id]) {
          const n = Object.keys(cl).length;
          const share = parseFloat(it.price) / n;
          pSub += share;
          pItems.push({ name: it.name, share, split: n });
        }
      });
      const pTax = pSub * taxR;
      const pCh = pSub * chargeR;
      const pTip = sub > 0 ? (pSub / sub) * tipAmt : 0;
      return { person: p, items: pItems, sub: pSub, tax: pTax, charges: pCh, tip: pTip, total: pSub + pTax + pCh + pTip };
    });
  };

  // ═══════════ HOME ═══════════
  if (step === "home") {
    return (
      <div style={S.page}><div style={S.hero}>
        <div style={{ fontSize: 56 }}>🧾</div>
        <h1 style={S.h1}>Split the Bill</h1>
        <p style={S.hint}>Snap a photo and enter what everyone ordered</p>
        <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={handleNewPhoto} style={{ display: "none" }} />
        <input ref={galRef} type="file" accept="image/*" onChange={handleNewPhoto} style={{ display: "none" }} />
        <button style={S.bigBtn} onClick={goCamera}>📸 Take Photo of Receipt</button>
        <button style={{ ...S.bigBtn, background: "#fff", color: "#2C2420", border: "2px solid #E8E2DA" }} onClick={goGallery}>🖼️ Upload Photo</button>
        <button style={{ ...S.bigBtn, background: "#3A9A6B" }} onClick={goManual}>✏️ Enter Manually</button>
        <p style={{ fontSize: 11, color: "#bbb", marginTop: 12, maxWidth: 260 }}>Each new bill starts fresh — no leftover items from past splits</p>
      </div></div>
    );
  }

  // ═══════════ ENTRY ═══════════
  if (step === "entry") {
    return (
      <div style={S.page}>
        <div style={S.topBar}>
          <span onClick={() => setStep("home")} style={{ ...S.pill, background: "#E8E2DA", color: "#2C2420" }}>← Home</span>
          <b style={{ fontSize: 17 }}>Enter Items</b>
          <div style={{ width: 60 }} />
        </div>

        <input ref={camAddRef} type="file" accept="image/*" capture="environment" onChange={handleAddPhoto} style={{ display: "none" }} />

        <div style={{ padding: "0 16px 200px" }}>
          {/* ─── Photos section ─── */}
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            {photos.length > 0 ? (
              <>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {photos.map((ph, idx) => (
                    <div key={ph.id} onClick={() => setPhotoExpanded(ph.id)} style={{
                      flexShrink: 0, position: "relative", cursor: "pointer",
                      borderRadius: 12, overflow: "hidden", border: "2px solid #E8E2DA",
                      width: 90, height: 110,
                    }}>
                      <img src={ph.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{
                        position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.6)",
                        color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8,
                      }}>{idx + 1}/{photos.length}</div>
                      <span onClick={(e) => { e.stopPropagation(); removePhoto(ph.id); }} style={{
                        position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.7)",
                        color: "#fff", fontSize: 14, width: 20, height: 20, borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                      }}>×</span>
                    </div>
                  ))}
                  <button onClick={() => camAddRef.current?.click()} style={{
                    flexShrink: 0, width: 90, height: 110, borderRadius: 12,
                    border: "2px dashed #3A7BD5", background: "#E8F0FF", color: "#3A7BD5",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  }}>
                    <div style={{ fontSize: 24 }}>📸</div>
                    <div>Add Page</div>
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#8A8078", margin: "4px 0 0", textAlign: "center" }}>
                  Tap a photo to expand · Add more pages if your receipt is long
                </p>
              </>
            ) : (
              <button onClick={() => camAddRef.current?.click()} style={{
                ...S.addBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: "#E8F0FF", borderColor: "#3A7BD5", color: "#3A7BD5",
              }}>📸 Take Photo for Reference</button>
            )}
          </div>

          {/* ─── Expanded photo modal ─── */}
          {photoExpanded && (
            <div onClick={() => setPhotoExpanded(false)} style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.92)", zIndex: 100,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20, cursor: "pointer",
            }}>
              <img src={photos.find(p => p.id === photoExpanded)?.url} alt=""
                style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
              <span style={{
                position: "absolute", top: 20, right: 20, background: "#fff",
                width: 36, height: 36, borderRadius: 18, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 20,
                fontWeight: 700, color: "#000",
              }}>×</span>
            </div>
          )}

          {/* ─── Items ─── */}
          <label style={S.label}>Items</label>
          {items.map((it, idx) => (
            <div key={it.id} style={S.row}>
              <div style={S.num}>{idx + 1}</div>
              <input placeholder="Item name" value={it.name} onChange={e => updateItem(it.id, "name", e.target.value)} style={{ ...S.inp, flex: 2 }} />
              <div style={{ position: "relative", flex: 1 }}>
                <span style={S.dollar}>$</span>
                <input placeholder="0.00" type="number" inputMode="decimal" step="0.01"
                  value={it.price} onChange={e => updateItem(it.id, "price", e.target.value)}
                  style={{ ...S.inp, textAlign: "right", width: "100%", paddingLeft: 16 }} />
              </div>
              <span onClick={() => removeRow(it.id)} style={S.x}>×</span>
            </div>
          ))}
          <button onClick={addRow} style={S.addBtn}>+ Add Item</button>

          {/* ─── Tax ─── */}
          <label style={{ ...S.label, marginTop: 20 }}>Tax (from bill)</label>
          <div style={{ ...S.row, background: "#FFF8F0", borderColor: "#E8D8C8" }}>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>Total Tax</div>
            <div style={{ position: "relative" }}>
              <span style={{ ...S.dollar, left: 8 }}>$</span>
              <input placeholder="0.00" type="number" inputMode="decimal" step="0.01"
                value={taxVal} onChange={e => setTaxVal(e.target.value)}
                style={{ ...S.inp, width: 100, textAlign: "right", paddingLeft: 20, fontSize: 16, fontWeight: 600 }} />
            </div>
          </div>

          {/* ─── Charges ─── */}
          <label style={{ ...S.label, marginTop: 20 }}>Additional Charges</label>
          <p style={{ fontSize: 12, color: "#8A8078", margin: "-4px 0 8px" }}>Kitchen staff, service charge, etc.</p>
          {charges.map(ch => (
            <div key={ch.id} style={{ ...S.row, background: "#FFF8F0", borderColor: "#E8D8C8" }}>
              <input placeholder="e.g. Kitchen staff" value={ch.name} onChange={e => updateCharge(ch.id, "name", e.target.value)} style={{ ...S.inp, flex: 2 }} />
              <div style={{ position: "relative", flex: 1 }}>
                <span style={S.dollar}>$</span>
                <input placeholder="0.00" type="number" inputMode="decimal" step="0.01"
                  value={ch.amount} onChange={e => updateCharge(ch.id, "amount", e.target.value)}
                  style={{ ...S.inp, textAlign: "right", width: "100%", paddingLeft: 16 }} />
              </div>
              <span onClick={() => removeCharge(ch.id)} style={S.x}>×</span>
            </div>
          ))}
          <button onClick={addCharge} style={S.addBtn}>+ Add Charge</button>

          {/* ─── People ─── */}
          <label style={{ ...S.label, marginTop: 20 }}>Who's splitting?</label>
          {people.map(p => {
            const c = COLORS[p.ci % COLORS.length];
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: c.bg, flexShrink: 0 }} />
                <input value={p.name} onChange={e => renamePerson(p.id, e.target.value)}
                  placeholder="Name"
                  style={{ ...S.inp, flex: 1, border: "1px solid #E8E2DA", borderRadius: 10, padding: "8px 12px" }} />
                {people.length > 2 && <span onClick={() => removePerson(p.id)} style={S.x}>×</span>}
              </div>
            );
          })}
          <button onClick={addPerson} style={{ ...S.addBtn, marginTop: 4 }}>+ Add Person</button>
        </div>

        <div style={S.bottomBar}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#8A8078", marginBottom: 8 }}>
            <span>{validItems.length} item{validItems.length !== 1 ? "s" : ""} · {people.length} people</span>
            <span>Subtotal {money(validItems.reduce((s, i) => s + (parseFloat(i.price) || 0), 0))}</span>
          </div>
          <button onClick={() => { if (validItems.length === 0) return; setActive(people[0].id); setStep("assign"); }}
            disabled={validItems.length === 0}
            style={{ ...S.bigBtn, opacity: validItems.length === 0 ? 0.4 : 1 }}>
            Next: Claim Items →
          </button>
        </div>
      </div>
    );
  }

  // ═══════════ ASSIGN ═══════════
  if (step === "assign") {
    const sub = validItems.reduce((s, i) => s + parseFloat(i.price), 0);
    const tipAmt = sub * (activeTip / 100);
    return (
      <div style={S.page}>
        <div style={S.topBar}>
          <span onClick={() => setStep("entry")} style={{ ...S.pill, background: "#E8E2DA", color: "#2C2420" }}>← Edit</span>
          <b style={{ fontSize: 17 }}>Tap Your Items</b>
          <span onClick={() => setStep("summary")} style={S.pill}>Done →</span>
        </div>

        {/* People — editable inline */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #E8E2DA", display: "flex", gap: 6, overflowX: "auto", alignItems: "center" }}>
          {people.map(p => {
            const c = COLORS[p.ci % COLORS.length]; const on = active === p.id;
            return (
              <div key={p.id} onClick={() => setActive(p.id)} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "7px 12px",
                borderRadius: 20, border: `2px solid ${c.bg}`,
                background: on ? c.bg : c.lt,
                cursor: "pointer", whiteSpace: "nowrap",
                transform: on ? "scale(1.05)" : "scale(1)", transition: "all 0.15s",
              }}>
                <input
                  value={p.name}
                  onChange={(e) => renamePerson(p.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Name"
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    fontSize: 14, fontWeight: 700, padding: 0, fontFamily: "inherit",
                    color: on ? "#fff" : c.bg,
                    width: `${Math.max(p.name.length, 3) * 9 + 4}px`,
                    minWidth: 30,
                  }}
                />
                {people.length > 2 && (
                  <span onClick={(e) => { e.stopPropagation(); removePerson(p.id); }}
                    style={{ cursor: "pointer", opacity: 0.7, fontSize: 14, color: on ? "#fff" : c.bg, marginLeft: 2 }}>×</span>
                )}
              </div>
            );
          })}
          <button onClick={addPerson} style={{
            width: 32, height: 32, borderRadius: 16, border: "2px dashed #E8E2DA",
            background: "transparent", fontSize: 18, color: "#8A8078", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>+</button>
        </div>
        <p style={{ fontSize: 12, color: "#8A8078", textAlign: "center", margin: "8px 0 4px" }}>
          Select <b>{people.find(p => p.id === active)?.name}</b>, then tap what they ordered
        </p>

        <div style={{ padding: "4px 16px 230px" }}>
          {validItems.map(it => {
            const cl = claims[it.id] || {}; const mine = cl[active];
            const claimers = Object.keys(cl); const n = claimers.length;
            return (
              <button key={it.id} onClick={() => toggle(it.id)} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "14px 16px", borderRadius: 14, marginBottom: 6,
                border: `2px solid ${mine ? "#E86A33" : "#E8E2DA"}`,
                background: mine ? "#FFF0E8" : "#fff", cursor: "pointer",
                fontFamily: "inherit", textAlign: "left", transition: "all 0.12s",
              }}>
                {mine
                  ? <div style={{ width: 24, height: 24, borderRadius: 7, background: "#E86A33", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>✓</div>
                  : <div style={{ width: 24, height: 24, borderRadius: 7, border: "2px solid #E8E2DA", flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{it.name}</div>
                  {n > 1 && <div style={{ fontSize: 11, color: "#8A8078" }}>Split {n} ways → {money(parseFloat(it.price) / n)} each</div>}
                  {n > 0 && <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
                    {claimers.map(cid => {
                      const cp = people.find(pp => pp.id === cid); if (!cp) return null;
                      return <span key={cid} style={{ fontSize: 10, background: COLORS[cp.ci % COLORS.length].bg, color: "#fff", padding: "1px 6px", borderRadius: 8 }}>{cp.name}</span>;
                    })}
                  </div>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{money(parseFloat(it.price))}</div>
              </button>
            );
          })}
        </div>

        <div style={{ ...S.bottomBar, background: "#fff", borderTop: "1px solid #E8E2DA", paddingTop: 10 }}>
          <div style={S.fRow}><span>Subtotal</span><span>{money(sub)}</span></div>
          <div style={S.fRow}><span>Tax</span><span>{money(tax)}</span></div>
          {totalCharges > 0 && <div style={S.fRow}><span>Charges</span><span>{money(totalCharges)}</span></div>}
          <div style={S.fRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span>Tip</span>
              {[15, 18, 20, 25].map(p => (
                <button key={p} onClick={() => { setTipPct(p); setCustomTip(""); }} style={{
                  padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  border: "1px solid #E8E2DA", cursor: "pointer", fontFamily: "inherit",
                  background: customTip === "" && tipPct === p ? "#E86A33" : "transparent",
                  color: customTip === "" && tipPct === p ? "#fff" : "#2C2420",
                }}>{p}%</button>
              ))}
              <input placeholder="__%" type="number" inputMode="decimal" value={customTip}
                onChange={e => setCustomTip(e.target.value)}
                style={{ width: 48, padding: "3px 4px", borderRadius: 6, border: "1px solid #E8E2DA", fontSize: 11, textAlign: "center", fontFamily: "inherit", outline: "none" }} />
            </div>
            <span>{money(tipAmt)}</span>
          </div>
          <div style={{ ...S.fRow, fontWeight: 700, fontSize: 16, borderTop: "2px solid #2C2420", paddingTop: 6, marginTop: 4 }}>
            <span>Total</span><span>{money(sub + tax + totalCharges + tipAmt)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ SUMMARY ═══════════
  if (step === "summary") {
    const shares = getShares();
    const sub = validItems.reduce((s, i) => s + parseFloat(i.price), 0);
    const tipAmt = sub * (activeTip / 100);
    const grand = sub + tax + totalCharges + tipAmt;
    return (
      <div style={S.page}>
        <div style={S.topBar}>
          <span onClick={() => setStep("assign")} style={{ ...S.pill, background: "#E8E2DA", color: "#2C2420" }}>← Back</span>
          <b style={{ fontSize: 17 }}>Who Owes What</b>
          <div style={{ width: 50 }} />
        </div>
        <div style={{ padding: "8px 16px 120px" }}>
          {shares.map(sh => {
            const c = COLORS[sh.person.ci % COLORS.length];
            return (
              <div key={sh.person.id} style={{ background: "#fff", borderRadius: 16, padding: 18, marginBottom: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: `4px solid ${c.bg}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 18, color: c.bg }}>{sh.person.name}</span>
                  <span style={{ fontWeight: 800, fontSize: 24 }}>{money(sh.total)}</span>
                </div>
                {sh.items.length === 0
                  ? <p style={{ color: "#8A8078", fontSize: 13 }}>No items claimed</p>
                  : <>
                    {sh.items.map((ci, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                        <span>{ci.name}{ci.split > 1 && <span style={{ color: "#8A8078" }}> (÷{ci.split})</span>}</span>
                        <span style={{ fontWeight: 600 }}>{money(ci.share)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: "1px solid #E8E2DA", marginTop: 8, paddingTop: 6 }}>
                      {[["Items", sh.sub], ["Tax", sh.tax], ...(totalCharges > 0 ? [["Charges", sh.charges]] : []), [`Tip (${activeTip}%)`, sh.tip]].map(([l, v]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8A8078", padding: "1px 0" }}>
                          <span>{l}</span><span>{money(v)}</span>
                        </div>
                      ))}
                    </div>
                  </>}
              </div>
            );
          })}
          <div style={{ background: "#E8F5EE", borderRadius: 14, padding: 14, fontSize: 13, marginTop: 6 }}>
            <div style={{ fontSize: 11, color: "#8A8078", marginBottom: 4 }}>Verification</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>All shares</span><span style={{ fontWeight: 700 }}>{money(shares.reduce((s, x) => s + x.total, 0))}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Bill + {activeTip}% tip</span><span style={{ fontWeight: 700 }}>{money(grand)}</span></div>
          </div>
        </div>
        <div style={S.bottomBar}>
          <button onClick={goNewBill} style={S.bigBtn}>🧾 New Bill (Reset)</button>
        </div>
      </div>
    );
  }
}

const S = {
  page: { minHeight: "100vh", background: "#FAF6F0", fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#2C2420", maxWidth: 480, margin: "0 auto" },
  hero: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "85vh", padding: "40px 24px", textAlign: "center" },
  h1: { fontSize: 28, fontWeight: 800, margin: "4px 0 4px", letterSpacing: -0.5 },
  hint: { fontSize: 14, color: "#8A8078", margin: "0 0 24px" },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: "#8A8078", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, border: "2px solid #E8E2DA", marginBottom: 6, background: "#fff" },
  num: { width: 22, height: 22, borderRadius: 11, background: "#E8E2DA", color: "#8A8078", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  inp: { border: "none", outline: "none", fontSize: 15, fontFamily: "inherit", padding: "4px 0", background: "transparent", minWidth: 0 },
  dollar: { position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#8A8078", pointerEvents: "none" },
  x: { cursor: "pointer", color: "#8A8078", fontSize: 20, padding: "0 4px", lineHeight: 1 },
  addBtn: { width: "100%", padding: 12, borderRadius: 12, border: "2px dashed #E8E2DA", background: "transparent", color: "#8A8078", fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  bigBtn: { width: "100%", padding: "16px 24px", borderRadius: 16, border: "none", background: "#E86A33", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  bottomBar: { position: "fixed", bottom: 0, left: 0, right: 0, padding: "10px 16px 20px", maxWidth: 480, margin: "0 auto", background: "#FAF6F0", borderTop: "1px solid #E8E2DA", zIndex: 10 },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", position: "sticky", top: 0, background: "#FAF6F0", zIndex: 10, borderBottom: "1px solid #E8E2DA" },
  pill: { padding: "7px 14px", borderRadius: 18, border: "none", background: "#E86A33", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  fRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "3px 0" },
};
