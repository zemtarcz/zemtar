/**
 * Jediný zdroj pravdy pro texty a kontakty.
 * Veřejný název, doména a kontakty: `siteConfig` (značka ZEMTAR).
 * G.T.S. smí být jen v `siteConfig.billing` (fakturace).
 * Hodnoty s example: true jsou UKÁZKOVÁ DATA – nahradit před spuštěním (BRIEF kap. 8–9).
 */

export type SiteBilling = {
  company: string;
  ico: string;
  dic: string;
  address: string;
};

export type SiteConfig = {
  name: string;
  domain: string;
  url: string;
  email: string;
  phone: string;
  /** `tel:` bez mezer, odvozené z `phone`. */
  phoneTel: string;
  tagline: string;
  serviceArea: string;
  billing: SiteBilling;
};

/** Veřejná doména značky. `url` se z ní skládá. */
const domain = "zemtar.cz";

/** Ověřený telefon z původního `site` – `phoneTel` se skládá z něj. */
const phone = "+420 724 518 782";

export const siteConfig: SiteConfig = {
  name: "ZEMTAR",
  domain,
  url: `https://${domain}`,
  email: "info@zemtar.cz",
  phone,
  phoneTel: `tel:${phone.replace(/[^\d+]/g, "")}`,
  tagline: "Zemní práce od A do Z",
  serviceArea:
    "Působíme hlavně na Domažlicku a v okolí, po domluvě přijedeme i dál.",
  billing: {
    company: "G.T.S. Poběžovice, spol. s r.o.",
    ico: "25921185",
    dic: "CZ25921185",
    address: "Na Sadech 12, 252 25 Zbuzany",
  },
};

export type ExampleString = {
  value: string;
  example: true;
};

export type SiteString = string | ExampleString;

export function ex(value: string): ExampleString {
  return { value, example: true };
}

export function unwrap(s: SiteString): string {
  return typeof s === "string" ? s : s.value;
}

export function isExample(s: SiteString): boolean {
  return typeof s !== "string" && s.example === true;
}

export function collectExamplePaths(
  obj: unknown,
  path = "site",
  out: string[] = [],
): string[] {
  if (obj && typeof obj === "object") {
    if ("example" in obj && (obj as ExampleString).example === true && "value" in obj) {
      out.push(path);
      return out;
    }
    for (const [k, v] of Object.entries(obj)) {
      collectExamplePaths(v, `${path}.${k}`, out);
    }
  }
  return out;
}

