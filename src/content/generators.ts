import { createRng } from "@/engine";
import type { Difficulty, Mode } from "@/types";

import { getDailyWordsV1, getModeWordsV1 } from "./legacy/v1/generators";
import {
  FINANCE_CODE_TERMS,
  FINANCE_TERMS,
  FINANCE_TERM_WEIGHTS,
  type FinanceTier,
} from "./finance-bank";

/** Content snapshots are part of the replay contract. Bump when output changes. */
export const CONTENT_VERSION = 3 as const;

type PoolKind = "terms" | "office" | "numbers" | "excel";
type PoolItem = {
  text: string;
  difficulty: Difficulty;
  kind: PoolKind;
  weight?: number;
};
const DIFFICULTY_ORDER: readonly Difficulty[] = ["easy", "medium", "hard"];

const TERM_ROOTS = [
  "accretion",
  "acquisition",
  "active-management",
  "adjusted-ebitda",
  "agency-cost",
  "alpha",
  "amortization",
  "annualized-return",
  "arbitrage",
  "asset-allocation",
  "asset-backed-security",
  "asset-turnover",
  "at-the-money",
  "average-cost",
  "backlog",
  "balloon-payment",
  "barrier-option",
  "basis-point",
  "bear-market",
  "benchmark",
  "beta",
  "bid-ask-spread",
  "billings",
  "bond-equivalent-yield",
  "book-value",
  "break-even",
  "bridge-loan",
  "buyback",
  "buyout",
  "call-option",
  "capital-account",
  "capital-call",
  "capital-expenditure",
  "capital-structure",
  "capitalization-rate",
  "carry",
  "cash-conversion",
  "cash-flow",
  "cash-sweep",
  "catalyst",
  "ceiling",
  "central-bank",
  "churn",
  "collar",
  "collateral",
  "commercial-paper",
  "comparable-company",
  "concentration",
  "concession",
  "confirmation",
  "contango",
  "contribution-margin",
  "convertible",
  "convexity",
  "corporate-action",
  "corporate-finance",
  "correlation",
  "covenant",
  "coverage-ratio",
  "credit-default-swap",
  "credit-facility",
  "credit-spread",
  "cross-currency",
  "currency-hedge",
  "current-assets",
  "current-liabilities",
  "custody",
  "default-rate",
  "debt-capacity",
  "debt-financing",
  "debt-service",
  "deferred-tax",
  "delinquency",
  "depreciation",
  "derivative",
  "dilution",
  "discount-factor",
  "discount-rate",
  "distribution",
  "dividend",
  "dividend-yield",
  "drawdown",
  "duration",
  "earnings-quality",
  "earnout",
  "economic-profit",
  "effective-tax-rate",
  "embedded-option",
  "enterprise-value",
  "equity-bridge",
  "equity-compensation",
  "equity-research",
  "equity-risk-premium",
  "esg",
  "eurodollar",
  "event-driven",
  "excess-return",
  "exchange-rate",
  "exit-multiple",
  "expense-ratio",
  "fair-value",
  "fast-market",
  "fcfe",
  "fcff",
  "fed-funds",
  "fiduciary",
  "financing-commitment",
  "fintech",
  "first-lien",
  "fixed-income",
  "float",
  "floor",
  "foreign-exchange",
  "forward-rate",
  "free-cash-flow",
  "fund-accounting",
  "fund-of-funds",
  "fundraising",
  "gamma",
  "gross-margin",
  "growth-equity",
  "haircut",
  "hard-dollar",
  "hedge-fund",
  "hurdle-rate",
  "impairment",
  "implied-volatility",
  "income-statement",
  "index-fund",
  "inflation",
  "information-ratio",
  "initial-public-offering",
  "interest-coverage",
  "interest-rate",
  "inventory-turnover",
  "irr",
  "j-curve",
  "joint-venture",
  "junk-bond",
  "key-rate-duration",
  "knock-in",
  "knock-out",
  "lbo",
  "lease-liability",
  "levered-beta",
  "levered-buyout",
  "leverage-ratio",
  "liability-management",
  "liquidation",
  "liquidity",
  "loan-to-value",
  "long-short",
  "lp",
  "management-fee",
  "margin-call",
  "market-capitalization",
  "market-maker",
  "market-risk",
  "materiality",
  "maturity",
  "merger-arbitrage",
  "mezzanine",
  "modified-duration",
  "monetary-policy",
  "money-market",
  "moic",
  "mortgage-backed-security",
  "moving-average",
  "municipal-bond",
  "mutual-fund",
  "net-asset-value",
  "net-debt",
  "net-income",
  "net-interest-margin",
  "net-present-value",
  "net-working-capital",
  "notional",
  "offering",
  "operating-leverage",
  "operating-margin",
  "option-adjusted-spread",
  "optionality",
  "order-book",
  "overcollateralization",
  "par-value",
  "pari-passu",
  "paydown",
  "payment-rail",
  "performance-fee",
  "perpetuity",
  "pipeline",
  "portfolio-company",
  "portfolio-turnover",
  "preferred-equity",
  "prepayment",
  "price-to-book",
  "price-to-earnings",
  "pricing-power",
  "prime-broker",
  "private-credit",
  "private-equity",
  "pro-forma",
  "proceeds",
  "profitability",
  "put-option",
  "quality-factor",
  "quantitative-easing",
  "quarterly-report",
  "rate-cut",
  "rate-hike",
  "receivables",
  "recapitalization",
  "reconciliation",
  "regulatory-capital",
  "relative-value",
  "remaining-performance-obligation",
  "repo",
  "repurchase",
  "reserves",
  "residual-value",
  "restructuring",
  "return-on-equity",
  "return-on-invested-capital",
  "revenue-recognition",
  "revolver",
  "risk-adjusted-return",
  "risk-free-rate",
  "rollover",
  "royalty",
  "run-rate",
  "sales-pipeline",
  "scenario-analysis",
  "secondary-offering",
  "securitization",
  "senior-debt",
  "sensitivity-analysis",
  "share-count",
  "shareholder-yield",
  "short-interest",
  "short-squeeze",
  "sigma",
  "sinking-fund",
  "sofr",
  "solvency",
  "spread",
  "spot-rate",
  "straddle",
  "strike-price",
  "subordination",
  "subscription-revenue",
  "supply-chain-finance",
  "swap",
  "synergy",
  "tail-risk",
  "tax-shield",
  "term-loan",
  "theta",
  "time-value",
  "total-return",
  "tracking-error",
  "tranche",
  "treasury-yield",
  "turnaround",
  "underwriting",
  "unlevered-free-cash-flow",
  "valuation",
  "value-at-risk",
  "venture-capital",
  "vertical-integration",
  "volatility",
  "wacc",
  "waterfall",
  "working-capital",
  "write-down",
  "yield-curve",
  "yield-to-maturity",
  "zero-coupon",
] as const;

