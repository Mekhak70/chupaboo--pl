"use client";

import ManagedCakePage from "@/components/managed-cake-page";
import { polandCatalogEnabled } from "@/lib/poland-supabase";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingCart } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-context";
import { CartDrawer } from "@/components/CartDrawer";

// ========== TYPES ==========

type CakeType = "MEAT" | "FRUIT" | "VEGETABLES" | "";

type CreamType =
  | "DAIRY"
  | "PLANTBASEDMILK"
  | "PLANTBASED"
  | "";

type DesignType =
  | "STANDARD"
  | "CUSTOM_PHOTO"
  | "CUSTOM_TEXT"
  | "NAME_TEXT"
  | "";

interface ProductOptions {
  cakeType: CakeType;
  creamType: CreamType;
  selectedVegetables: string[];
  selectedAnimal?: string;
  designType: DesignType;
  customImage?: string | null;
  customText?: string;
  petName?: string;
}

interface PageProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  cream: boolean;
}

interface ValidationErrors {
  cakeType?: string;
  creamType?: string;
  selectedVegetables?: string;
  selectedAnimal?: string;
  designType?: string;
  customText?: string;
}

interface ExchangeRate {
  base: string;
  quote: string;
  rate: number;
}

type SheetRow = Record<string, unknown>;

// ========== COMPONENT ==========

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  if (polandCatalogEnabled) return <ManagedCakePage params={params} />;
  return <LegacyProductPage params={params} />;
}

function LegacyProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, language } = useLanguage();
  const { addToCart, getItemCount } = useCart();

  const [isCartOpen, setIsCartOpen] = useState(false);

  const [product, setProduct] = useState<PageProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Product customization
  const [cakeType, setCakeType] = useState<CakeType>("MEAT");
  const [creamType, setCreamType] = useState<CreamType>("DAIRY");
  const [quantity, setQuantity] = useState(1);

  const [selectedVegetables, setSelectedVegetables] = useState<string[]>([
    "POTATO",
    "CARROT",
  ]);

  const [selectedAnimal, setSelectedAnimal] = useState("CHICKEN");
  const [designType, setDesignType] = useState<DesignType>("STANDARD");
  const [customText, setCustomText] = useState("");

  const [errors, setErrors] = useState<ValidationErrors>({});

  // Prices remain in AMD internally.
  // Only the displayed amount is converted to PLN.
  const [plnRate, setPlnRate] = useState<number | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(false);

  const lastTrackedProductId = useRef<string | null>(null);

  // ========== EXCHANGE RATE ==========

  useEffect(() => {
    const controller = new AbortController();

    async function loadExchangeRate() {
      try {
        setRatesLoading(true);
        setRatesError(false);

        const response = await fetch(
          "https://api.frankfurter.dev/v2/rates?base=AMD&quotes=PLN",
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Could not load PLN exchange rate");
        }

        const data: ExchangeRate[] = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid exchange rate response");
        }

        const rate = data.find(
          (item) =>
            item.base === "AMD" &&
            item.quote === "PLN" &&
            Number.isFinite(item.rate) &&
            item.rate > 0
        )?.rate;

        if (rate === undefined) {
          throw new Error("PLN exchange rate is missing");
        }

        if (!controller.signal.aborted) {
          setPlnRate(rate);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Exchange rate error:", err);
          setRatesError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setRatesLoading(false);
        }
      }
    }

    void loadExchangeRate();

    return () => controller.abort();
  }, []);

  const formatMoney = (amountAMD: number): string => {
    if (plnRate === null) {
      return ratesLoading
        ? t("currencyCursLoading") || "Բեռնվում է…"
        : "— zł";
    }

    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountAMD * plnRate);
  };

  // ========== LOAD PRODUCT ==========

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);
        setProduct(null);

        const response = await fetch(
          "https://opensheet.elk.sh/1JuaojKVSs8Fe6_4e2nPdHg0WgFJxNkL-uQbbcyPP1b0/Sheet1",
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid product data format");
        }

        const formatted: PageProduct[] = data.map((row: SheetRow) => {
          let image = String(row["նկար"] || "");
          const match = image.match(/\/d\/([^/]+)/);

          if (match) {
            image = `https://drive.google.com/uc?export=view&id=${match[1]}`;
          }

          return {
            id: String(row.id || ""),
            name: String(row.name || "Unknown"),
            price: Number(row.price) || 0,
            category: String(row.size || "standard"),
            image: image || "/placeholder-image.jpg",
            cream: Boolean(Number(row.cream)),
          };
        });

        const foundProduct = formatted.find(
          (item) => item.id === String(id)
        );

        if (!controller.signal.aborted) {
          setProduct(foundProduct || null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Load product error:", err);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load product"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => controller.abort();
  }, [id]);

  // Reset customization when navigating to another product.
  useEffect(() => {
    setCakeType("MEAT");
    setCreamType("DAIRY");
    setQuantity(1);
    setSelectedVegetables(["POTATO", "CARROT"]);
    setSelectedAnimal("CHICKEN");
    setDesignType("STANDARD");
    setCustomText("");
    setErrors({});
  }, [id]);

  // ========== PRICE CALCULATION ==========

  const calculatePrice = (): number => {
    if (!product) return 0;

    const isCookieboo = id === "cookieboo";

    let basePrice = 0;

    if (cakeType === "MEAT") {
      const meatPrices: Record<string, number> = {
        CHICKEN: isCookieboo ? 15000 : 12000,
        BEEF: isCookieboo ? 16000 : 13000,
        LAMB: isCookieboo ? 18000 : 15000,
        TURKEY: isCookieboo ? 22000 : 19000,
        SALMON: isCookieboo ? 24000 : 21000,
      };

      basePrice = meatPrices[selectedAnimal] || 0;
    } else if (cakeType === "FRUIT") {
      basePrice = isCookieboo ? 13000 : 10000;
    } else if (cakeType === "VEGETABLES") {
      basePrice = isCookieboo ? 14000 : 11000;
    }

    if (selectedVegetables.includes("SWEET_POTATO")) {
      basePrice += 2000;
    }

    if (selectedVegetables.includes("MANGO")) {
      basePrice += 2000;
    }

    if (selectedVegetables.includes("ELDERBERRY")) {
      basePrice += 2000;
    }

    let extra = 0;

    if (selectedVegetables.length === 3) {
      extra += 1000;
    }

    if (product.cream && creamType === "PLANTBASEDMILK") {
      extra += 3000;
    }

    if (id === "pawy-1") {
      basePrice += 2000;
    }

    let finalPrice = basePrice + extra;

    if (product.category === "small") {
      finalPrice = Math.round(finalPrice / 3);
    }

    if (product.category === "midi") {
      finalPrice = Math.round(finalPrice / 2);
    }

    if (
      product.category !== "small" &&
      designType === "CUSTOM_PHOTO"
    ) {
      finalPrice += 5000;
    }

    return Math.round(finalPrice / 500) * 500;
  };

  const price = calculatePrice();

  // ========== PRODUCT VIEW TRACKING ==========

  useEffect(() => {
    if (!product || lastTrackedProductId.current === product.id) {
      return;
    }

    lastTrackedProductId.current = product.id;

    const fullImageUrl = product.image.startsWith("http")
      ? product.image
      : `https://www.chupaboo.com${product.image}`;

    async function sendProductView() {
      if (!product) return;

      try {
        const caption = [
          "🛒 New User View:",
          `📦 ${product.name}`,
          `🕒 ${new Date().toLocaleString()}`,
        ].join("\n");

        await fetch("/api/telegram/product-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productName: product.name,
            imageSrc: fullImageUrl,
            caption,
          }),
        });
      } catch (err) {
        console.error("Telegram error:", err);
      }
    }

    void sendProductView();
  }, [product]);

  // ========== FORM HELPERS ==========

  const clearFieldError = (field: keyof ValidationErrors) => {
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  };

  const handleCakeTypeChange = (nextType: CakeType) => {
    setCakeType(nextType);

    setSelectedVegetables(
      nextType === "FRUIT"
        ? ["BANANA", "APPLE"]
        : ["POTATO", "CARROT"]
    );

    clearFieldError("cakeType");
    clearFieldError("selectedVegetables");
  };

  const handleVegetableToggle = (ingredientKey: string) => {
    const grainGroup = ["RICE", "WHEAT", "OATS"];

    setSelectedVegetables((previous) => {
      if (previous.includes(ingredientKey)) {
        if (previous.length === 1) return previous;

        return previous.filter((item) => item !== ingredientKey);
      }

      let updated = [...previous];

      if (grainGroup.includes(ingredientKey)) {
        updated = updated.filter(
          (item) => !grainGroup.includes(item)
        );
      }

      if (updated.length >= 3) {
        return [...updated.slice(1), ingredientKey];
      }

      return [...updated, ingredientKey];
    });

    clearFieldError("selectedVegetables");
  };

  const validateForm = (): boolean => {
    const nextErrors: ValidationErrors = {};

    if (!cakeType) {
      nextErrors.cakeType =
        t("cakeTypeRequired") || "Please select cake type";
    }

    if (product?.cream && !creamType) {
      nextErrors.creamType =
        t("creamTypeRequired") || "Please select cream type";
    }

    if (selectedVegetables.length === 0) {
      nextErrors.selectedVegetables =
        t("ingredientsRequired") ||
        "Please select at least one ingredient";
    }

    if (cakeType === "MEAT" && !selectedAnimal) {
      nextErrors.selectedAnimal =
        t("meatTypeRequired") || "Please select meat type";
    }

    if (product?.category !== "small" && !designType) {
      nextErrors.designType =
        t("designTypeRequired") || "Please select design type";
    }

    if (
      product?.category !== "small" &&
      designType === "CUSTOM_TEXT" &&
      !customText.trim()
    ) {
      nextErrors.customText =
        t("customTextRequired") || "Please enter custom text";
    }

    setErrors(nextErrors);

    const firstErrorField = Object.keys(nextErrors)[0];

    if (firstErrorField) {
      document
        .getElementById(`error-${firstErrorField}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return false;
    }

    return true;
  };

  const addToCartHandler = () => {
    if (!product || !validateForm()) return;

    const effectiveDesignType =
      product.category === "small" ? "STANDARD" : designType;

    const productOptions: ProductOptions = {
      cakeType,
      creamType,
      selectedVegetables: [...selectedVegetables],
      selectedAnimal:
        cakeType === "MEAT" ? selectedAnimal : undefined,
      designType: effectiveDesignType,
      customImage: null,
      customText:
        effectiveDesignType === "CUSTOM_TEXT"
          ? customText.trim()
          : "",
      petName: "",
    };

    addToCart({
      id: product.id,
      name: product.name,
      image: product.image,
      price,
      quantity,
      options: productOptions,
    });

    setIsCartOpen(true);
  };

  // ========== LOADING / ERROR ==========

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#69429a]" />

          <p className="mt-4 text-gray-600">
            {t("loading") || "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4 text-6xl text-red-500">⚠️</div>

          <h2 className="mb-2 text-xl font-bold text-red-600">
            Error
          </h2>

          <p className="mb-4 text-gray-600">{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#69429a] px-4 py-2 text-white transition-colors hover:bg-[#5a3a85]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return notFound();
  }

  // ========== OPTIONS ==========

  const meatOptions = [
    {
      key: "CHICKEN",
      label: t("chicken"),
      emoji: "🐔",
      color: "#F44336",
    },
    {
      key: "BEEF",
      label: t("beef"),
      emoji: "🐄",
      color: "#8B4513",
    },
    {
      key: "LAMB",
      label: t("lamb"),
      emoji: "🐑",
      color: "#FF8C00",
    },
    {
      key: "TURKEY",
      label: t("turkey"),
      emoji: "🦃",
      color: "#DAA520",
    },
    {
      key: "SALMON",
      label: t("salmon"),
      emoji: "🐟",
      color: "#FF6F61",
    },
  ];

  const ingredientOptions = [
    {
      key: "POTATO",
      label: t("potato"),
      emoji: "🥔",
      color: "#D9A066",
      type: "VEGETABLE",
    },
    {
      key: "CARROT",
      label: t("carrot"),
      emoji: "🥕",
      color: "#FF8C42",
      type: "VEGETABLE",
    },
    {
      key: "BROCCOLI",
      label: t("broccoli"),
      emoji: "🥦",
      color: "#4CAF50",
      type: "VEGETABLE",
    },
    {
      key: "PUMPKIN",
      label: t("pumpkin"),
      emoji: "🎃",
      color: "#FFA500",
      type: "VEGETABLE",
    },
    {
      key: "PEPPER",
      label: t("greenPepper"),
      emoji: "🫑",
      color: "#00C853",
      type: "VEGETABLE",
    },
    {
      key: "ZUCCHINI",
      label: t("zucchini"),
      emoji: "🥒",
      color: "#76C043",
      type: "VEGETABLE",
    },
    {
      key: "CAULIFLOWER",
      label: t("cauliflower"),
      emoji: "🥬",
      color: "#B0BEC5",
      type: "VEGETABLE",
    },
    {
      key: "SWEET_POTATO",
      label: t("sweetPotato"),
      emoji: "🍠",
      color: "#FF5722",
      type: "VEGETABLE",
    },
    {
      key: "SPINACH",
      label: t("spinach"),
      emoji: "🥬",
      color: "#2E7D32",
      type: "VEGETABLE",
    },
    {
      key: "RICE",
      label: t("rice"),
      emoji: "🍚",
      color: "#B0BEC5",
      type: "VEGETABLE",
    },
    {
      key: "WHEAT",
      label: t("wheat"),
      emoji: "🌾",
      color: "#D9A066",
      type: "VEGETABLE",
    },
    {
      key: "OATS",
      label: t("oats"),
      emoji: "🥣",
      color: "#FFB74D",
      type: "VEGETABLE",
    },
    {
      key: "APPLE",
      label: t("apple"),
      emoji: "🍎",
      color: "#FF4D4D",
      type: "FRUIT",
    },
    {
      key: "BANANA",
      label: t("banana"),
      emoji: "🍌",
      color: "#FFE135",
      type: "FRUIT",
    },
    {
      key: "PEAR",
      label: t("pear"),
      emoji: "🍐",
      color: "#A2D149",
      type: "FRUIT",
    },
    {
      key: "ELDERBERRY",
      label: t("elderberry"),
      emoji: "🫐",
      color: "#6A0DAD",
      type: "FRUIT",
    },
    {
      key: "STRAWBERRY",
      label: t("strawberry"),
      emoji: "🍓",
      color: "#FF1654",
      type: "FRUIT",
    },
    {
      key: "MANGO",
      label: t("mango"),
      emoji: "🥭",
      color: "#FFB347",
      type: "FRUIT",
    },
  ];

  const cakeOptions: {
    key: CakeType;
    label: string;
    emoji: string;
    color: string;
  }[] = [
    {
      key: "MEAT",
      label: t("MEAT"),
      emoji: "🍖",
      color: "#ef4f27",
    },
    {
      key: "FRUIT",
      label: t("FRUIT"),
      emoji: "🍓",
      color: "#f4a2c6",
    },
    {
      key: "VEGETABLES",
      label: t("VEGETABLES"),
      emoji: "🥬",
      color: "#aed137",
    },
  ];

  const creamOptions: {
    key: CreamType;
    label: string;
    emoji: string;
    color: string;
  }[] = [
    {
      key: "DAIRY",
      label: t("DAIRY"),
      emoji: "🐄",
      color: "#1e439b",
    },
    {
      key: "PLANTBASEDMILK",
      label: t("PLANTBASEDMILK"),
      emoji: "🥥",
      color: "#72bfe9",
    },
    {
      key: "PLANTBASED",
      label: t("PLANTBASED"),
      emoji: "🥕",
      color: "#008042",
    },
  ];

  const designOptions: {
    key: DesignType;
    label: string;
    emoji: string;
    color: string;
  }[] = [
    {
      key: "STANDARD",
      label: t("standardDesign"),
      emoji: "🎂",
      color: "#8b5cf6",
    },
    {
      key: "CUSTOM_TEXT",
      label: t("customDesign"),
      emoji: "✏️",
      color: "#facc15",
    },
  ];

  const optionClassName =
    "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all";

  const quantityLabel =
    language === "en"
      ? "Quantity"
      : language === "ru"
        ? "Количество"
        : language === "pl"
          ? "Ilość"
          : "Քանակ";

  const itemCount = getItemCount();

  // ========== JSX ==========

  return (
    <div className="min-h-screen bg-gray-50">
      <Link
        href="/"
        className="block w-full bg-[#69429a] py-4 text-white"
      >
        <div className="container mx-auto flex items-center gap-2 px-4">
          <ArrowLeft className="h-5 w-5" />
          <span>{t("mainPage")}</span>
        </div>
      </Link>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* Product image */}
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-white shadow-lg">
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          {/* Product customization */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-[#69429a] md:text-4xl">
                {product.name}
              </h1>

              <p className="text-xs text-gray-600">
                {t("cakeDescription")}
              </p>

              {ratesLoading && (
                <p className="mt-4 text-xs text-gray-500">
                  {t("currencyCursLoading")}
                </p>
              )}

              {ratesError && (
                <p className="mt-4 text-xs text-red-500">
                  {t("currencyCursError")}
                </p>
              )}
            </div>

            {/* Cake type */}
            <div id="error-cakeType">
              <p className="mb-3 text-lg font-semibold text-[#69429a]">
                {t("choosemaincake")}
              </p>

              <div className="flex flex-wrap gap-3">
                {cakeOptions.map((option) => {
                  const isSelected = cakeType === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        handleCakeTypeChange(option.key)
                      }
                      className={`${optionClassName} ${
                        isSelected ? "scale-105 shadow-md" : ""
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? option.color
                          : "white",
                        color: isSelected
                          ? "white"
                          : option.color,
                        borderColor: option.color,
                      }}
                    >
                      {option.emoji} {option.label}
                    </button>
                  );
                })}
              </div>

              {errors.cakeType && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.cakeType}
                </p>
              )}
            </div>

            {/* Meat type */}
            {cakeType === "MEAT" && (
              <div id="error-selectedAnimal">
                <p className="mb-3 text-lg font-semibold text-[#69429a]">
                  {t("chooseMeatType")}
                </p>

                <div className="flex flex-wrap gap-3">
                  {meatOptions.map((option) => {
                    const isSelected =
                      selectedAnimal === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedAnimal(option.key);
                          clearFieldError("selectedAnimal");
                        }}
                        className={optionClassName}
                        style={{
                          backgroundColor: isSelected
                            ? option.color
                            : "white",
                          color: isSelected
                            ? "white"
                            : option.color,
                          borderColor: option.color,
                        }}
                      >
                        {option.emoji} {option.label}
                      </button>
                    );
                  })}
                </div>

                {errors.selectedAnimal && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.selectedAnimal}
                  </p>
                )}
              </div>
            )}

            {/* Ingredients */}
            <div id="error-selectedVegetables">
              <p className="mb-3 text-lg font-semibold text-[#69429a]">
                {t("chooseIngredients")}
              </p>

              <div className="flex flex-wrap gap-3">
                {ingredientOptions
                  .filter((option) =>
                    cakeType === "FRUIT"
                      ? option.type === "FRUIT"
                      : option.type !== "FRUIT"
                  )
                  .map((option) => {
                    const isSelected =
                      selectedVegetables.includes(option.key);

                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          handleVegetableToggle(option.key)
                        }
                        className={optionClassName}
                        style={{
                          backgroundColor: isSelected
                            ? option.color
                            : "white",
                          color: isSelected
                            ? "white"
                            : option.color,
                          borderColor: option.color,
                        }}
                      >
                        {option.emoji} {option.label}
                      </button>
                    );
                  })}
              </div>

              {errors.selectedVegetables && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.selectedVegetables}
                </p>
              )}
            </div>

            {/* Cream type */}
            {product.cream && (
              <div id="error-creamType">
                <p className="mb-3 text-lg font-semibold text-[#69429a]">
                  {t("choosecream")}
                </p>

                <div className="flex flex-wrap gap-3">
                  {creamOptions.map((option) => {
                    const isSelected =
                      creamType === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setCreamType(option.key);
                          clearFieldError("creamType");
                        }}
                        className={`${optionClassName} ${
                          isSelected ? "scale-105 shadow-md" : ""
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? option.color
                            : "white",
                          color: isSelected
                            ? "white"
                            : option.color,
                          borderColor: option.color,
                        }}
                      >
                        {option.emoji} {option.label}
                      </button>
                    );
                  })}
                </div>

                {errors.creamType && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.creamType}
                  </p>
                )}
              </div>
            )}

            {/* Design type */}
            {product.category !== "small" && (
              <>
                <div id="error-designType">
                  <p className="mb-3 text-lg font-semibold text-[#69429a]">
                    {t("chooseDesign")}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {designOptions.map((option) => {
                      const isSelected =
                        designType === option.key;

                      return (
                        <button
                          key={option.key}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            setDesignType(option.key);
                            clearFieldError("designType");
                            clearFieldError("customText");
                          }}
                          className={`${optionClassName} ${
                            isSelected
                              ? "scale-105 shadow-md"
                              : ""
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? option.color
                              : "white",
                            color: isSelected
                              ? "white"
                              : option.color,
                            borderColor: option.color,
                          }}
                        >
                          {option.emoji} {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {errors.designType && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.designType}
                    </p>
                  )}
                </div>

                {designType === "CUSTOM_TEXT" && (
                  <div id="error-customText">
                    <label
                      htmlFor="custom-text"
                      className="mb-3 block text-lg font-semibold text-[#69429a]"
                    >
                      {t("enterCustomText")}
                    </label>

                    <textarea
                      id="custom-text"
                      value={customText}
                      onChange={(event) => {
                        setCustomText(event.target.value);

                        if (event.target.value.trim()) {
                          clearFieldError("customText");
                        }
                      }}
                      placeholder={t("enterCustomText")}
                      rows={3}
                      aria-invalid={Boolean(errors.customText)}
                      aria-describedby={
                        errors.customText
                          ? "custom-text-error"
                          : undefined
                      }
                      className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-[#69429a] focus:outline-none focus:ring-1 focus:ring-[#69429a]"
                    />

                    {errors.customText && (
                      <p
                        id="custom-text-error"
                        className="mt-2 text-sm text-red-500"
                      >
                        {errors.customText}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Quantity */}
            <div>
              <p className="mb-3 text-lg font-semibold text-[#69429a]">
                {quantityLabel}
              </p>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label={`${quantityLabel} −`}
                  disabled={quantity <= 1}
                  onClick={() =>
                    setQuantity((previous) =>
                      Math.max(1, previous - 1)
                    )
                  }
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#69429a] text-xl font-bold text-white transition-colors hover:bg-[#5a3a85] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  −
                </button>

                <span className="w-12 text-center text-2xl font-bold text-[#69429a]">
                  {quantity}
                </span>

                <button
                  type="button"
                  aria-label={`${quantityLabel} +`}
                  onClick={() =>
                    setQuantity((previous) => previous + 1)
                  }
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#69429a] text-xl font-bold text-white transition-colors hover:bg-[#5a3a85]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price summary: PLN only, no decimal places */}
            <div className="sticky bottom-20 z-30 mt-auto rounded-2xl border border-[#69429a]/10 bg-white p-4 shadow-lg md:bottom-5">
              <div className="text-2xl font-bold text-[#69429a]">
                {t("subtotal")}: {formatMoney(price * quantity)}
              </div>

              <div className="mt-2 text-3xl font-bold text-[#69429a]">
                {t("total")}: {formatMoney(price * quantity)}

                <sup className="ml-1 text-sm font-normal text-gray-400">
                  *
                </sup>
              </div>

              <div className="mt-3 flex items-start gap-1 border-t border-dashed border-gray-200 pt-2">
                <span className="text-sm font-bold text-[#69429a]">
                  *
                </span>

                <span className="text-xs text-gray-400">
                  {t("priceDependsOnComponentsAndDesign")}
                </span>
              </div>
            </div>

            {/* Add to cart */}
            <button
              type="button"
              onClick={addToCartHandler}
              className="inline-flex cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#69429a] px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#aed137]"
            >
              🛒 {t("addToCart") || "Add to Cart"}
            </button>

            {/* Product info */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-3 font-semibold text-[#69429a]">
                {t("productInfo")}
              </h3>

              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-[#aed137]">✓</span>
                  {t("safeIngredients")}
                </li>

                <li className="flex items-center gap-2">
                  <span className="text-[#aed137]">✓</span>
                  {t("freshDaily2")}
                </li>

                <li className="flex items-center gap-2">
                  <span className="text-[#aed137]">✓</span>
                  {t("madeWithLove")}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Floating cart button */}
      <button
        type="button"
        aria-label={t("addToCart") || "Cart"}
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full bg-[#69429a] p-4 text-white shadow-lg transition hover:bg-[#5a3a85]"
      >
        <ShoppingCart className="h-6 w-6" />

        {itemCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
            {itemCount}
          </span>
        )}
      </button>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </div>
  );
}