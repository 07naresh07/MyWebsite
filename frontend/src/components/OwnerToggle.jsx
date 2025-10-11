import { useState } from "react";
import { useOwnerMode, signInOwner, signOutOwner } from "../lib/owner.js";
import { apiUrl } from "../lib/api.js";

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
        // Enhanced error handling for specific status codes
        let errorMsg = "";
        
        if (res.status === 401) {
          errorMsg = "❌ Invalid passphrase. Please try again.";
        } else if (res.status === 422) {
          errorMsg = "⚠️ Request format error. Please check your input.";
        } else if (res.status === 403) {
          errorMsg = "🔒 Owner authentication not configured on server.";
        } else if (res.status >= 500) {
          errorMsg = "❌ Server error. Please try again later.";
        } else {
          errorMsg = typeof body === "string" && body
            ? body
            : (body && body.detail) || `${res.status} ${res.statusText}`;
        }
        
        throw new Error(errorMsg);
      }

      const token = body?.token;
      if (!token) {
        throw new Error("⚠️ No authentication token received from server");
      }

      // Verify token has correct role before storing
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== "owner") {
          throw new Error("⚠️ Invalid token role. Expected 'owner' role.");
        }
        console.log("✅ Owner authentication successful");
      } catch (parseErr) {
        console.warn("⚠️ Could not verify token payload:", parseErr);
        // Continue anyway - backend will validate
      }

      // Store token using the lib function
      signInOwner(token);
      
      // Clear form and close modal
      setPass("");
      setOpen(false);
      setErr("");
      
      console.log("🔓 Owner mode activated");
    } catch (ex) {
      console.error("❌ Owner login failed:", ex);
      setErr(ex?.message || "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    setPass("");
    setErr("");
    setShow(false);
  }

  function handleSignOut() {
    if (window.confirm("Sign out of owner mode?")) {
      signOutOwner();
      console.log("🔒 Owner mode deactivated");
    }
  }

  return (
    <>
      {owner ? (
        <button
          type="button"
          onClick={handleSignOut}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium
                      border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 
                      transition-colors shadow-sm ${className}`}
          title="Owner mode active (click to sign out)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               className="text-emerald-600">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
          <span className="font-semibold">Owner</span>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium
                        border-slate-300 bg-white text-slate-700 hover:bg-slate-50 
                        transition-colors shadow-sm ${className}`}
            title="Viewer mode (click to sign in as owner)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 className="text-slate-500">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            <span className="font-semibold">Viewer</span>
          </button>

          {open && (
            <div 
              className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-sm p-4" 
              role="dialog" 
              aria-modal="true"
              onClick={handleCancel}
            >
              <div 
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                         className="text-indigo-600">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900">Owner Sign-In</h2>
                    <p className="text-sm text-slate-500">Unlock edit mode</p>
                  </div>
                </div>
                
                <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  ℹ️ Enter your admin passphrase to access editing features and manage locked entries.
                </p>

                <form onSubmit={submit} className="mt-5 space-y-4">
                  <div className="relative">
                    <label htmlFor="owner-pass" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Passphrase
                    </label>
                    <input
                      id="owner-pass"
                      type={show ? "text" : "password"}
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 pr-11 
                                focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200
                                transition-colors"
                      placeholder="Enter passphrase"
                      autoFocus
                      autoComplete="current-password"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-[38px] -translate-y-1/2 text-slate-400 hover:text-slate-600 
                                transition-colors p-1 rounded"
                      onClick={() => setShow(s => !s)}
                      title={show ? "Hide passphrase" : "Show passphrase"}
                      aria-label={show ? "Hide passphrase" : "Show passphrase"}
                      disabled={busy}
                    >
                      {show ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12a21.8 21.8 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a21.77 21.77 0 0 1-2.35 3.94M14 14.12A3 3 0 0 1 9.88 10" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {err && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg animate-in slide-in-from-top-2 duration-200">
                      <p className="text-sm text-red-800 font-medium">{err}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={busy}
                      className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold 
                                text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={!pass || busy}
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold
                                text-white bg-indigo-600 hover:bg-indigo-700 transition-colors
                                disabled:opacity-50 disabled:cursor-not-allowed
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300
                                shadow-sm hover:shadow-md"
                    >
                      {busy ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Authenticating...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                            <polyline points="10 17 15 12 10 7"/>
                            <line x1="15" y1="12" x2="3" y2="12"/>
                          </svg>
                          Sign In
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