// A compact, curated symbol bank. It covers US, TSX, global ADR, ETF, rates,
// commodities, FX, and digital-asset symbols.
const TICKERS =
  `AAPL ABBV ABNB ABT ACGL ACN ADBE ADI ADM AEE AES AFL AIG AJG AKAM ALB ALGN ALL ALLE AMAT AMCR AMD AME AMGN AMP AMT AMZN ANET ANSS AON APA APD APH APO APP ARKK ARKG ASML AVB AVGO AVTR AXP AZO BA BAC BALL BAX BBD BCS BDX BEN BIIB BILI BK BKNG BKR BLK BMO BMY BOIL BOX BP BRK.A BRK.B BRO BSX BTE BYND C CAG CAH CARR CAT CB CBRE CCI CDNS CEG CELH CF CFG CHD CHKP CHRW CHTR CI CINF CL CLF CMI CNC CNQ COF COIN COO COP COST CP CPB CPRT CRM CROX CRSP CSCO CSGP CSX CTAS CTRA CTSH CVNA CVS CVX D DAL DASH DD DE DECK DFS DG DHI DHR DIS DKNG DLTR DLR DOCU DOV DOW DPZ DRI DUK DVN DXCM EA EBAY ECL ED EEM EFA EL ELV EMR ENB ENPH ENTG EOG EPAM EQIX EQR ETR ETN ETSY EVGO EW EWT EXAS EXC EXPD EXPE F FAST FCX FDS FDX FE FICO FIS FITB FIVE FL FLOT FMC FOX FOXA FSLR FTNT FTS FTV GD GDDY GDX GDXJ GE GEV GFI GGAL GILD GIS GLD GLW GM GNRC GOOG GOOGL GPC GPN GS GSK GTLB HAL HAS HBAN HCA HD HES HIG HII HLT HON HOOD HPE HPQ HR HRL HSIC HST HSY HUBS HUM HWM IBM ICE ICLN IDXX IEF IEMG IFF IHI ILMN INDA INTC INTU INVH IP IQV IRM ISRG IT ITW IVV IWM IYR JCI JD JNJ JPM JPS JWN K KDP KEY KHC KIM KKR KLAC KMB KMI KMX KO KR KRE L LAC LAD LAUR LEN LI LHX LIN LKQ LLY LMT LNG LOW LPLA LRCX LULU LVS LYB LYFT LYV MA MANH MAR MCD MCHP MCK MDB MDLZ MDT MDY MET META MGM MHK MKC MKSI MMC MMM MNST MO MOH MOS MPC MRK MRNA MRVL MSFT MSTR MSI MTB MTCH MU NDAQ NEE NEM NFLX NKE NLY NOC NOG NOW NRG NSC NTAP NTR NVDA NVO NVS NWL NWS NWSA NXPI O ODFL OHI OMC ON ONON ORCL ORLY OXY PANW PARA PATH PAYC PAYO PBR PEP PFE PFF PG PGR PH PINC PLD PLTR PM PNC PNR PPG PPL PRU PSA PSX PTC PTON PWR PYPL QCOM QQQ RBLX RCL REG REGN RF RIVN RKT RMD ROK ROST RSG RTX RUN RYAAY S SAN SAP SBUX SCHW SCI SE SEDG SHOP SHW SIGI SLB SLV SMCI SNA SNOW SO SOFI SONY SOXX SPOT SPY SQ SRPT SRE STI STLD STNE STX STT SU SYF SYK SYY T TD TGT TJX TKO TMO TMUS TOST TROW TRP TRV TSCO TSLA TSM TSN TT TTD TTE TWLO TXN TXT U UAA UA UBER UDR UL UNH UNP UPS URI USB USO UUP V VFC VICI VLO VMC VNO VOD VOO VRTX VST VTI VTR VTRS W WBA WBD WDC WEC WELL WFC WM WMB WMT WPC WRB WSM WTW WY X XEL XLF XLI XLK XLP XLU XLV XLY XOM XPEV XRT XYL YUM Z ZBH ZBRA ZM ZS ZTO AC.TO AEM.TO ATD.TO BCE.TO BMO.TO BNS.TO CCO.TO CNR.TO CP.TO CSU.TO CVE.TO DOL.TO EMA.TO ENB.TO FM.TO FNV.TO GIB.A.TO GIL.TO H.TO IFC.TO IMO.TO IGM.TO L.TO MFC.TO MG.TO NA.TO NTR.TO OTEX.TO POW.TO PPL.TO QSR.TO RY.TO SAP.TO SHOP.TO SLF.TO SU.TO TD.TO TECK.B.TO TFII.TO TRI.TO WCN.TO WFG.TO WN.TO WSP.TO X.TO EURUSD GBPUSD USDJPY USDCHF USDCAD AUDUSD NZDUSD EURGBP EURJPY GBPJPY USDNOK USDMXN USDBRL USDCNH DXY BTCUSD ETHUSD SOLUSD XBTUSD GC CL SI HG NG ZB ZN ZF ZT ES NQ RTY YM VX VIX`.split(
    /\s+/,
  );

