import { useState } from "react";
import { useOwnerMode, signInOwner, signOutOwner } from "../lib/owner.js";
import { apiUrl } from "../lib/api.js"; // to build the correct API base

export default function OwnerToggle({ className = "" }) {
  const { owner } = useOwnerMode();

  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e?.preventDefault();
    if (!pass || busy) return;
    setBusy(true);
    setErr("");

    try {
      // IMPORTANT: form-encoded with key "pass_"
      const res = await fetch(apiUrl("/api/auth/owner"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ pass_: pass }),
      });

      const body = await (async () => {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          try { return await res.json(); } catch {}
        }
        try { return await res.text(); } catch { return ""; }
      })();

      if (!res.ok) {
        // 401 = wrong pass / not configured, 422 = wrong field name / bad form
        const msg =
          typeof body === "string" && body
            ? body
            : (body && body.detail) || `${res.status} ${res.statusText}`;
        throw new Error(String(msg));
      }

      const token = body?.token;
      if (!token) throw new Error("No token received");
      signInOwner(token);
      setPass("");
      setOpen(false);
    } catch (ex) {
      setErr(ex?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {owner ? (
        <button
          type="button"
          onClick={() => signOutOwner()}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm
                      border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ${className}`}
          title="Owner mode (sign out)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               className="text-emerald-600">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
          </svg>
          Owner
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm
                        border-slate-300 bg-white text-slate-700 hover:bg-slate-50 ${className}`}
            title="Viewer mode (sign in)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 className="text-slate-500">
              <circle cx="12" cy="12" r="10"/><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2"/>
            </svg>
            Viewer
          </button>

          {open && (
            <div className="fixed inset-0 z-[100] grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true">
              <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
                <div className="text-lg font-semibold">Owner sign-in</div>
                <p className="mt-1 text-sm text-slate-600">Enter your admin passphrase to unlock edit mode.</p>

                <form onSubmit={submit} className="mt-4 space-y-3">
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={pass}
                      onChange={(e)=>setPass(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 pr-10"
                      placeholder="Passphrase"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                      onClick={()=>setShow(s=>!s)}
                      title={show ? "Hide" : "Show"}
                      aria-label={show ? "Hide passphrase" : "Show passphrase"}
                    >
                      {show ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12a21.8 21.8 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a21.77 21.77 0 0 1-2.35 3.94M14 14.12A3 3 0 0 1 9.88 10" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {err && <div className="text-sm text-red-600">{err}</div>}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={()=>{ setOpen(false); setPass(""); setErr(""); }}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={!pass || busy}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium
                                 text-white bg-indigo-600 hover:bg-indigo-700 focus-visible:outline-none
                                 focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-60"
                      title="Unlock edit mode"
                    >
                      {busy ? "Signing in…" : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="7.5" cy="11.5" r="4.5"/><path d="M10.5 11.5v-6a3 3 0 0 1 6 0v3"/>
                            <path d="M16.5 11.5l2.5 2.5"/><path d="M19 14l-2.5 2.5"/>
                          </svg>
                          Unlock
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
