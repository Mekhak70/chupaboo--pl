"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { polandAdminConfigured, polandSupabase } from "@/lib/poland-supabase";
import { isSiteAdmin } from "@/lib/site-admin";

export default function AdminPasswordPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const adminPath = `/${locale}/admin`;
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (polandAdminConfigured) {
        const { data } = await polandSupabase.auth.getUser();
        if (!active) return;
        if (isSiteAdmin(data.user)) {
          setAllowed(true);
          return;
        }
      }
      if (active) router.replace(`${adminPath}/login`);
    }

    void verify().catch(() => {
      if (active) setError("Չհաջողվեց ստուգել մուտքը։ Թարմացրու էջը և նորից փորձիր։");
    });
    return () => { active = false; };
  }, [adminPath, router]);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !allowed || saved) return;
    setError("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password") ?? "");

    if (password.length < 12 || password !== fields.get("confirmation")) {
      setError("Գաղտնաբառը պետք է ունենա առնվազն 12 նիշ։ Երկու դաշտերում գրիր նույն գաղտնաբառը։");
      return;
    }

    saving.current = true;
    setBusy(true);
    try {
      const { data } = await polandSupabase.auth.getUser();
      if (!isSiteAdmin(data.user)) {
        router.replace(`${adminPath}/login`);
        return;
      }
      const { error: updateError } = await polandSupabase.auth.updateUser({ password });
      if (updateError) {
        setError("Չհաջողվեց պահել գաղտնաբառը։ Ընտրիր այլ գաղտնաբառ կամ նորից մուտք գործիր էլփոստի հղումով։");
        return;
      }
      form.reset();
      setSaved(true);
    } catch {
      setError("Միացման սխալ։ Կրկին փորձիր։");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const input = "mt-2 w-full rounded-xl border border-purple-200 px-4 py-3 text-gray-900";
  return (
    <main className="min-h-screen bg-[#f8f6fb] px-4 py-12">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#69429a]">Սահմանել գաղտնաբառ</h1>
        {!allowed && !error && <p role="status" className="mt-4">Ստուգում ենք մուտքը…</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {saved && <p role="status" className="mt-4 text-green-800">Գաղտնաբառը պահպանված է։</p>}
        {allowed && !saved && (
          <form onSubmit={savePassword} className="mt-5 space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <label className="block">Նոր գաղտնաբառ
                <input name="password" type="password" autoComplete="new-password" minLength={12} required className={input} />
              </label>
              <label className="block">Կրկնիր նոր գաղտնաբառը
                <input name="confirmation" type="password" autoComplete="new-password" minLength={12} required className={input} />
              </label>
            </fieldset>
            <button type="submit" disabled={busy} className="rounded-xl bg-[#69429a] px-5 py-3 font-semibold text-white">
              {busy ? "Պահպանվում է…" : "Պահպանել"}
            </button>
          </form>
        )}
        <Link href={adminPath} className="mt-5 inline-block font-semibold text-[#69429a] underline">Վերադառնալ ադմին</Link>
      </section>
    </main>
  );
}