const OFFICE_SUBJECTS = [
  "the board pack",
  "the valuation bridge",
  "the diligence tracker",
  "the forecast file",
  "the lender model",
  "the investor update",
  "the operating case",
  "the KPI dashboard",
  "the diligence list",
  "the IC memo",
  "the capital plan",
  "the closing checklist",
  "the data room",
  "the sensitivity table",
  "the monthly pack",
  "the meeting notes",
  "the hiring plan",
  "the product brief",
  "the pipeline review",
  "the risk register",
  "the cash flow model",
  "the covenant schedule",
  "the equity story",
  "the market update",
  "the pricing file",
] as const;
const OFFICE_VERBS = [
  "needs a final review",
  "is ready for comments",
  "should be reconciled",
  "is moving to the next draft",
  "needs owner sign-off",
  "is waiting on one input",
  "can go to the committee",
  "should be circulated today",
  "needs a clean tie-out",
  "is ready for the client",
  "needs a source check",
  "is now in the data room",
] as const;
const OFFICE_OBJECTS = [
  "before the noon call",
  "after the finance review",
  "before the lender update",
  "for tomorrow's meeting",
  "once the numbers are refreshed",
  "with the latest assumptions",
  "after legal confirms the language",
  "before we lock the appendix",
  "with a clear audit trail",
  "before the weekly forecast",
  "for the senior review",
  "after the sensitivity pass",
  "with owners beside every action",
  "before the close of business",
] as const;
const OFFICE_TEMPLATES = [
  (s: string, v: string, o: string) => `${s} ${v} ${o}.`,
  (s: string, v: string, o: string) => `Please confirm that ${s} ${v} ${o}.`,
  (s: string, v: string, o: string) =>
    `We will update ${s} when ${o} and ${v}.`,
  (s: string, v: string, o: string) => `The team expects ${s} to be ${v} ${o}.`,
  (s: string, v: string, o: string) => `Can you check whether ${s} ${v} ${o}?`,
  (s: string, v: string, o: string) =>
    `For the next pass, keep ${s} ${v} ${o}.`,
  (s: string, v: string, o: string) => `A quick note: ${s} ${v} ${o}.`,
  (s: string, v: string, o: string) =>
    `Before we send it, confirm ${s} ${v} ${o}.`,
] as const;

