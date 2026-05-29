import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CourtBackground } from "@/components/landing/court-bg";
import { Ball } from "@/components/ball";
import {
  ArrowRightIcon,
  BallIcon,
  RacketIcon,
  CalendarIcon,
  ClockIcon,
  CardIcon,
  ChartIcon,
  UsersIcon,
  BoltIcon,
  ShieldIcon,
  PhoneIcon,
  CheckIcon,
} from "@/components/icons";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <LogoStrip />
        <Sports />
        <HowItWorks />
        <Features />
        <ForClubs />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <CourtBackground />
      <Ball className="animate-float pointer-events-none absolute left-[54%] top-24 z-10 hidden w-16 drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)] lg:block xl:w-20" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            Padel · Tenis · y más deportes
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Reservá tu cancha
            <br />
            <span className="text-gradient">en segundos.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
            La plataforma que conecta clubes y jugadores. Los clubes gestionan
            sus canchas y turnos; los jugadores reservan y pagan online con
            MercadoPago. Sin llamados, sin planillas.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/registrar-club"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-accent-400 px-6 py-3 text-sm font-semibold text-[#06121f] shadow-lg shadow-brand-500/25 transition-transform hover:scale-[1.03]"
            >
              Registrá tu club
              <ArrowRightIcon width={18} height={18} />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Reservá una cancha
            </a>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
            {[
              { v: "24/7", l: "Reservas online" },
              { v: "0%", l: "Comisión al jugador" },
              { v: "5 min", l: "Para empezar" },
            ].map((s) => (
              <div key={s.l}>
                <dt className="text-2xl font-bold text-white">{s.v}</dt>
                <dd className="mt-1 text-xs text-slate-400">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <BookingPreview />
      </div>
    </section>
  );
}

function BookingPreview() {
  const slots = [
    { t: "18:00", state: "free" },
    { t: "19:00", state: "free" },
    { t: "20:00", state: "taken" },
    { t: "21:00", state: "selected" },
    { t: "22:00", state: "free" },
    { t: "23:00", state: "free" },
  ] as const;

  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-500/20 via-accent-400/10 to-transparent blur-2xl" />
      <div className="glass rounded-3xl p-6 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Club La Quinta</p>
            <p className="text-xs text-slate-400">Cancha 2 · Padel · Techada</p>
          </div>
          <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-300">
            Hoy
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {slots.map((s) => (
            <div
              key={s.t}
              className={[
                "rounded-xl border px-3 py-3 text-center text-sm font-medium transition-colors",
                s.state === "free" &&
                  "border-white/10 bg-white/[0.03] text-slate-200",
                s.state === "taken" &&
                  "border-transparent bg-white/[0.02] text-slate-600 line-through",
                s.state === "selected" &&
                  "border-brand-400 bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/50",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {s.t}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <ClockIcon width={18} height={18} className="text-brand-300" />
            21:00 – 22:30
          </div>
          <span className="text-sm font-semibold text-white">$ 12.000</span>
        </div>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 py-3 text-sm font-semibold text-[#06121f]">
          <CardIcon width={18} height={18} />
          Reservar y pagar
        </button>
      </div>
    </div>
  );
}

function LogoStrip() {
  return (
    <div className="border-y border-white/5 bg-bg-soft/50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-6 text-sm text-slate-500 sm:px-8">
        <span>Integramos con</span>
        {["MercadoPago", "Google", "WhatsApp", "Google Calendar"].map((n) => (
          <span key={n} className="font-semibold text-slate-400">
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Deportes                                                                   */
/* -------------------------------------------------------------------------- */

function Sports() {
  const sports = [
    {
      name: "Padel",
      desc: "Reservá por turno de 90 min, elegí cancha techada o al aire libre y pagá tu seña online.",
      icon: RacketIcon,
      accent: "from-brand-400/20 to-brand-500/5",
    },
    {
      name: "Tenis",
      desc: "Polvo de ladrillo o cemento, individual o dobles. Disponibilidad en tiempo real.",
      icon: BallIcon,
      accent: "from-accent-400/20 to-accent-400/5",
    },
    {
      name: "y más",
      desc: "Fútbol 5, básquet u otros. Configurá cualquier tipo de cancha y horario.",
      icon: BoltIcon,
      accent: "from-white/10 to-white/[0.02]",
    },
  ];

  return (
    <Section id="deportes" eyebrow="Deportes" title="Pensado para tu club">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sports.map((s) => (
          <div
            key={s.name}
            className="group relative overflow-hidden rounded-2xl border border-white/8 bg-surface/60 p-7 transition-colors hover:border-brand-400/40"
          >
            <div
              className={`absolute inset-0 -z-10 bg-gradient-to-br ${s.accent} opacity-0 transition-opacity group-hover:opacity-100`}
            />
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-brand-300">
              <s.icon width={26} height={26} />
            </span>
            <h3 className="mt-5 text-xl font-semibold capitalize text-white">
              {s.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Cómo funciona                                                              */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Elegí tu club",
      desc: "Entrá al sitio del club y mirá la disponibilidad real de cada cancha.",
      icon: UsersIcon,
    },
    {
      n: "02",
      title: "Elegí día y horario",
      desc: "Seleccioná el turno libre que más te sirva, en segundos y desde el celu.",
      icon: CalendarIcon,
    },
    {
      n: "03",
      title: "Pagá con MercadoPago",
      desc: "Confirmás la reserva pagando online. El turno queda asegurado al instante.",
      icon: CardIcon,
    },
  ];

  return (
    <Section
      id="como-funciona"
      eyebrow="Cómo funciona"
      title="Reservar nunca fue tan fácil"
    >
      <div className="grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="relative rounded-2xl border border-white/8 bg-surface/40 p-7"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
                <s.icon width={24} height={24} />
              </span>
              <span className="font-mono text-2xl font-bold text-white/10">
                {s.n}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-white">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Features (RankOS)                                                          */
/* -------------------------------------------------------------------------- */

function Features() {
  const features = [
    {
      icon: CalendarIcon,
      title: "Gestión de canchas y turnos",
      desc: "Dá de alta tus canchas y definí los horarios disponibles por día. La grilla se arma sola.",
    },
    {
      icon: BoltIcon,
      title: "Disponibilidad en tiempo real",
      desc: "Cada reserva actualiza la grilla al instante. Adiós a los turnos pisados.",
    },
    {
      icon: CardIcon,
      title: "Cobros con MercadoPago",
      desc: "Cobrá la seña o el total online. La plata cae directo en la cuenta del club.",
    },
    {
      icon: UsersIcon,
      title: "Tus clientes, ordenados",
      desc: "Historial de reservas, datos de contacto y clientes frecuentes en un solo lugar.",
    },
    {
      icon: ChartIcon,
      title: "Reportes y ocupación",
      desc: "Mirá cuánto facturás, qué horarios rinden más y la ocupación de cada cancha.",
    },
    {
      icon: ShieldIcon,
      title: "Tu marca, tu subdominio",
      desc: "Cada club tiene su propio sitio (tuclub.saque.app) con tu identidad.",
    },
  ];

  return (
    <Section
      eyebrow="La plataforma"
      title="Todo lo que tu club necesita para operar"
      subtitle="Un panel simple para gestionar canchas, turnos, pagos y clientes. Sin planillas ni cuadernos."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-white/8 bg-surface/40 p-6 transition-colors hover:border-white/15"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-brand-300">
              <f.icon width={23} height={23} />
            </span>
            <h3 className="mt-4 text-base font-semibold text-white">
              {f.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Para clubes                                                                */
/* -------------------------------------------------------------------------- */

function ForClubs() {
  const bullets = [
    "Sin comisiones para el jugador",
    "Sin costos ocultos",
    "Reservas las 24 horas, incluso cuando el club está cerrado",
    "Menos llamados y mensajes para coordinar turnos",
    "Cobrás la seña por adelantado y reducís ausencias",
  ];

  return (
    <Section id="clubes">
      <div className="overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-surface to-bg-soft">
        <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              Para clubes
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Llená tu grilla y dejá de perder turnos
            </h2>
            <p className="mt-4 text-slate-300">
              Tus jugadores reservan solos, vos cobrás por adelantado y tenés
              todo controlado desde un panel. Empezá gratis y escalá cuando
              quieras.
            </p>
            <Link
              href="/registrar-club"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-accent-400 px-6 py-3 text-sm font-semibold text-[#06121f] shadow-lg shadow-brand-500/20 transition-transform hover:scale-[1.03]"
            >
              Registrá tu club gratis
              <ArrowRightIcon width={18} height={18} />
            </Link>
          </div>

          <ul className="space-y-3.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-300">
                  <CheckIcon width={15} height={15} />
                </span>
                <span className="text-slate-200">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Precios                                                                    */
/* -------------------------------------------------------------------------- */

function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/mes",
      desc: "Para empezar y probar.",
      features: ["1 cancha", "Reservas online", "Cobros con MercadoPago"],
      cta: "Empezar gratis",
      featured: false,
    },
    {
      name: "Pro",
      price: "$ a definir",
      period: "/mes",
      desc: "Para clubes en crecimiento.",
      features: [
        "Canchas ilimitadas",
        "Reportes y ocupación",
        "Subdominio con tu marca",
        "Soporte prioritario",
      ],
      cta: "Probar Pro",
      featured: true,
    },
    {
      name: "Multi-sede",
      price: "A medida",
      period: "",
      desc: "Para cadenas y franquicias.",
      features: ["Varias sedes", "Roles y permisos", "Integraciones a medida"],
      cta: "Hablar con ventas",
      featured: false,
    },
  ];

  return (
    <Section
      id="precios"
      eyebrow="Precios"
      title="Planes simples, sin sorpresas"
      subtitle="Sin comisiones para el jugador. Pagás solo por gestionar tu club."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={[
              "relative flex flex-col rounded-2xl border p-7",
              p.featured
                ? "border-brand-400/50 bg-surface ring-1 ring-brand-400/30"
                : "border-white/8 bg-surface/40",
            ].join(" ")}
          >
            {p.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-brand-400 to-accent-400 px-3 py-1 text-xs font-semibold text-[#06121f]">
                Más elegido
              </span>
            )}
            <h3 className="text-lg font-semibold text-white">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-400">{p.desc}</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="text-3xl font-bold text-white">{p.price}</span>
              <span className="pb-1 text-sm text-slate-400">{p.period}</span>
            </div>
            <ul className="mt-6 flex-1 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <CheckIcon width={16} height={16} className="text-brand-300" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/registrar-club"
              className={[
                "mt-7 rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-transform hover:scale-[1.02]",
                p.featured
                  ? "bg-gradient-to-r from-brand-400 to-accent-400 text-[#06121f]"
                  : "border border-white/15 bg-white/5 text-white hover:bg-white/10",
              ].join(" ")}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* CTA final                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="px-5 py-20 sm:px-8">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-brand-400/20 bg-gradient-to-br from-brand-500/15 via-surface to-accent-400/10 px-8 py-14 text-center sm:px-12">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
        <Ball className="animate-float pointer-events-none absolute -bottom-12 -left-10 hidden w-36 opacity-90 drop-shadow-2xl sm:block" />
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          ¿Listo para digitalizar tu club?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">
          Creá tu cuenta, cargá tus canchas y empezá a recibir reservas hoy
          mismo. Gratis para arrancar.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registrar-club"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-accent-400 px-7 py-3 text-sm font-semibold text-[#06121f] shadow-lg shadow-brand-500/25 transition-transform hover:scale-[1.03]"
          >
            Registrá tu club
            <ArrowRightIcon width={18} height={18} />
          </Link>
          <a
            href="#"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
          >
            <PhoneIcon width={18} height={18} />
            Hablar con nosotros
          </a>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Section wrapper                                                            */
/* -------------------------------------------------------------------------- */

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      {(eyebrow || title) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {eyebrow && (
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              {eyebrow}
            </span>
          )}
          {title && (
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-4 text-slate-400">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