export const site = {
  name: siteConfig.name,
  domain: siteConfig.domain,
  /** Právnická osoba – jen fakturace, ne značka webu. */
  operator: siteConfig.billing.company,
  ico: siteConfig.billing.ico,
  dic: siteConfig.billing.dic,
  phone: siteConfig.phone,
  phoneHref: siteConfig.phoneTel,
  email: siteConfig.email,
  emailHref: `mailto:${siteConfig.email}`,
  /** Provozovna (Kontakt, JSON-LD). Sídlo je `billing.address`. */
  address: "Žižkova 188, 345 22 Poběžovice",
  /** Sídlo dle ARES; zápis v OR ještě ověřit se Zbyňkem. */
  hqAddress: siteConfig.billing.address,
  registry:
    "Zapsaná v obchodním rejstříku vedeném Městským soudem v Praze, oddíl C, vložka 103687.",
  openingHours: "Po–Čt 7:00–16:30, Pá 7:00–11:00",
  contactPerson: "Zbyněk Švec",
  areaLabel: siteConfig.serviceArea,
  geo: {
    lat: 49.5107,
    lng: 12.8028,
    radiusM: 50_000,
  },
  vatRate: 0.21,
  responseSla: ex("1 pracovního dne"),
  hero: {
    h1: "Zemní práce od A do Z",
    /** Dva řádky pro display font; musí dát dohromady `h1`. */
    h1Lines: ["Zemní práce", "od A do Z"] as const,
    subtitle:
      "Výkopy, terénní úpravy, přípojky, odvoz suti a kontejnerová doprava. Postaráme se o celou zakázku – od přistavení techniky po odvoz materiálu.",
    cta: "Nezávazně poptat",
    secondary: "Zavolejte nám",
  },
  claim: {
    title: "Jedna firma, jeden telefon, hotová práce.",
    points: [
      "Strojník v ceně",
      "Vlastní doprava MAN",
      "Kontejner na suť hned na místě",
    ],
    years: ex("[X let praxe]"),
    jobs: ex("[X zakázek]"),
  },
  nav: [
    { href: "#sluzby", label: "Služby" },
    { href: "#technika", label: "Technika" },
    { href: "#oblast", label: "Oblast" },
    { href: "#faq", label: "Často kladené otázky" },
    { href: "#cenik", label: "Ceník" },
    { href: "#kontakt", label: "Poptávka" },
  ],
  services: [
    {
      id: "vykopy",
      title: "Zemní a výkopové práce",
      text: "Základy, přípojky, jímky, bazény i vrtání děr na oplocení – přesně podle pozemku.",
      bullets: [
        "Základy a pasy",
        "Přípojky vody, kanalizace, elektro",
        "Jímky, ČOV, bazény",
        "Vrtání děr na oplocení",
      ],
      image: "/photos/placeholder/pc38mr-action.webp",
      imageAlt: "Komatsu PC38MR při výkopových pracích",
    },
    {
      id: "teren",
      title: "Terénní úpravy",
      text: "Srovnání, modelace, kátrování zeminy a příprava pozemku před stavbou nebo zahradou.",
      bullets: [
        "Srovnání a modelace",
        "Kátrování zeminy",
        "Příprava pozemku",
        "Drenáže a odvodnění",
      ],
      image: "/photos/pc38mr-studio.webp",
      imageAlt: "Minibagr Komatsu PC38MR",
    },
    {
      id: "preprava",
      title: "Přeprava",
      text: "Plošina s navijákem – stroje, auta i jiné náklady. Využijete ji i samostatně, bez bagru; po domluvě i jako odtah.",
      bullets: [
        "Stroje, auta i různé náklady",
        "Naviják – možnost odtahu",
        "Vlastní MAN TGL 12.220",
      ],
      image: "/photos/man-tgl-real.webp",
      imageAlt: "MAN TGL 12.220 s plošinou MULTITEC",
    },
    {
      id: "sut",
      title: "Kontejnery a odvoz suti",
      text: "Přistavíme suťový nebo plošinový kontejner 4,5 m (~5 m³) – i bez bagru, jen na odvoz materiálu.",
      bullets: [
        "Suťový i plošinový kontejner",
        "Odvoz suti a zeminy",
        "Likvidace dle druhu",
      ],
      image: "/photos/placeholder/kontejner-sutovy.webp",
      imageAlt: "Suťový kontejner 4,5 m",
    },
  ],
  servicesIntro:
    "Výkopy, terén, přeprava i kontejnery – každou techniku i zvlášť, podle toho, co potřebujete.",
  // Interní poznámky (nerenderovat na webu): studio stills Dreamina (28. 10. 2026);
  // Orientační parametry (šířka/hloubka PC38MR, nosnost plošiny, objem/max. náklad kontejnerů) – doladit u provozovatele.
  fleet: [
    {
      id: "bagr",
      title: "Komatsu PC38MR",
      image: "/photos/pc38mr-studio.webp",
      imageAlt: "Minibagr Komatsu PC38MR ve studiu",
      specs: [
        { label: "Provozní hmotnost", value: "přibližně 3,7–4,0 t", unit: "" },
        { label: "Šířka", value: 1.74, unit: "m", decimals: 2 },
        { label: "Hloubka výkopu", value: 3.45, unit: "m", decimals: 2 },
        { label: "Záď", value: "zkrácený přesah", unit: "" },
      ],
      blurb:
        "Kompaktní pásové minirypadlo – výkopy, terénní úpravy a práce ve stísněných prostorách.",
    },
    {
      id: "man",
      title: "MAN TGL 12.220 + MULTITEC",
      image: "/photos/man-tgl-studio.webp",
      imageAlt: "Nákladní auto MAN TGL s plošinou a minibagrem",
      specs: [
        { label: "Celková hmotnost", value: 12, unit: "t", decimals: 0 },
        { label: "Výkon", value: "162 kW (220 k)", unit: "" },
        { label: "Nápravy", value: "4×2", unit: "" },
        { label: "Nástavba", value: "plošina MULTITEC", unit: "" },
        { label: "Nosnost plošiny", value: "cca 5 t", unit: "" },
      ],
      blurb:
        "Přepravní plošina MULTITEC – stavební stroje, mechanismy a další technika. Dá se použít samostatně.",
    },
    {
      id: "kontejnery",
      title: "Kontejnery 4,5 m",
      image: "/photos/kontejnery-studio.webp",
      imageAlt: "Kontejnery – plato a suťový",
      specs: [
        { label: "Počet", value: 2, unit: "ks", decimals: 0 },
        { label: "Délka", value: 4.5, unit: "m", decimals: 1 },
        { label: "Objem", value: "cca 5 m³", unit: "" },
        { label: "Typy", value: "plošinový + suťový", unit: "" },
        { label: "Max. náklad", value: "cca 5 t", unit: "" },
      ],
      blurb:
        "Suťový i plošinový, 4,5 m (cca 5 m³). Přistavení a odvoz – i bez bagru, jen na materiál.",
    },
  ],
  pricing: [
    {
      id: "bagr-hodina",
      title: "Minibagr s obsluhou",
      amountExVat: 1200,
      unit: "/h",
      note: "stroj + strojník + palivo; včetně času naložení, přepravy a vyložení",
      example: true as const,
    },
    {
      id: "prostoj",
      title: "Prostoj bagru s obsluhou",
      amountExVat: 700,
      unit: "/h",
      note: "čekání na stavbě bez práce",
      example: true as const,
    },
    {
      id: "minimum",
      title: "Minimální zakázka",
      amountExVat: 4800,
      unit: "",
      badge: "4 h",
      example: true as const,
    },
    {
      id: "doprava",
      title: "Doprava",
      amountExVat: 42,
      unit: "/km",
      note: "km tam i zpět (auto); čas naložení/vyložení v hodinách bagru",
      example: true as const,
    },
    {
      id: "kontejner",
      title: "Přistavení kontejneru 4,5 m (~5 m³)",
      amountExVat: 2400,
      unit: "",
      note: "1–3 dny stání; jen přistavení, bez odvozu a likvidace",
      example: true as const,
    },
    {
      id: "kontejner-7d",
      title: "Kontejner 4–7 dní stání",
      amountExVat: 3200,
      unit: "",
      note: "jen přistavení, bez odvozu a likvidace",
      example: true as const,
    },
    {
      id: "kontejner-14d",
      title: "Kontejner 8–14 dní stání",
      amountExVat: 4500,
      unit: "",
      note: "jen přistavení, bez odvozu a likvidace",
      example: true as const,
    },
    {
      id: "sut-odvoz",
      title: "Odvoz a likvidace suti / zeminy",
      amountExVat: 2000,
      unit: "",
      from: true,
      note: "k přistavení; přesná cena dle druhu a množství",
      example: true as const,
    },
  ],
  /** Stupně stání kontejneru (max. dny → cena bez DPH). */
  containerStandingTiers: [
    { maxDays: 3, amountExVat: 2400 },
    { maxDays: 7, amountExVat: 3200 },
    { maxDays: 14, amountExVat: 4500 },
  ] as const,
  pricingDisclaimer:
    "Ceny jsou orientační, bez DPH. Přesnou cenu potvrdíme předem v odpovědi na poptávku.",
  towns: {
    bold: [
      "Poběžovice",
      "Domažlice",
      "Horšovský Týn",
      "Klatovy",
      "Tachov",
      "Stříbro",
    ],
    all: [
      "Poběžovice",
      "Hostouň",
      "Horšovský Týn",
      "Bělá nad Radbuzou",
      "Domažlice",
      "Kdyně",
      "Holýšov",
      "Staňkov",
      "Přimda",
      "Bor",
      "Stod",
      "Stříbro",
      "Tachov",
      "Klatovy",
      "Klenčí pod Čerchovem",
      "Česká Kubice",
      "Koloveč",
      "Všeruby",
      "Kout na Šumavě",
      "Meclov",
      "Mutěnín",
      "Rybník",
      "Trhanov",
      "Blížejov",
    ],
  },
  scrollTexts: [
    { start: 0, end: 0.3, title: "Výkopy a základy" },
    { start: 0.3, end: 0.58, title: "Terénní úpravy" },
    {
      start: 0.58,
      end: 0.84,
      title: "Stísněné prostory",
      subtitle: "1,74 m",
      detail: "šířka stroje",
    },
    {
      start: 0.84,
      end: 1,
      title: "Jdeme do hloubky",
      subtitle: "3,45 m",
      detail: "hloubka výkopu",
    },
  ],
  truckCopy: "Přeprava vlastní plošinou MAN TGL 12.220 – stroje, auta i jiné náklady.",
  gallery: [
    {
      src: "/photos/man-tgl-real.webp",
      alt: "MAN TGL 12.220 s plošinou MULTITEC",
      example: false,
    },
    {
      src: "/photos/placeholder/pc38mr-action.webp",
      alt: "Komatsu PC38MR při práci (placeholder výrobce)",
      example: true,
    },
    {
      src: "/photos/placeholder/pc38mr-cutout.webp",
      alt: "Komatsu PC38MR (placeholder produkt)",
      example: true,
    },
    {
      src: "/photos/placeholder/kontejner-plato.webp",
      alt: "Kontejner plato 4,5 m (placeholder)",
      example: true,
    },
    {
      src: "/photos/placeholder/kontejner-sutovy.webp",
      alt: "Suťový kontejner 4,5 m (placeholder)",
      example: true,
    },
    {
      src: "/photos/placeholder/man-tgl-bok.webp",
      alt: "MAN TGL z boku (placeholder – souhlas provozovatele)",
      example: true,
    },
  ],
  faq: [
    {
      q: "Je v ceně i obsluha bagru?",
      a: "Ano – stroj, zkušený strojník i palivo.",
    },
    {
      q: "Na jaké práce se minibagr hodí?",
      a: "Základy, přípojky (voda, kanalizace, elektro), bazény, jímky a ČOV, vrtání děr na oplocení, drenáže, srovnání, kátrování zeminy a příprava pozemku.",
    },
    {
      q: "Kam se bagr vejde?",
      a: "Šířka 1,74 m (průjezd ~1,8 m), krátká záď. Nejste-li si jistí, popište přístup v poptávce.",
    },
    {
      q: "Poškodí bagr trávník nebo dlažbu?",
      a: "Gumové pásy jsou šetrné; na citlivé povrchy lze položit ochranné desky.",
    },
    {
      q: "Kolik to stojí a jak se počítá doprava?",
      a: "Orientačně 1200 Kč/h bez DPH (min. 4 h) – do hodin patří i naložení, přeprava a vyložení. Doprava auta 42 Kč/km tam i zpět. Prostoj (čekání na stavbě) 700 Kč/h. Přesnou cenu řekneme předem.",
    },
    {
      q: "Co s vykopanou zeminou a sutí?",
      a: "Přistavíme kontejner 4,5 m (~5 m³): 1–3 dny 2400 Kč, do 7 dnů 3200 Kč, do 14 dnů 4500 Kč (jen stání). Odvoz a likvidace zvlášť – orientačně od 2000 Kč dle množství.",
    },
    {
      q: "Potřebuji povolení na kontejner?",
      a: "Na vlastním pozemku ne; na chodníku/silnici je potřeba zábor od obce – poradíme.",
    },
    {
      q: "Co potřebujete k nacenění?",
      a: "Co a kde, rozsah (délka, hloubka) a přístup na pozemek – vše jde napsat do poptávky.",
    },
    {
      q: "Co když prší?",
      a: "Při běžném dešti pracujeme; při lijáku se domluvíme na posunu bez poplatku.",
    },
    {
      q: "Jak se platí?",
      a: "Převodem na fakturu po dokončení.",
    },
  ],
  /** Možnosti multi-selectu v poptávce; `value` = slug pro `?sluzba=`. */
  inquiryTypes: [
    { value: "vykop", label: "Výkop" },
    { value: "vrtani-der", label: "Vrtání děr na sloupky" },
    { value: "odvoz-suti", label: "Odvoz suti + kontejner" },
    { value: "teren", label: "Terénní úpravy" },
    { value: "pripojky", label: "Přípojky" },
    { value: "odvodneni", label: "Odvodnění" },
    { value: "prosevani", label: "Prosévání zeminy" },
    { value: "katrovani", label: "Kátrování zeminy" },
    { value: "kontejnerova-doprava", label: "Kontejnerová doprava" },
    { value: "doprava-stroju", label: "Doprava / přeprava strojů" },
    { value: "plosina-navijak", label: "Plošina s navijákem / odtah" },
    { value: "jine", label: "Jiné" },
  ],
  /** Alias starých / sekčních id → slug poptávky (`?sluzba=`). */
  inquiryServiceAliases: {
    vykopy: "vykop",
    preprava: "doprava-stroju",
    sut: "odvoz-suti",
  } as const,
  /** Max. velikost jedné fotky v poptávce (MB). */
  inquiryPhotoMaxMb: 5,
  meta: {
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: `Kompletní zemní práce od A do Z – výkopy, terénní úpravy, přípojky, odvoz suti a kontejnerová doprava. ${siteConfig.serviceArea}`,
  },
} as const;

export type Site = typeof site;

export function withVat(amountExVat: number, vatRate = site.vatRate): number {
  return Math.round(amountExVat * (1 + vatRate) * 100) / 100;
}

export function formatCzk(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}