function difficultyFor(index: number): Difficulty {
  return DIFFICULTY_ORDER[index % DIFFICULTY_ORDER.length] ?? "medium";
}

function difficultyForTier(tier: FinanceTier): Difficulty {
  // The common bank is intentionally available in the default medium queue;
  // “easy” remains reserved for the simple numeric and office tokens.
  if (tier === "core") return "medium";
  if (tier === "specialist") return "hard";
  return "medium";
}

function buildTerms(): PoolItem[] {
  const byText = new Map<string, PoolItem>();
  const add = (item: PoolItem) => {
    const existing = byText.get(item.text);
    if (!existing || (item.weight ?? 1) > (existing.weight ?? 1))
      byText.set(item.text, item);
  };

  (Object.keys(FINANCE_TERMS) as FinanceTier[]).forEach((tier) => {
    FINANCE_TERMS[tier].forEach((text, index) =>
      add({
        text,
        difficulty: difficultyForTier(tier),
        kind: "terms",
        weight: FINANCE_TERM_WEIGHTS[tier] + (index % 3 === 0 ? 1 : 0),
      }),
    );
  });

  // These are still useful, established finance phrases, but they sit below
  // the single-word core rather than being multiplied into synthetic forms.
  TERM_ROOTS.forEach((text, index) =>
    add({
      text,
      difficulty: difficultyFor(index + 1),
      kind: "terms",
      weight: text.includes("-") ? 1 : 3,
    }),
  );
  TICKERS.forEach((ticker, index) =>
    add({
      text: ticker,
      difficulty: difficultyFor(index),
      kind: "terms",
      weight: 3,
    }),
  );
  FINANCE_CODE_TERMS.forEach((text, index) =>
    add({
      text,
      difficulty: difficultyFor(index + 1),
      kind: "terms",
      weight: 4,
    }),
  );
  return [...byText.values()];
}

function buildOffice(): PoolItem[] {
  const items: PoolItem[] = [];
  let index = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    OFFICE_SUBJECTS.forEach((subject, subjectIndex) =>
      OFFICE_VERBS.forEach((verb, verbIndex) =>
        OFFICE_OBJECTS.forEach((object, objectIndex) => {
          const template =
            OFFICE_TEMPLATES[
              (subjectIndex + verbIndex + objectIndex + pass) %
                OFFICE_TEMPLATES.length
            ] ?? OFFICE_TEMPLATES[0];
          const text = template(subject, verb, object);
          if (!items.some((item) => item.text === text)) {
            items.push({
              text,
              difficulty: difficultyFor(index),
              kind: "office",
            });
            index += 1;
          }
        }),
      ),
    );
  }
  return items;
}

function buildNumbers(): PoolItem[] {
  const items: PoolItem[] = [];
  const currencies = [
    "$",
    "€",
    "£",
    "¥",
    "C$",
    "A$",
    "CHF",
    "USD",
    "EUR",
    "GBP",
    "CAD",
    "JPY",
  ];
  const formatInteger = (value: number): string => {
    const raw = String(Math.trunc(value));
    let formatted = "";
    for (let index = 0; index < raw.length; index += 1) {
      if (index > 0 && (raw.length - index) % 3 === 0) formatted += ",";
      formatted += raw[index];
    }
    return formatted;
  };
  for (let index = 0; index < 720; index += 1) {
    const whole = 12 + ((index * 7919) % 9_000_000);
    const decimals = (index * 37) % 100;
    const unit =
      index % 5 === 0
        ? "%"
        : index % 5 === 1
          ? "x"
          : index % 5 === 2
            ? "bps"
            : index % 5 === 3
              ? "M"
              : "B";
    const prefix = currencies[index % currencies.length];
    const number = `${prefix}${formatInteger(whole)}.${String(decimals).padStart(2, "0")}${unit}`;
    items.push({
      text: number,
      difficulty: difficultyFor(index + 1),
      kind: "numbers",
    });
  }
  return items;
}

