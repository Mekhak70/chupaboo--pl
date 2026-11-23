"use client";

import { StandardTextPicker } from "@/components/standard-text-picker";
import { randomId } from "@/lib/random-id";
import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
    CakeSlice,
    ArrowLeft,
    LogOut,
    Loader2,
    Plus,
    ImagePlus,
} from "lucide-react";

import { polandSupabase as supabase } from "@/lib/poland-supabase";
import { DonutVariantsEditor } from "@/components/donut-variants-editor";
import { uploadDonutVariants,type DonutVariantDraft } from "@/lib/donut-variant-admin";
import { selectCatalogCover } from "@/lib/catalog-gallery";
import { CatalogGalleryInput } from "@/components/catalog-gallery-input";
import { AdminProducts } from "@/components/admin-products";
import Link from "next/link";
import { AdminIngredientPrices } from "@/components/admin-ingredient-prices";
import { AdminHomepage } from "@/components/admin-homepage";

import { isSiteAdmin } from "@/lib/site-admin";
const BUCKET = "catalog-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type Section = "cake";
type CakeSize = "MINI" | "MIDI" | "STANDARD";

type Design =
    | "STANDARD"
    | "NAME_TEXT"
    | "CUSTOM_PHOTO"
    | "CUSTOM_DESIGN";

type ProductForm = {
    name: string;
    price: string;
    donutThreePrice: string;
    cakeSize: CakeSize;
    productKind: "CAKE" | "DONUT_BOX";
    hasCream: boolean;
    designs: Design[];
    standardText: string;
    isActive: boolean;
};

const sections = [
    {
        id: "cake" as const,
        title: "Տորթեր",
        description: "Նոր տորթ, չափս և դիզայնի ընտրանքներ։",
        icon: CakeSlice,
        background: "bg-purple-50 text-[#69429a]",
    },
];

const designs: { value: Design; label: string }[] = [
    { value: "STANDARD", label: "Ստանդարտ" },
    { value: "NAME_TEXT", label: "Տորթի վրա գրվածքով" },
    { value: "CUSTOM_PHOTO", label: "Շան լուսանկարով" },
    { value: "CUSTOM_DESIGN", label: "Անհատական դիզայն" },
];

const imageExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

function emptyForm(): ProductForm {
    return {
        name: "",
        price: "",
        donutThreePrice: "10000",
        cakeSize: "MINI",
        productKind: "CAKE",
        hasCream: false,
        designs: ["STANDARD"],
        standardText: "",
        isActive: true,
    };
}

const inputClass =
    "mt-2 w-full rounded-xl border border-[#69429a]/20 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#69429a] focus:ring-2 focus:ring-[#69429a]/10";

const panelClass =
    "rounded-3xl border border-[#69429a]/10 bg-white p-5 shadow-sm md:p-7";

