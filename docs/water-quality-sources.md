# Water Quality Data Sources — Salt Point to Santa Cruz

Research pass on free water quality data sources covering the Surf Vikings
geography: Sonoma coast (Salt Point, Sea Ranch, Russian River, Bodega) →
Marin coast → SF → San Mateo → Santa Cruz. Goal is to pick the right
source(s) for an eventual water-quality signal on the spot cards (fecal
indicator bacteria, beach advisories, HABs, biotoxins).

## The headline finding

**One source covers the entire coast in a normalized schema: the California
Open Data Portal's "Beach Advisories and Beach Water Quality Monitoring"
dataset.** It rolls up data submitted to the State Water Resources Control
Board (SWRCB) from every coastal county health department and republishes
it as CSV. Last updated March 17, 2026. Five resources in the dataset,
including a "Bacteria" CSV with actual Enterococcus / E. coli / Total
Coliform sample results joined to monitoring station coordinates.

This is the right primary source. Scraping individual county pages is the
fallback layer for spots the state dataset doesn't cover (or doesn't cover
in time).

## The Salt Point gap

**Salt Point itself is not sampled by anyone.** Sonoma County's
Environmental Health monitors only seven beaches, picked by EPA criteria
(50,000+ annual visitors AND adjacent to a storm drain, creek, or river).
The seven, north to south:

- Gualala Regional Park Beach
- Black Point Regional Park Beach (Sea Ranch)
- Stillwater Cove Regional Park Beach
- Goat Rock State Beach (Russian River mouth)
- Salmon Creek State Beach
- Campbell Cove State Beach (Bodega Bay)
- Doran Regional Park Beach (Bodega Bay)

Salt Point sits between Stillwater Cove and Black Point geographically.
For a Salt Point water-quality estimate, Stillwater Cove is the nearest
proxy (~8 miles south). For Fort Ross, Stillwater is also the closest
sampled beach (~3 miles north).

This is worth flagging on the spot card rather than hiding — "nearest
sampled beach: Stillwater Cove" is more honest than fabricating a grade.

## Source inventory

### Tier 1 — Primary ingestion candidate

| Source | Coverage | Format | Freshness | Notes |
|---|---|---|---|---|
| **CA Open Data / SWRCB BeachWatch** | All coastal CA counties | CSV (5 files) via CKAN API | Irregular; last update March 2026 | The big one. Bacteria results, advisories, station metadata, beach details. CKAN API means programmatic access without scraping. |

URLs:
- Dataset page: https://data.ca.gov/dataset/beach-water-quality-postings-and-closures
- Bacteria results CSV: https://data.ca.gov/dataset/b9c8ce91-40ff-4ad3-8164-bc17c46afb44/resource/7bd961cf-abe4-433b-8033-378161237ff3/download/beach-monitoring-results.csv
- Advisories/closures CSV: https://data.ca.gov/dataset/b9c8ce91-40ff-4ad3-8164-bc17c46afb44/resource/d5cd6a23-829c-426d-a63e-689a55a3db9c/download/beach-advisories.csv
- Stations CSV: https://data.ca.gov/dataset/b9c8ce91-40ff-4ad3-8164-bc17c46afb44/resource/98e628ff-d012-4982-ad32-b9f9ad8ab524/download/beach-monitoring-stations.csv
- CKAN API docs: https://docs.ckan.org/en/2.9/api/

Trade-off: "Irregular" update cadence is the catch. Counties report
monthly; the state batches into the dataset whenever. For real-time
posting status, the county sources or SWRCB BeachWatch web page beat the
data.ca.gov dataset. For historical analysis and trend lines, this is
the only sane source.

### Tier 2 — State rollups (mostly viewers, but useful)