function cell(index: number): string {
  return `${String.fromCharCode(65 + (index % 8))}${2 + (index % 98)}`;
}

function buildExcel(): PoolItem[] {
  const formulas = [
    "=SUM(B2:B12)",
    "=AVERAGE(C4:C24)",
    "=IF(D5>0,D5/E5,0)",
    "=IFERROR(VLOOKUP(A2,Data!A:F,6,FALSE),0)",
    "=XLOOKUP(A2,Data!A:A,Data!F:F,0)",
    "=INDEX(Data!F:F,MATCH(A2,Data!A:A,0))",
    "=SUMIFS(Revenue,Region,A2)",
    "=NPV(DiscountRate,CashFlows)+InitialInvestment",
    "=IRR(C3:C9)",
    "=EOMONTH(A2,12)",
    "=SUMPRODUCT(B2:B20,C2:C20)",
  ];
  for (let index = 0; index < 420; index += 1) {
    const a = cell(index),
      b = cell(index + 7),
      c = cell(index + 13),
      sheet = `Model${(index % 9) + 1}`;
    const template = index % 12;
    const formula =
      template === 0
        ? `=SUM(${sheet}!${a}:${sheet}!${b})`
        : template === 1
          ? `=AVERAGE(${sheet}!${a}:${sheet}!${b})`
          : template === 2
            ? `=IF(${a}>0,${a}/${b},0)`
            : template === 3
              ? `=IFERROR(VLOOKUP(${a},${sheet}!A:F,${(index % 6) + 1},FALSE),0)`
              : template === 4
                ? `=XLOOKUP(${a},${sheet}!A:A,${sheet}!F:F,0)`
                : template === 5
                  ? `=INDEX(${sheet}!F:F,MATCH(${a},${sheet}!A:A,0))`
                  : template === 6
                    ? `=SUMIFS(${sheet}!F:F,${sheet}!B:B,${a})`
                    : template === 7
                      ? `=NPV(${((index % 15) + 5) / 100},${sheet}!${a}:${sheet}!${c})`
                      : template === 8
                        ? `=IRR(${sheet}!${a}:${sheet}!${c})`
                        : template === 9
                          ? `=EOMONTH(${a},${index % 24})`
                          : template === 10
                            ? `=SUMPRODUCT(${sheet}!${a}:${sheet}!${b},${sheet}!${b}:${sheet}!${c})`
                            : `=IFERROR((${a}-${b})/${c},0)`;
    formulas.push(formula);
  }
  return formulas.map((text, index) => ({
    text,
    difficulty: difficultyFor(index),
    kind: "excel",
  }));
}

const TERMS = buildTerms();
const OFFICE = buildOffice();
const OFFICE_TOKENS: PoolItem[] = Array.from(
  new Set(
    OFFICE.flatMap((line) =>
      line.text
        .toLowerCase()
        .replace(/[^a-z0-9$%./-]+/g, " ")
        .trim()
        .split(/\s+/),
    )
      .concat(FINANCE_TERMS.core)
      .concat(FINANCE_TERMS.accounting)
      .concat(FINANCE_TERMS.workflow)
      .concat(FINANCE_TERMS.markets)
      .concat(FINANCE_TERMS.banking)
      .concat(FINANCE_TERMS.specialist)
      .concat(FINANCE_CODE_TERMS),
  ),
).map((text, index) => ({
  text,
  difficulty: difficultyFor(index + 2),
  kind: "office",
  weight: 4,
}));
const NUMBERS = buildNumbers();
const EXCEL = buildExcel();

function suitable(
  items: readonly PoolItem[],
  difficulty: Difficulty,
): PoolItem[] {
  const targetIndex = DIFFICULTY_ORDER.indexOf(difficulty);
  const preferred = DIFFICULTY_ORDER.slice(targetIndex).flatMap((tier) =>
    items.filter((item) => item.difficulty === tier),
  );
  return preferred.length >= items.length / 4
    ? preferred
    : [...preferred, ...items.filter((item) => item.difficulty !== difficulty)];
}

