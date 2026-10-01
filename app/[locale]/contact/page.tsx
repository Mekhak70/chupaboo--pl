"use client"

import React, { useState } from "react"
import { Phone, MapPin, Send, CheckCircle2, Navigation, User, MessageSquare, Clock, ShieldCheck, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/components/language-provider"
import { FaWhatsapp, FaTelegramPlane } from "react-icons/fa"

export default function ContactPage() {
  const { t } = useLanguage()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const onlyLetters = value.replace(/[^a-zA-Zա-ֆԱ-Ֆ\s]/g, "")
    setName(onlyLetters)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const onlyNumbers = value.replace(/\D/g, "")
    setPhone(onlyNumbers)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      name,
      phone,
      message: (e.currentTarget.message as HTMLTextAreaElement).value,
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Failed")

      setIsSubmitted(true)
      setName("")
      setPhone("")
      e.currentTarget.reset()
    } catch (err) {
      console.error(err)
      alert(t('messages'))
    } finally {
      setIsSubmitting(false)
    }
  }

  

  const socialLinks = [
    { icon: FaWhatsapp, label: "WhatsApp", value: "033775750", type: "whatsapp", color: "#25D366" },
    { icon: FaTelegramPlane, label: "Telegram", value: "033775750", type: "telegram", color: "#229ED9" },
  ]

  const address = "Odkryta 15, Warszawa, Poland"
  const encodedAddress = encodeURIComponent(address)
  const googleMapsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
  const mapEmbedSrc = `https://www.google.com/maps?q=${encodedAddress}&output=embed`

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section
        className="relative py-24 text-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #69429a 0%, #8b5fbf 50%, #a77dd1 100%)",
        }}
      >
        <div className="absolute top-[-60px] left-[-60px] w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-[-80px] right-[-40px] w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-white/5 blur-xl" />

        <div className="relative container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">
            {t("contactTitle")}
          </h1>
          <p className="mt-5 text-lg text-white/90 max-w-2xl mx-auto">
            {t("contactText")}
          </p>
          <div className="mt-6 mx-auto w-24 h-1 rounded-full bg-white/60" />
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-16 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-2 items-stretch">
          {/* FORM */}
          <div className="relative rounded-3xl bg-card p-6 shadow-2xl md:p-10 border border-primary/10 overflow-hidden flex flex-col">
            {/* Վերևի գրադիենտ գիծ */}
            <div
              className="absolute top-0 left-0 w-full h-1.5"
              style={{ background: "linear-gradient(90deg, #69429a, #a77dd1)" }}
            />
            {/* Դեկորատիվ ֆոն ձևի վրա */}
            <div
              className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-10 blur-2xl pointer-events-none"
              style={{ backgroundColor: "#69429a" }}
            />

            {isSubmitted ? (
              <div className="text-center py-16 flex flex-col items-center justify-center flex-1 relative">
                <div
                  className="h-20 w-20 flex items-center justify-center rounded-full mb-6 animate-bounce"
                  style={{ backgroundColor: "#69429a15" }}
                >
                  <CheckCircle2 size={44} style={{ color: "#69429a" }} />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t("messageSent")}</h3>
                <p className="text-muted-foreground mb-6">Շնորհակալություն, մենք կկապվենք ձեզ հետ շուտով։</p>
                <Button
                  className="cursor-pointer rounded-full px-8 text-white shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: "#69429a" }}
                  onClick={() => setIsSubmitted(false)}
                >
                  {t("sendAnother")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative flex flex-col gap-5 flex-1">
                <div className="text-center mb-1">
                  <h2 className="text-3xl font-extrabold mb-1" style={{ color: "#69429a" }}>
                    {t("sendMessage")}
                  </h2>
                  <p className="text-sm text-muted-foreground">{t('customContactWelcome')}</p>
                  <div className="mt-4 mx-auto w-16 h-1 rounded-full" style={{ backgroundColor: "#69429a" }} />
                </div>

                {/* NAME */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="font-semibold flex items-center gap-2">
                    <User size={16} style={{ color: "#69429a" }} />
                    {t("name")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      value={name}
                      onChange={handleNameChange}
                      placeholder={t("name")}
                      required
                      className="cursor-pointer rounded-xl h-12 pl-11 border-primary/20 focus-visible:ring-2 focus-visible:ring-[#69429a] focus-visible:border-[#69429a] transition-all bg-primary/5"
                    />
                    <User
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"
                    />
                  </div>
                </div>

                {/* PHONE */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone" className="font-semibold flex items-center gap-2">
                    <Phone size={16} style={{ color: "#69429a" }} />
                    {t("phone")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      value={phone}
                      onChange={handlePhoneChange}
                      inputMode="numeric"
                      placeholder={t('phone')}
                      maxLength={9}
                      required
                      className="cursor-pointer rounded-xl h-12 pl-11 border-primary/20 focus-visible:ring-2 focus-visible:ring-[#69429a] focus-visible:border-[#69429a] transition-all bg-primary/5"
                    />
                    <Phone
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"
                    />
                  </div>
                </div>

                {/* MESSAGE */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="message" className="font-semibold flex items-center gap-2">
                    <MessageSquare size={16} style={{ color: "#69429a" }} />
                    {t("message")}
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="message"
                      rows={5}
                      required
                      className="cursor-pointer rounded-xl border-primary/20 focus-visible:ring-2 focus-visible:ring-[#69429a] focus-visible:border-[#69429a] transition-all resize-none bg-primary/5 pl-11 pt-3"
                      placeholder={t("message")}
                    />
                    <MessageSquare
                      size={18}
                      className="absolute left-3.5 top-4 opacity-40"
                    />
                  </div>
                </div>

                {/* ՈՒՂԱՐԿԵԼ */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-full h-14 text-base font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-white"
                  style={{
                    background: "linear-gradient(135deg, #69429a 0%, #8b5fbf 100%)",
                  }}
                >
                  <Send size={20} />
                  {isSubmitting ? t("sending") : t("sendMessage")}
                </Button>

                {/* ՆԵՐՔԵՎԻ ԼՐԱՑՈՒՑԻՉ ԲԼՈԿ — ֆորմայի դատարկ հատվածը լրացնելու համար */}
                <div className="mt-auto pt-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10 hover:border-primary/30 transition-all">
                      <div
                        className="h-10 w-10 flex items-center justify-center rounded-xl text-white shrink-0"
                        style={{ backgroundColor: "#69429a" }}
                      >
                        <Clock size={18} />
                      </div>
                      <div className="leading-tight">
                        <div className="text-xs text-muted-foreground">{t('workingHours')}</div>
                        <div className="text-sm font-bold">10:00 – 22:00</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10 hover:border-primary/30 transition-all">
                      <div
                        className="h-10 w-10 flex items-center justify-center rounded-xl text-white shrink-0"
                        style={{ backgroundColor: "#25D366" }}
                      >
                        <ShieldCheck size={18} />
                      </div>
                      <div className="leading-tight">
                        <div className="text-xs text-muted-foreground">{t('quickResponse')}</div>
                        <div className="text-sm font-bold">{t('quickResponseTime')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Սիրուն սրտիկով տող */}
                  <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Heart size={14} style={{ color: "#e74c3c" }} fill="#e74c3c" />
                    <span>{t('yourOpinionMatters')}</span>
                    <Heart size={14} style={{ color: "#e74c3c" }} fill="#e74c3c" />
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* CONTACT LINKS + MAP */}

          <div className="flex flex-col gap-6 relative rounded-3xl  overflow-hidden " >
          <div
              className="absolute top-0 left-0 w-full h-1.5"
              style={{ background: "linear-gradient(90deg, #69429a, #a77dd1)" }}
            />
            {/* Դեկորատիվ ֆոն ձևի վրա */}
            <div
              className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-10 blur-2xl pointer-events-none"
              style={{ backgroundColor: "#69429a" }}
            />
            
            
            <div className="flex flex-col gap-3 rounded-3xl bg-card p-6 shadow-2xl md:p-8 border border-primary/10">
            
              <h2 className="text-3xl font-extrabold mb-2 text-center" style={{ color: "#69429a" }}>
                {t("contactUs")}
              </h2>
              <div className="mx-auto w-16 h-1 rounded-full mb-4" style={{ backgroundColor: "#69429a" }} />

              {[ ...socialLinks].map((info, i) => {
                let href = "#"

                if (info.type === "phone") href = `tel:${info.value}`
                if (info.type === "whatsapp") href = `https://wa.me/374${info.value}`
                if (info.type === "telegram") href = `https://t.me/+374${info.value}`

                return (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 cursor-pointer transition-all duration-300 hover:translate-x-1 border border-transparent hover:border-primary/20"
                  >
                    <div
                      className="h-14 w-14 flex items-center justify-center rounded-2xl text-white shadow-md group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300"
                      style={{ backgroundColor: info.color }}
                    >
                      <info.icon size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-base">{info.label}</div>
                      <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                        {info.value}
                      </div>
                    </div>
                  </a>
                )
              })}

              {/* ՀԱՍՑԵ */}
              <a
                href={googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 cursor-pointer transition-all duration-300 hover:translate-x-1 border border-transparent hover:border-primary/20"
              >
                <div
                  className="h-14 w-14 flex items-center justify-center rounded-2xl text-white shadow-md group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300"
                  style={{ backgroundColor: "#e74c3c" }}
                >
                  <MapPin size={20} />
                </div>
                <div>
                  <div className="font-semibold text-base">{t("address")}</div>
                  <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    Odkryta 15, Warszawa
                  </div>
                </div>
              </a>
            </div>

            {/* ՔԱՐՏԵԶ */}
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-primary/10 group flex-1 flex flex-col">
              <div className="relative flex-1">
                <iframe
                  src={mapEmbedSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: "300px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Restaurant location map"
                  className="grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <a
                href={googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-4 font-bold text-white cursor-pointer transition-all duration-300 hover:opacity-90"
                style={{ background: "linear-gradient(90deg, #69429a, #8b5fbf)" }}
              >
                <Navigation size={18} />
               {t('showRoute')}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}