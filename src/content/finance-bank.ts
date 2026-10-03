/**
 * FinType's source-grounded finance lexicon.
 *
 * These terms are intentionally written as the tokens finance professionals
 * type: common single words, standard abbreviations, and a small number of
 * established market symbols. We keep frequency tiers separate so the most
 * common reporting, modelling, and trading vocabulary wins the draw without
 * inventing combinations such as `enterprise-value-forecast`.
 *
 * The tiers are editorial frequency bands informed by SEC/EDGAR filing
 * language, CFA curriculum terminology, and FINRA order/trading vocabulary.
 * They are a product heuristic, not a claim that one universal corpus exists.
 */
export const FINANCE_TERM_TIERS = {
  core: `
account accounts asset assets balance balances bank banking basis bill bills
board book books budget budgets business businesses buyer buyers buying cash
cashflow cashflows charge charges client clients close closing cost costs
credit credits customer customers debt debts deal deals demand deposit deposits
derivative derivatives dividend dividends earning earnings equity equities
expense expenses finance financial financing forecast forecasts fund funds
funding gain gains growth guidance income incomes industry interest investment
investments investor investors invoice invoices issue issues leverage liability
liabilities loan loans management manager managers margin margins market markets
material maturity measure metrics money net operating operation operations
outlook payment payments performance portfolio price prices proceeds product
products profit profits projection projections purchase purchases rate rates
reconcile reconciliation record records return returns revenue revenues risk
sales sale sector sectors security securities segment segments share shares
shareholder shareholders stock stocks strategy supply tax taxes trade trades
trading transaction transactions treasury value values volume volumes working
year years quarter quarters monthly annual yearly actuals estimate estimates
target targets plan plans planning result results trend trends variance variances
capitalization capital cashflow liquidity solvency allocation allocations
report reports reporting statement statements statements
`,
  accounting: `
accountant accounting accrual accruals accrued accrue amortization amortize
amortized annualized audit audited auditing auditor auditors authorization
average payable payables receivable receivables allowance allowances
assetized balance bookkeeper bookkeeping carrying cashbook chargeable charges
consolidate consolidated consolidation contingent contract contracts
deferred deferral depreciation depreciate depreciated disclosure disclosures
expense expensed expensing fair goodwill impairment impaired intangible
intangibles inventory inventories journal journals ledger ledgers liability
materiality misstatement misstatements mortgage mortgages noncash operating
ordinary payable payment payroll pension pensions provision provisions
reclassify reclassified reserve reserves retained revenue recognition
recognize recognized recognition recoverable recovery writeoff writeoffs
writedown writedowns statement statements subtotal totals trial worksheet
workpaper workpapers closing closeout cutoff cutoffs debit debits crediting
credited equity earnings earningsbeforeinterest taxbasis taxrate gaap ifrs
xbrl sec filing filings filer filers footnote footnotes form forms schedule
schedules exhibit exhibits appendix appendices notes note disclosure
consolidation consolidationmethod intercompany elimination eliminations
translation remeasurement restatement restated segmental consolidated
comprehensive income loss losses profit margins expense ratio ratios
`,
  workflow: `
analysis analyses analyze analyst analysts assumption assumptions model models
modeling modeller scenario scenarios sensitivity sensitivities driver drivers
case cases base upside downside budgeted forecasted forecastable estimate
estimated estimating diligence due pipeline pipelines tracker trackers
workstream workstreams memo memos brief briefs deck decks slide slides
presentation presentations committee committees approval approvals review
reviews reviewer comment comments feedback action actions owner owners
deliverable deliverables deadline deadlines agenda agendas meeting meetings
minutes minutes client clients sponsor sponsors partner partners associate
associates principal principals director directors managing senior junior
intern team teams task tasks update updates version versions draft drafts
final finalise finalize refresh refreshed refreshes circulate circulated
circulation source sources support supporting evidence evidentiary audittrail
tieout tieouts check checks checked validate validated validation reconcile
reconciled input inputs output outputs template templates schedule schedules
headcount hiring hires attrition retention churn bookings billings backlog
pipeline conversion winrate utilization productivity capacity capacityplan
roadmap milestones milestone priority priorities owner ownership coverage
commentary narrative disclosure disclosurepack datapoint datapoints
dashboard dashboards kpi kpis metric metrics snapshot snapshots readout
readouts summary summaries takeaway takeaways question questions answer
answers followup followups escalation escalations handoff handoffs
`,
  markets: `
bid bids ask asks quote quotes offer offers spread spreads mid midpoint
order orders limit marketable execution execute executed fill fills filled
partial cancel canceled replace route routed venue venues exchange exchanges
broker brokerages dealer dealers maker makers taker takers liquidity liquid
illiquid volatility volatile volume volumes open high low close gap gaps
price pricing premium discount discounting yield yields coupon coupons
duration convexity curve curves spot forward forwards future futures option
options call calls put puts strike strikes expiry expiration exercise exercised
delta gamma theta vega rho sigma implied realized variance skew skewness
correlation covariance beta alpha factor factors momentum valuequality growth
carry roll rollover basis basispoint basispoints bps spreadcurve swap swaps
swaptions forwardrate spotrate overnight term funding repo repos reverse
borrow lend lending borrowing collateral margincall haircut haircutting
settlement settle cleared clearing clearinghouse custody custodian
notional principal exposure exposures position positions long short hedge
hedges hedging overlay overlays arbitrage relative absolute benchmark index
indices etf etfs mutual passive active tracking error trackingerror
performance attribution attributional allocation rebalance rebalancing
turnover concentration concentrationrisk drawdown drawdowns tail stress
scenario shock shocks backtest backtesting signal signals factorization
`,
  banking: `
borrower borrowers lender lenders underwriting underwriter originate
origination syndicate syndication facility facilities revolver revolvers
termloan termloans covenant covenants collateral secured unsecured senior
subordinated mezzanine tranche tranches securitize securitization
structured structuredfinance assetbacked mortgagebacked receivablebacked
guarantee guarantees guarantor guarantors commitment commitments
availability utilization draw drawdown repayment repay repayments amortize
balloon principal interestonly debtservice coverage leverage covenant
default defaults delinquency delinquencies recovery recoveries workout
restructuring restructure bankruptcy bankrupt liquidation liquidate
distressed rescue bridge bridging acquisition acquisitions merger mergers
takeover buyout buybacks repurchase recapitalization recapitalizations
private public offering offerings prospectus registration registered issuer
issuers issuance placement placements secondary primary shelf shelfregistration
convertible convertibles preferred common warrants warrant option pool
fintech payments paymentrail card cards merchant merchants clearing
settlement settlementdate correspondent depositary remittance remittances
foreign exchange currency currencies fx crossborder international domestic
aml kyc sanctions compliance compliant regulatory regulator regulators
supervision supervisory capitalratio tierone tier capitalbuffer liquidityratio
`,
  specialist: `
valuation valuations enterprise goodwill bookvalue fairvalue intrinsic
discounted cashflow freecashflow unlevered levered wacc irr moic npv
multiple multiples comparable comparables precedent precedents accretion
dilution synergies synergy earnout earnouts exit exits entry hurdle hurdles
waterfall waterfalls carry carried promote promoted managementfee fees
fundraise fundraising committed commitment vintage vintages strategy thesis
portfolio company companies platform platforms add on addon rollup carveout
spinout spinoff divest divestiture divestitures restructuring turnaround
venture ventures startup startups seed seriesa seriesb growthcapital
growthstage privatecredit privateequity publicequity hedgefund familyoffice
endowment foundation pension sovereign wealthfund insurance insurer insurers
macro macroeconomic microeconomic monetary fiscal inflation deflation
recession expansion unemployment payrolls gdp cpi ppi pmi fomc fed federal
centralbank centralbanks policy policies ratecut ratehike easing tightening
yieldcurve termpremium realrate riskfree riskpremium countryrisk liquidityrisk
creditrisk marketrisk operationalrisk modelrisk counterparty counterparty
concentration stressloss scenarioanalysis sensitivityanalysis
probability probabilities distribution distributions expected expectation
mean median percentile quantile standarddeviation variance covariance
regression regressions correlation coefficient coefficients intercept slope
forecasting nowcast nowcasting leading lagging indicator indicators
seasonality seasonal cyclicality cycle cycles secular structural
esg climate sustainability governance stewardship impact carbon transition
taxonomy disclosure reportable material immaterial uncertainty uncertainties
`,
} as const;