function draw(
  pool: readonly PoolItem[],
  count: number,
  rng: ReturnType<typeof createRng>,
): PoolItem[] {
  if (pool.length === 0 || count <= 0) return [];
  const output: PoolItem[] = [];
  const seen = new Set<string>();
  let remaining = weightedShuffle(pool, rng);
  let recent: string[] = [];
  while (output.length < count) {
    if (remaining.length === 0) {
      remaining = weightedShuffle(
        pool.filter((item) => !recent.includes(item.text)),
        rng,
      );
      if (remaining.length === 0) remaining = weightedShuffle(pool, rng);
    }
    const next = remaining.shift();
    if (!next) break;
    if (seen.has(next.text) && seen.size < pool.length) continue;
    output.push(next);
    seen.add(next.text);
    recent = [...recent.slice(-39), next.text];
  }
  return output;
}

function weightedShuffle(
  pool: readonly PoolItem[],
  rng: ReturnType<typeof createRng>,
): PoolItem[] {
  return rng
    .shuffle(pool)
    .map((item, index) => ({
      item,
      index,
      // Efraimidis-Spirakis style priority: larger weights are more likely to
      // appear early, while each draw still remains deterministic and unique.
      priority: Math.pow(
        Math.max(rng.next(), Number.EPSILON),
        1 / (item.weight ?? 1),
      ),
    }))
    .sort(
      (left, right) =>
        right.priority - left.priority || left.index - right.index,
    )
    .map(({ item }) => item);
}

function drawMixed(
  count: number,
  seed: string,
  difficulty: Difficulty,
): string[] {
  const pools = [TERMS, OFFICE_TOKENS, NUMBERS, EXCEL].map((pool) =>
    suitable(pool, difficulty),
  );
  const queues = pools.map((pool, index) =>
    draw(
      pool,
      Math.max(count, pool.length),
      createRng(`mixed:${seed}:${index}`),
    ),
  );
  const output: string[] = [];
  const seen = new Set<string>();
  let lastKind = -1;
  let sameKind = 0;
  for (let index = 0; output.length < count; index += 1) {
    let kind = index % queues.length;
    if (kind === lastKind && sameKind >= 3) kind = (kind + 1) % queues.length;
    let item = queues[kind]?.shift();
    if (!item) {
      const fallback = queues.findIndex((queue) => queue.length > 0);
      if (fallback < 0) break;
      kind = fallback;
      item = queues[kind]?.shift();
    }
    if (!item) break;
    if (seen.has(item.text)) continue;
    output.push(item.text);
    seen.add(item.text);
    sameKind = kind === lastKind ? sameKind + 1 : 1;
    lastKind = kind;
  }
  return output;
}

export interface ContentOptions {
  contentVersion?: number;
}

export function getModeWords(
  mode: Mode,
  count: number,
  seed: string,
  difficulty: Difficulty = "medium",
  options: ContentOptions = {},
): string[] {
  if ((options.contentVersion ?? CONTENT_VERSION) === 1)
    return getModeWordsV1(mode, count, seed, difficulty);
  if (mode === "mixed" || mode === "daily")
    return drawMixed(count, seed, difficulty);
  const source =
    mode === "terms"
      ? TERMS
      : mode === "office"
        ? OFFICE_TOKENS
        : mode === "numbers"
          ? NUMBERS
          : mode === "excel"
            ? EXCEL
            : TERMS;
  return draw(
    suitable(source, difficulty),
    count,
    createRng(`${CONTENT_VERSION}:${mode}:${difficulty}:${seed}`),
  ).map((item) => item.text);
}

export function getDailyWords(
  count: number,
  utcDate: string,
  options: ContentOptions = {},
): string[] {
  if ((options.contentVersion ?? CONTENT_VERSION) === 1)
    return getDailyWordsV1(count, utcDate);
  return getModeWords("daily", count, getDailySeed(utcDate), "medium", options);
}

export function getDailySeed(utcDate: string): string {
  return `daily:${utcDate}`;
}

export function getContentStats() {
  return {
    contentVersion: CONTENT_VERSION,
    terms: TERMS.length,
    office: OFFICE.length,
    numbers: NUMBERS.length,
    excel: EXCEL.length,
    tickers: TICKERS.length,
    mixed: TERMS.length + OFFICE.length + NUMBERS.length + EXCEL.length,
  } as const;
}

export const CONTENT_POOLS = {
  terms: TERMS,
  office: OFFICE,
  numbers: NUMBERS,
  excel: EXCEL,
} as const;
