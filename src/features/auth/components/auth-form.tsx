"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Shirt } from "lucide-react";

type AuthMode = "login" | "register";

export function AuthForm({ mode, authReady }: { mode: AuthMode; authReady: boolean }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const payload = isRegister
      ? {
          fullName: String(data.get("fullName") ?? ""),
          branchName: String(data.get("branchName") ?? ""),
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        }
      : {
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        };

    try {
      const response = await fetch("/api/auth/" + mode, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Permintaan gagal.");
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Koneksi gagal. Coba lagi.");
      setBusy(false);
    }
  }

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <main className="animate-page-enter flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-[420px]">
        <Link href="/" className="mb-7 inline-flex items-center gap-2.5" aria-label="LaundryOS">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Shirt size={18} strokeWidth={2.4} />
          </span>
          <span className="text-sm font-bold tracking-wide text-foreground">LaundryOS</span>
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl shadow-black/10 sm:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            {isRegister ? "Mulai gunakan LaundryOS" : "Selamat datang kembali"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {isRegister ? "Buat akun pemilik" : "Masuk ke akun"}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            {isRegister
              ? "Buat akun dan cabang pertama untuk usaha laundry kamu."
              : "Masuk untuk mengelola pesanan dan aktivitas cabang."}
          </p>

          {!authReady && (
            <div role="status" className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs leading-5 text-warning">
              Form belum aktif. Hubungkan PostgreSQL Neon dan isi AUTH_SECRET pada Vercel Preview.
            </div>
          )}

          <form className="mt-5 space-y-3.5" onSubmit={submit}>
            {isRegister && (
              <>
                <label className="block text-xs font-medium text-foreground">
                  Nama pemilik
                  <input className={fieldClass} name="fullName" type="text" autoComplete="name" minLength={2} maxLength={80} required />
                </label>
                <label className="block text-xs font-medium text-foreground">
                  Nama usaha / cabang
                  <input className={fieldClass} name="branchName" type="text" autoComplete="organization" minLength={2} maxLength={100} required />
                </label>
              </>
            )}
            <label className="block text-xs font-medium text-foreground">
              Email
              <input className={fieldClass} name="email" type="email" autoComplete="email" maxLength={254} required />
            </label>
            <label className="block text-xs font-medium text-foreground">
              Kata sandi
              <input className={fieldClass} name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 10 : 1} maxLength={128} required />
            </label>
            {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">{error}</p>}
            <button
              type="submit"
              disabled={busy || !authReady}
              aria-busy={busy}
              className="mt-1 inline-flex h-10 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <Spinner />}{busy ? "Memproses..." : !authReady ? "Menunggu koneksi database" : isRegister ? "Buat akun" : "Masuk"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted">
            {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <Link className="font-semibold text-accent hover:underline" href={isRegister ? "/login" : "/register"}>
              {isRegister ? "Masuk" : "Daftar"}
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted">
            Pelanggan laundry?{" "}
            <Link className="font-semibold text-accent hover:underline" href="/lacak">
              Lacak status pesanan
            </Link>
          </p>
          <p className="mt-4 border-t border-border pt-3 text-center text-[10px] leading-5 text-muted">
            Akun baru mendapat akses Pemilik untuk satu cabang. Data demo tidak dipakai sebagai akun.
          </p>
        </div>
      </section>
    </main>
  );
}