export default function AdminPage() {
    const router = useRouter();
    const params = useParams();

    const locale = params.locale ?? params.lang;

    const loginPath =
        typeof locale === "string"
            ? `/${locale}/admin/login`
            : "/admin/login";

    const [auth, setAuth] = useState<
        "checking" | "allowed" | "error"
    >("checking");

    const [view, setView] = useState<"catalog" | "homepage" | "ingredient-prices">("catalog");
    const [homepageBusy, setHomepageBusy] = useState(false);

    const [section, setSection] = useState<Section | null>(null);
    const [form, setForm] = useState<ProductForm>(emptyForm);

    const [image, setImage] = useState<File | null>(null);
    const [donutVariants,setDonutVariants]=useState<DonutVariantDraft[]>([]);
    const [extraImages,setExtraImages] = useState<File[]>([]);
  const [galleryMain,setGalleryMain] = useState<File|string|null>(null);
    const [preview, setPreview] = useState("");

    const [saving, setSaving] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Նոր ապրանք ավելացնելուց հետո թարմացնում ենք ցանկը։
    const [refreshVersion, setRefreshVersion] = useState(0);

    const savingRef = useRef(false);
    const logoutRef = useRef(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Մուտքի ստուգում։
    useEffect(() => {
        let active = true;
        let revision = 0;

        async function verify() {
            const current = ++revision;

            try {
                const { data, error } = await supabase.auth.getUser();

                if (!active || current !== revision) return;

                if (error || !isSiteAdmin(data.user)) {
                    setAuth("checking");
                    router.replace(loginPath);
                    return;
                }

                setAuth("allowed");
            } catch {
                if (active && current === revision) {
                    setAuth("error");
                }
            }
        }

        const { data } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (active && !isSiteAdmin(session?.user)) {
                    revision += 1;
                    setAuth("checking");
                    router.replace(loginPath);
                }
            }
        );

        void verify();

        return () => {
            active = false;
            revision += 1;
            data.subscription.unsubscribe();
        };
    }, [router, loginPath]);

    // Նկարի նախադիտում։
    useEffect(() => {
        if (!image) {
            setPreview("");
            return;
        }

        const url = URL.createObjectURL(image);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [image]);

    function change<K extends keyof ProductForm>(
        key: K,
        value: ProductForm[K]
    ) {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    function openSection(next: Section | null) {
        if (savingRef.current) return;

        setSection(next);
        setForm(emptyForm());
        setImage(null);
        setExtraImages([]);setGalleryMain(null);
        setDonutVariants([]);
        setError("");
        setSuccess("");

        if (fileRef.current) {
            fileRef.current.value = "";
        }
    }

    function chooseImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) return;

        if (
            !imageExtensions[file.type] ||
            file.size === 0 ||
            file.size > MAX_IMAGE_SIZE
        ) {
            setError(
                "Ընտրիր JPG, PNG կամ WebP նկար՝ առավելագույնը 5 MB։"
            );
            event.target.value = "";
            return;
        }

        setError("");
        setImage(file);
    }

    function toggleDesign(value: Design) {
        setForm((previous) => ({
            ...previous,
            designs: previous.designs.includes(value)
                ? previous.designs.filter((design) => design !== value)
                : [...previous.designs, value],
        }));
    }

    async function logout() {
        if (logoutRef.current || savingRef.current || homepageBusy) return;

        logoutRef.current = true;
        setLoggingOut(true);
        setError("");

        try {
            const { error } = await supabase.auth.signOut({
                scope: "local",
            });

            if (error) throw error;

            setAuth("checking");
            router.replace(loginPath);
        } catch {
            setError("Դուրս գալը չհաջողվեց։ Փորձիր կրկին։");
        } finally {
            logoutRef.current = false;
            setLoggingOut(false);
        }
    }

    async function saveProduct(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!section || savingRef.current || logoutRef.current) return;

        setError("");
        setSuccess("");

        const price = Number(form.price);
        if (!form.name.trim() || !image) {
            setError("Լրացրու անունը և ընտրիր ապրանքի նկարը։");
            return;
        }

        if (
            !form.price.trim() ||
            !Number.isFinite(price) ||
            price < 0 ||
            price > 9999999999.99
        ) {
            setError("Մուտքագրիր ճիշտ գին։");
            return;
        }

        if (form.designs.length === 0) {
            setError("Ընտրիր առնվազն մեկ դիզայնի տեսակ։");
            return;
        }

        const extension = imageExtensions[image.type];

        if (
            !extension ||
            image.size === 0 ||
            image.size > MAX_IMAGE_SIZE
        ) {
            setError("Նկարը պետք է լինի JPG/PNG/WebP և մինչև 5 MB։");
            return;
        }

        if(section === "cake" && form.productKind === "DONUT_BOX" && (!form.donutThreePrice.trim()||!Number.isFinite(Number(form.donutThreePrice))||Number(form.donutThreePrice)<0)){
            setError("Մուտքագրիր ճիշտ գին 3 դոնաթի համար։");return;
        }

        savingRef.current = true;
        setSaving(true);

        const uploadedPaths: string[] = [];
        let saved = false;

        try {
            const { data: authData, error: authError } =
                await supabase.auth.getUser();

            if (authError || !isSiteAdmin(authData.user)) {
                setAuth("checking");
                router.replace(loginPath);
                return;
            }

            const id = randomId();
            const imagePath = `catalog/${id}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(imagePath, image, {
                    contentType: image.type,
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            uploadedPaths.push(imagePath);
            const galleryPaths:string[]=[];
            {
                if(extraImages.length>9)throw new Error("Առավելագույնը 9 լրացուցիչ նկար։");
                for(const file of extraImages){
                    if(!imageExtensions[file.type]||!file.size||file.size>MAX_IMAGE_SIZE)throw new Error("Նկարը պետք է լինի JPG/PNG/WebP և մինչև 5 MB։");
                    const path=`catalog/${randomId()}.${imageExtensions[file.type]}`;
                    const {error}=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
                    if(error)throw error;
                    uploadedPaths.push(path);galleryPaths.push(path);
                }
            }

            const selectedPath=galleryMain instanceof File ? galleryPaths[extraImages.indexOf(galleryMain)] : null;
            const cover=selectCatalogCover(imagePath,galleryPaths,selectedPath);
            const savedVariants=section === "cake" && form.productKind === "DONUT_BOX" ? await uploadDonutVariants(donutVariants,uploadedPaths) : undefined;
            const { error: insertError } = await supabase.from("catalog_products").insert({
                id,
                section: "cake",
                name: form.name.trim(),
                price,
                image_path: cover.imagePath,
                additional_image_paths: cover.additionalImagePaths,
                product_kind: form.productKind,
                cake_size: form.cakeSize,
                has_cream: form.hasCream,
                design_types: form.designs,
                standard_text: form.designs.includes("STANDARD") ? form.standardText.trim() : "",
                is_active: form.isActive,
                ...(savedVariants ? { donut_variants: savedVariants, donut_three_price: Number(form.donutThreePrice) } : {}),
            });

            if (insertError) throw insertError;

            saved = true;

            setForm(emptyForm());
            setImage(null);
            setExtraImages([]);setGalleryMain(null);
        setDonutVariants([]);

            if (fileRef.current) {
                fileRef.current.value = "";
            }

            setSuccess("Ապրանքը հաջողությամբ պահպանվեց բազայում։");
            setRefreshVersion((previous) => previous + 1);
        } catch (cause) {
            setError(
                cause &&
                    typeof cause === "object" &&
                    "message" in cause
                    ? String(cause.message)
                    : "Պահպանումը չհաջողվեց։ Փորձիր կրկին։"
            );
        } finally {
            if (uploadedPaths.length && !saved) {
                try {
                    const { error: cleanupError } = await supabase.storage
                        .from(BUCKET)
                        .remove(uploadedPaths);

                    if (cleanupError) {
                        console.error("Image cleanup failed:", cleanupError);
                    }
                } catch (cleanupError) {
                    console.error("Image cleanup failed:", cleanupError);
                }
            }

            savingRef.current = false;
            setSaving(false);
        }
    }

    // Առանց ադմինի մուտքի բովանդակությունը չի ցուցադրվում։
    if (auth !== "allowed") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f8f6fb] p-6">
                <div
                    className="text-center text-[#69429a]"
                    role="status"
                >
                    {auth === "error" ? (
                        <>
                            <p>Մուտքի ստուգումը չհաջողվեց։</p>

                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="mt-4 rounded-xl bg-[#69429a] px-5 py-3 text-white"
                            >
                                Կրկին փորձել
                            </button>
                        </>
                    ) : (
                        <>
                            <Loader2 className="mx-auto h-8 w-8 animate-spin" />

                            <p className="mt-3">
                                Ստուգում ենք մուտքը...
                            </p>
                        </>
                    )}
                </div>
            </main>
        );
    }

    const selected = sections.find(
        (item) => item.id === section
    );

    return (
        <main className="min-h-screen bg-[#f8f6fb] px-4 py-8 md:px-8">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-[#69429a]">
                            CHUPABOO · ԱԴՄԻՆ
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-gray-900">
                            {view === "ingredient-prices" ? "Բաղադրիչների գներ" : view === "homepage" ? "Գլխավոր էջի կառավարում" : selected
                                ? `Ավելացնել · ${selected.title}`
                                : "Կառավարման վահանակ"}
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={logout}
                        disabled={loggingOut || saving || homepageBusy}
                        className="flex items-center gap-2 rounded-xl border border-[#69429a]/20 bg-white px-4 py-3 text-sm font-semibold text-[#69429a] transition hover:bg-purple-50 disabled:opacity-50"
                    >
                        {loggingOut ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <LogOut className="h-4 w-4" />
                        )}

                        {loggingOut
                            ? "Դուրս ենք գալիս..."
                            : "Դուրս գալ"}
                    </button>
                </header>

                {error && (
                    <p
                        role="alert"
                        className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                    >
                        {error}
                    </p>
                )}

                {success && (
                    <p
                        role="status"
                        className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
                    >
                        {success}
                    </p>
                )}

                <div className="mb-5 flex flex-wrap gap-3">
                    <Link href={`${typeof locale === "string" ? `/${locale}` : ""}/admin/password`} className="rounded-xl bg-white px-5 py-3 font-semibold text-[#69429a]">Սահմանել գաղտնաբառ</Link>
                    <Link href={`${typeof locale === "string" ? `/${locale}` : ""}/admin/expenses`} className="rounded-xl bg-white px-5 py-3 font-semibold text-[#69429a]">Ծախսեր</Link>
                    <Link href={`${typeof locale === "string" ? `/${locale}` : ""}/admin/sales`} className="rounded-xl bg-[#69429a] px-5 py-3 font-semibold text-white">Վաճառք և արդյունք</Link>
                </div>

                <nav aria-label="Ադմինի բաժիններ" className="mb-6 flex flex-wrap gap-3">
                    <button type="button" disabled={saving || loggingOut || homepageBusy}
                        onClick={() => { setView("catalog"); setError(""); setSuccess(""); }}
                        className={`rounded-xl border px-5 py-3 text-sm font-semibold disabled:opacity-50 ${view === "catalog" ? "border-[#69429a] bg-[#69429a] text-white" : "border-purple-200 bg-white text-[#69429a]"}`}>
                        Ապրանքների կառավարում
                    </button>
                    <button type="button" disabled={saving || loggingOut || homepageBusy}
                        onClick={() => { setView("homepage"); setError(""); setSuccess(""); }}
                        className={`rounded-xl border px-5 py-3 text-sm font-semibold disabled:opacity-50 ${view === "homepage" ? "border-[#69429a] bg-[#69429a] text-white" : "border-purple-200 bg-white text-[#69429a]"}`}>
                        Գլխավոր էջ · Սլայդեր և հարցեր
                    </button>
                    <button type="button" disabled={saving || loggingOut || homepageBusy} onClick={()=>{setView("ingredient-prices");setError("");setSuccess("");}} className={`rounded-xl border px-5 py-3 text-sm font-semibold disabled:opacity-50 ${view === "ingredient-prices"?"border-[#69429a] bg-[#69429a] text-white":"border-purple-200 bg-white text-[#69429a]"}`}>Բաղադրիչների գներ</button>
                </nav>

                {view === "ingredient-prices" ? <fieldset disabled={loggingOut}><AdminIngredientPrices onBusyChange={setHomepageBusy}/></fieldset> : view === "homepage" ? (
                    <fieldset disabled={loggingOut} className="min-w-0 border-0 p-0">
                        <AdminHomepage initialLanguage={typeof locale === "string" ? locale : "hy"} onBusyChange={setHomepageBusy} />
                    </fieldset>
                ) : (
                <>
                {/* Add product */}
                {!section ? (
                    <div className="grid gap-5 md:grid-cols-3">
                        {sections.map((item) => {
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => openSection(item.id)}
                                    disabled={loggingOut}
                                    className={`${panelClass} text-left transition hover:-translate-y-1 hover:shadow-lg disabled:opacity-50`}
                                >
                                    <span
                                        className={`inline-flex rounded-2xl p-4 ${item.background}`}
                                    >
                                        <Icon className="h-7 w-7" />
                                    </span>

                                    <h2 className="mt-5 text-xl font-bold text-gray-900">
                                        {item.title}
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-gray-500">
                                        {item.description}
                                    </p>

                                    <span className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#69429a]">
                                        <Plus className="h-4 w-4" />
                                        Ավելացնել
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => openSection(null)}
                            disabled={saving || loggingOut}
                            className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#69429a] disabled:opacity-50"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Բոլոր բաժինները
                        </button>

                        <form onSubmit={saveProduct} onInvalidCapture={event=>{
            const field=event.target as HTMLInputElement;
            const label=field.labels?.[0]?.textContent?.trim();
            setError(label?`Լրացրու կամ ուղղիր «${label}» դաշտը։`:"Լրացրու բոլոր պարտադիր դաշտերը և ստուգիր թվերի արժեքները։");
          }}>
                            <fieldset
                                disabled={saving || loggingOut}
                                className="grid min-w-0 gap-6 disabled:opacity-70 lg:grid-cols-[1fr_320px]"
                            >
                                <section className={panelClass}>
                                    <h2 className="mb-6 text-lg font-bold text-gray-900">
                                        Ապրանքի տվյալներ
                                    </h2>

                                    <div className="space-y-5">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Անուն *
                                            <input
                                                required
                                                maxLength={200}
                                                value={form.name}
                                                onChange={(event) =>
                                                    change("name", event.target.value)
                                                }
                                                className={inputClass}
                                                placeholder="Ապրանքի անունը"
                                            />
                                        </label>

                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Արժեք · ֏ *
                                                <input
                                                    required
                                                    type="number"
                                                    min="0"
                                                    max="9999999999.99"
                                                    step="0.01"
                                                    value={form.price}
                                                    onChange={(event) =>
                                                        change("price", event.target.value)
                                                    }
                                                    className={inputClass}
                                                />
                                            </label>

                                            {section === "cake" && <label className="block text-sm font-medium text-gray-700">
                                                Ապրանքի ձևաչափը
                                                <select value={form.productKind} onChange={event => {change("productKind", event.target.value as ProductForm["productKind"]);if(event.target.value === "DONUT_BOX" && !form.price)change("price","3500");}} className={inputClass}>
                                                    <option value="CAKE">Տորթ</option>
                                                    <option value="DONUT_BOX">Դոնաթի բոքս · 2, 4 կամ 6 հատ</option>
                                                </select>
                                                {form.productKind === "DONUT_BOX" && <span className="mt-2 block text-xs">Նշիր մեկ դոնաթի գինը և 3 հատի փաթեթի գինը։ Ամեն 3-ը հաշվարկվում է փաթեթով, մնացածը՝ հատով։</span>}
                                            </label>}

                                            {section === "cake" && form.productKind === "DONUT_BOX" && <div className="sm:col-span-2"><DonutVariantsEditor value={donutVariants} onChange={setDonutVariants}/></div>}

                                            {section === "cake" && form.productKind === "DONUT_BOX" && <label className="block text-sm font-medium text-gray-700">
                                                3 դոնաթի փաթեթի բազային գին · ֏
                                                <input required type="number" min="0" step="0.01" value={form.donutThreePrice} onChange={event=>change("donutThreePrice",event.target.value)} className={inputClass}/>
                                                <span className="mt-1 block text-xs">Վերևի արժեքի դաշտում նշիր մեկ դոնաթի գինը։</span>
                                            </label>}

                                                <label className="block text-sm font-medium text-gray-700">
                                                    Տորթի տեսակը
                                                    <select
                                                        value={form.cakeSize}
                                                        onChange={(event) =>
                                                            change(
                                                                "cakeSize",
                                                                event.target.value as CakeSize
                                                            )
                                                        }
                                                        className={inputClass}
                                                    >
                                                        <option value="MINI">
                                                            Մինի
                                                        </option>

                                                        <option value="MIDI">
                                                            Միդի
                                                        </option>

                                                        <option value="STANDARD">
                                                            Ստանդարտ
                                                        </option>
                                                    </select>
                                                </label>
                                        </div>

                                                <label className="flex items-center gap-3 rounded-xl bg-[#f8f6fb] p-4 text-sm font-medium text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.hasCream}
                                                        onChange={(event) =>
                                                            change(
                                                                "hasCream",
                                                                event.target.checked
                                                            )
                                                        }
                                                        className="h-4 w-4 accent-[#69429a]"
                                                    />
                                                    Կրեմ ունի
                                                </label>

                                                <fieldset>
                                                    <legend className="text-sm font-semibold text-gray-800">
                                                        Դիզայնի տեսակներ *
                                                    </legend>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Կարող ես ընտրել մի քանի տարբերակ։
                                                    </p>

                                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                        {designs
                                                            .filter(
                                                                (design) =>
                                                                    section === "cake" ||
                                                                    design.value !==
                                                                    "CUSTOM_DESIGN"
                                                            )
                                                            .map((design) => (
                                                                <label
                                                                    key={design.value}
                                                                    className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${form.designs.includes(
                                                                        design.value
                                                                    )
                                                                            ? "border-[#69429a] bg-purple-50 text-[#69429a]"
                                                                            : "border-gray-200 text-gray-600"
                                                                        }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={form.designs.includes(
                                                                            design.value
                                                                        )}
                                                                        onChange={() =>
                                                                            toggleDesign(
                                                                                design.value
                                                                            )
                                                                        }
                                                                        className="h-4 w-4 accent-[#69429a]"
                                                                    />

                                                                    {design.label}
                                                                </label>
                                                            ))}
                                                    </div>
                                                </fieldset>



                                                {section === "cake" && form.productKind !== "DONUT_BOX" && <StandardTextPicker value={form.designs[0]??""} onChange={value=>change("designs",[value,...form.designs.filter(design=>design!==value)])}/>}
                                    </div>
                                </section>

                                <aside className="space-y-6">
                                    <section className={panelClass}>
                                        <h2 className="font-bold text-gray-900">
                                            Ապրանքի լուսանկար *
                                        </h2>

                                        <button
                                            type="button"
                                            onClick={() => fileRef.current?.click()}
                                            disabled={saving || loggingOut}
                                            aria-label={image ? "Փոխել ապրանքի նկարը" : "Ավելացնել ապրանքի նկար"}
                                            className="group relative mt-4 block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-[#69429a]/20 bg-[#f8f6fb] transition hover:border-[#69429a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#69429a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {preview ? (
                                                <>
                                                    <img
                                                        src={preview}
                                                        alt="Ընտրված ապրանքի նկարի նախադիտում"
                                                        className="h-full w-full object-cover"
                                                    />

                                                    <span className="absolute inset-x-0 bottom-0 bg-[#69429a]/85 px-4 py-3 text-sm font-semibold text-white">
                                                        Սեղմիր՝ նկարը փոխելու համար
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="flex h-full flex-col items-center justify-center gap-3 p-6">
                                                    <ImagePlus className="h-10 w-10 text-[#69429a]/60 transition group-hover:text-[#69429a]" />

                                                    <span className="text-sm font-semibold text-[#69429a]">
                                                        Սեղմիր՝ նկար ավելացնելու համար
                                                    </span>

                                                    <span className="text-xs text-gray-500">
                                                        JPG, PNG կամ WebP · մինչև 5 MB
                                                    </span>
                                                </span>
                                            )}
                                        </button>

                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={chooseImage}
                                            disabled={saving || loggingOut}
                                            aria-label="Ընտրել ապրանքի նկար"
                                            className="hidden"
                                        />

                                        {["party","cake"].includes(section) && <CatalogGalleryInput selectedMain={galleryMain} onSelectMain={setGalleryMain} files={extraImages} onChange={setExtraImages}/>}

                                        {image && (
                                            <p className="mt-3 break-all text-xs text-gray-500">
                                                {image.name}
                                            </p>
                                        )}
                                    </section>

                                    <section className={panelClass}>
                                        <label className="flex items-center gap-3 text-sm text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={form.isActive}
                                                onChange={(event) =>
                                                    change("isActive", event.target.checked)
                                                }
                                                className="h-4 w-4 accent-[#69429a]"
                                            />
                                            Ցուցադրել կայքում
                                        </label>

                                        {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                                        <button
                                            type="submit"
                                            disabled={saving || loggingOut}
                                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#69429a] px-4 py-3 font-semibold text-white transition hover:bg-[#7c4fb3] disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Plus className="h-4 w-4" />
                                            )}

                                            {saving ? "Պահպանվում է..." : "Պահպանել ապրանքը"}
                                        </button>
                                    </section>
                                </aside>
                            </fieldset>
                        </form>
                    </>
                )}

                {/* Ապրանքների ցանկ՝ խմբագրել, թաքցնել, ջնջել։ */}
                {/* Պահպանման ընթացքում կանխում ենք զուգահեռ գործողությունները։ */}
                <fieldset
                    disabled={saving || loggingOut}
                    className="min-w-0 border-0 p-0 disabled:opacity-60"
                >
                    <AdminProducts refreshVersion={refreshVersion} />
                </fieldset>
                </>
                )}
            </div>
        </main>
    );
}