export type FinanceTier = keyof typeof FINANCE_TERM_TIERS;

export const FINANCE_TERMS = Object.fromEntries(
  Object.entries(FINANCE_TERM_TIERS).map(([tier, words]) => [
    tier,
    words.trim().split(/\s+/),
  ]),
) as Record<FinanceTier, string[]>;

/** Standard finance abbreviations and reporting period tokens. */
export const FINANCE_CODE_TERMS = `
ebitda ebit ebitdar eps pe pb ps ev evsales evebitda roe roa roic roicapital
roc ror rorac rorwa npm gpm opm fcf fcfe fcff capex opex nwc netdebt netincome
grossprofit operatingincome operatingprofit freecashflow cashbalance
workingcapital enterprisevalue bookvalue fairvalue intrinsicvalue
arr mrr cac ltv nrr grr arpu dau mau b2b b2c sbc dso dio dpo ccc
yoy qoq mom wow ltm ntm ttm ytd mtd qtd wtd fy fye h1 h2 q1 q2 q3 q4
sec cik cusip isin sedol lei sic naics xbrl gaap ifrs ias fasb iasb
sofr libor fed ecb boj boe rba fomc rmb usd eur gbp cad jpy chf aud nzd
sek nok dkk hkd sgd inr brl mxn zar pln try rub cny rmb
moo moc gtc fok ioc aon dnr dnr moo moc ipo followon atm itm otm
nav aum tvpi dpi rvpi irr moic wacc npv dcf lbo mna pe vc hf reit bdc
spac adr otc tsx nyse nasdaq cme cboe ice lse hkex asx nymex
usdollar eurodollar basispoint basispoints pct percent million billion trillion
thousand k mm bn tn par notional coupon yield spread premium discount
`
  .trim()
  .split(/\s+/);

export const FINANCE_TERM_WEIGHTS: Record<FinanceTier, number> = {
  core: 8,
  accounting: 6,
  workflow: 6,
  markets: 5,
  banking: 4,
  specialist: 2,
};