| Source | What it adds | URL |
|---|---|---|
| **My Water Quality "Safe to Swim" map** | Statewide interactive map; aggregates BeachWatch + cyanoHAB | https://mywaterquality.ca.gov/safe-to-swim/ |
| **CA HABs Portal** | Harmful algal bloom reports + satellite-derived cyanobacteria estimates | https://mywaterquality.ca.gov/habs/ |
| **CDPH Shellfish Marine Biotoxin Monitoring** | Mussel quarantines, domoic acid, PSP advisories — relevant for the diving/fishing-adjacent surfer | https://www.cdph.ca.gov/Programs/CEH/DRSEM/Pages/EMB/Shellfish/Marine-Biotoxin-Monitoring-Program.aspx |
| **SWRCB Beach Surveys** | Underlying source data + annual reports | https://www.waterboards.ca.gov/water_issues/programs/beaches/beach_surveys/ |

### Tier 3 — County sources (fallback / freshness)

Useful when the state CSV is stale or to confirm an active advisory. None
of these expose structured APIs; all require scraping HTML or PDF.

| County | Source | Format | Freshness | URL |
|---|---|---|---|---|
| **Sonoma** | EnvHealth Ocean Water Quality | HTML table + annual PDF | Weekly Apr–Oct | https://sonomacounty.gov/health-and-human-services/health-services/divisions/public-health/environmental-health/programs-and-services/ocean-water-quality |
| **Marin** | Beach Water Monitoring Results | HTML | Weekly Apr–Oct | https://www.marincounty.gov/departments/cda/env-health-svcs/prgm-beach-water-monitoring/water-quality-results |
| **SF** | SFPUC Beaches & Bay | Interactive web | Near real-time | https://webapps.sfpuc.org/sapps/beachesandbay.html |
| **San Mateo** | SMC Health Beaches | HTML | Weekly Apr–Oct + post-storm | https://www.smchealth.org/beaches |
| **Santa Cruz** | SCCEH Beach & Water Body Advisories | HTML + map viewer | Weekly + post-storm | https://scceh.com/NewHome/Programs/WaterResources/SurfaceWaterStewardship/WaterQualityMonitoring/BeachWaterBodyAdvisories.aspx |

Santa Cruz County is worth a second look — their page lists ten
**permanently posted** creeks and lagoons (Cowell Beach's Neary Lagoon
outfall, San Lorenzo River mouth, Capitola's Soquel Creek mouth, Rio del
Mar's Aptos Creek, etc.). That's a permanent flag a spot card should
surface if a Surf Vikings spot sits near one of those mouths. Capitola
and Rio del Mar both make Eliel's tracked list — they sit on top of
permanent postings.

### Tier 4 — NGO / citizen science

| Source | What it adds | Format | URL |
|---|---|---|---|
| **Heal the Bay Beach Report Card** | Weekly A–F grade for 650+ West Coast beaches; daily "NowCast" predictive model for 20+ CA beaches | App + web; **no public API** | https://beachreportcard.org/ |
| **Surfrider Blue Water Task Force** | Volunteer-collected bacteria samples that **fill agency gaps** — including spots not on county monitoring lists | Web app; data viewable per chapter, **no obvious export endpoint** | https://bwtf.surfrider.org/ |

The Heal the Bay grade is the most user-friendly atomic value to display
(everyone understands A–F). Their data ultimately comes from the same
SWRCB feed plus their own analysis layer. The barrier is no API — would
need either to scrape, request access, or compute an equivalent score
from the state CSV using their published methodology.

Surfrider's BWTF is the most interesting wildcard for **Salt Point and
other unsampled spots**. The Sonoma Coast chapter, SF chapter, and Santa
Cruz chapter all run sampling programs. Their site is a JS app; the data
isn't trivially scrapable but volunteer-collected coverage of unmonitored
locations is the gap-fill that nothing else offers. Worth a direct email
to the chapters before assuming no programmatic access.

### Tier 5 — Federal / research (adjacent data, not direct beach grades)

These don't give you a "swim/don't swim" answer but power downstream
analysis: turbidity after storms, sediment plumes, HAB satellite imagery,
nearshore temp/DO.

| Source | What it adds | URL |
|---|---|---|
| **EPA BEACON 2.0** | National beach advisory database; CA data is sourced from the same SWRCB feed but in EPA's PRAWN schema | https://beacon.epa.gov/ |
| **USGS Water Quality Portal** | Aggregator across USGS, EPA, state, tribal — turbidity, DO, nutrients, bacteria where available | https://www.waterqualitydata.us/ |
| **USGS Water Data API** | Programmatic access to USGS NWIS stations (SF Bay continuous monitoring is rich here) | https://api.waterdata.usgs.gov/ |
| **CeNCOOS** (Central & Northern CA Ocean Observing System) | Real-time nearshore oceanographic data feeds | https://www.cencoos.org/ |
| **CEDEN** (CA Environmental Data Exchange Network) | Research-quality water data aggregator hosted by SFEI | https://www.sfei.org/projects/california-environmental-data-exchange-network-ceden |
| **Monterey Bay NMS water quality** | Sanctuary-specific monitoring for the Santa Cruz / Monterey region | https://sanctuaries.noaa.gov/science/sentinel-site-program/monterey-bay/water-quality.html |

## Recommendation for Surf Vikings

Start with the state CSV. One source, one schema, the whole coast,
already covering the existing spot list. The ingestion looks like:

1. **Stations CSV** + **Beach Detail CSV**: build a spot → nearest
   monitoring station map. Run once, store the mapping in code (or a
   small JSON), refresh occasionally.
2. **Bacteria Results CSV** + **Advisories CSV**: pull on a daily cron
   into a tiny serverless cache. Compute a per-spot status: active
   advisory? geometric mean over last 30 days? most recent sample within
   threshold?
3. **Spot card surface**: a small water-quality chip — "Clean" / "Caution
   (recent posting)" / "Advisory" / "Not sampled — proxy: <station>". The
   "not sampled" case is the right honest answer for Salt Point, Fort
   Ross, Sea Ranch private breaks, etc.

Stretch goals once that's live: cyanoHAB layer from the HABs Portal for
the river-mouth spots (Russian River mouth at Goat Rock is the obvious
one — the page literally says the last sample followed a sewage discharge
into the Russian River, so a "rain advisory" 72-hour overlay would carry
real signal). Mussel quarantine layer if you ever add a tide-pooling /
abalone-adjacent UI surface.

Skip Heal the Bay grades unless you reach them and negotiate API access.
Their methodology is published; you can compute a grade yourself from the
state CSV using their formula if the A–F UI is desirable.

## May 11 2026 update — state CSV is NOT a viable live-data source

Verified via direct CKAN SQL queries against both resources. The state
dataset's update cadence is not "5–10 days behind counties" as the
original research speculated — it's months to years.

```
Bacteria results — MAX(SampleDate) for Santa Cruz: 9/9/2024
Advisories — MAX(DateofAdvisory) for Santa Cruz:    2020-04-08
Advisories — MAX(UpdateDate):                       2019-05-02
Advisories — MAX(Advisories Insert Date):           2015-08-19
```

Counties test weekly during in-season (April–October), but those
results don't reliably make it into the state batch. This dataset is
useful for *historical trend analysis*, not for surfacing "last
tested" dates on a real-time app.

Implication: a "Last tested: 9/9/2024" line on a spot card reads as
"this app is broken." We removed the planned "live feed pending"
placeholder from the WaterQualityPanel rather than wiring this stale
source.

**The path to real freshness is per-county scrapers.** Each county
posts a weekly-updated HTML page (links in Tier 3 above). Each would
need its own parser, but most are small flat tables. Estimated effort:
~1 day to build all five, plus ongoing maintenance when pages change.

Heal the Bay's NowCast predictive model is the other freshness option,
but their API isn't public — would require a partnership conversation.

## Open questions

- **[CONFIRM]** Does the state CSV refresh fast enough for "in-season"
  weekly use, or do counties beat it by 5–10 days? **Answered May 11
  2026: state is months-to-years stale; counties beat it by *years*
  for active records.**
- **[CONFIRM]** Does Surfrider BWTF expose any chapter data export? The
  Sonoma Coast chapter samples spots the county doesn't — that's
  uniquely valuable for Salt Point. Email the chapter and ask.
- **[CONFIRM]** Heal the Bay's NowCast covers 20+ beaches with a
  predictive model. Which CA beaches? If any of them are on the Surf
  Vikings list, the daily predicted grade beats the weekly observed one.
