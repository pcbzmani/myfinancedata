import { useEffect, useRef, useState } from 'react';
import { getRows, addRow, deleteRow, updateRow } from '../lib/api';

const TYPES = ['stocks', 'mutual_fund', 'crypto', 'fd', 'ppf', 'other'];
const MARKET_TYPES = ['stocks', 'mutual_fund'];
const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  stocks:      { label: 'Stocks',      color: 'text-blue-700',    bg: 'bg-blue-100' },
  mutual_fund: { label: 'Mutual Fund', color: 'text-violet-700',  bg: 'bg-violet-100' },
  crypto:      { label: 'Crypto',      color: 'text-amber-700',   bg: 'bg-amber-100' },
  fd:          { label: 'FD',          color: 'text-emerald-700', bg: 'bg-emerald-100' },
  ppf:         { label: 'PPF',         color: 'text-teal-700',    bg: 'bg-teal-100' },
  other:       { label: 'Other',       color: 'text-slate-600',   bg: 'bg-slate-100' },
};

// Popular NSE stocks — user picks from this list instead of typing tickers
const POPULAR_STOCKS = [
  // ── NIFTY 50 ──────────────────────────────────────────────────────────────
{ name: 'Infosys',                    symbol: 'INFY.NS' },
{ name: 'TCS',                        symbol: 'TCS.NS' },
{ name: 'Reliance Industries',        symbol: 'RELIANCE.NS' },
{ name: 'HDFC Bank',                  symbol: 'HDFCBANK.NS' },
{ name: 'ICICI Bank',                 symbol: 'ICICIBANK.NS' },
{ name: 'Wipro',                      symbol: 'WIPRO.NS' },
{ name: 'HCL Technologies',           symbol: 'HCLTECH.NS' },
{ name: 'Bajaj Finance',              symbol: 'BAJFINANCE.NS' },
{ name: 'Kotak Mahindra Bank',        symbol: 'KOTAKBANK.NS' },
{ name: 'Axis Bank',                  symbol: 'AXISBANK.NS' },
{ name: 'State Bank of India',        symbol: 'SBIN.NS' },
{ name: 'Maruti Suzuki',              symbol: 'MARUTI.NS' },
{ name: 'Asian Paints',               symbol: 'ASIANPAINT.NS' },
{ name: 'Titan Company',              symbol: 'TITAN.NS' },
{ name: 'Nestle India',               symbol: 'NESTLEIND.NS' },
{ name: 'Hindustan Unilever',         symbol: 'HINDUNILVR.NS' },
{ name: 'ITC',                        symbol: 'ITC.NS' },
{ name: 'Bharti Airtel',              symbol: 'BHARTIARTL.NS' },
{ name: 'Adani Enterprises',          symbol: 'ADANIENT.NS' },
{ name: 'Larsen & Toubro',            symbol: 'LT.NS' },
{ name: 'Sun Pharma',                 symbol: 'SUNPHARMA.NS' },
{ name: "Dr. Reddy's Labs",           symbol: 'DRREDDY.NS' },
{ name: 'Tata Motors',                symbol: 'TATAMOTORS.NS' },
{ name: 'Tata Steel',                 symbol: 'TATASTEEL.NS' },
{ name: 'Power Grid Corp',            symbol: 'POWERGRID.NS' },
{ name: 'NTPC',                       symbol: 'NTPC.NS' },
{ name: 'ONGC',                       symbol: 'ONGC.NS' },
{ name: 'UltraTech Cement',           symbol: 'ULTRACEMCO.NS' },
{ name: 'Bajaj Auto',                 symbol: 'BAJAJ-AUTO.NS' },
{ name: 'Hero MotoCorp',              symbol: 'HEROMOTOCO.NS' },
{ name: 'Tech Mahindra',              symbol: 'TECHM.NS' },
{ name: 'IndusInd Bank',              symbol: 'INDUSINDBK.NS' },
{ name: 'Adani Ports',                symbol: 'ADANIPORTS.NS' },
{ name: 'Cipla',                      symbol: 'CIPLA.NS' },
{ name: 'Eicher Motors',              symbol: 'EICHERMOT.NS' },
{ name: 'JSW Steel',                  symbol: 'JSWSTEEL.NS' },
{ name: 'Mahindra & Mahindra',        symbol: 'M&M.NS' },
{ name: 'Tata Consumer Products',     symbol: 'TATACONSUM.NS' },
{ name: 'Divis Laboratories',         symbol: 'DIVISLAB.NS' },
{ name: 'Bajaj Finserv',              symbol: 'BAJAJFINSV.NS' },
{ name: 'Coal India',                 symbol: 'COALINDIA.NS' },
{ name: 'Shriram Finance',            symbol: 'SHRIRAMFIN.NS' },
{ name: 'Apollo Hospitals',           symbol: 'APOLLOHOSP.NS' },
{ name: 'BEL (Bharat Electronics)',   symbol: 'BEL.NS' },
{ name: 'Trent',                      symbol: 'TRENT.NS' },
{ name: 'Hindalco Industries',        symbol: 'HINDALCO.NS' },
{ name: 'Grasim Industries',          symbol: 'GRASIM.NS' },
{ name: 'SBI Life Insurance',         symbol: 'SBILIFE.NS' },
{ name: 'HDFC Life Insurance',        symbol: 'HDFCLIFE.NS' },
{ name: 'Tata Consultancy Services',  symbol: 'TCS.NS' },

// ── NIFTY NEXT 50 ─────────────────────────────────────────────────────────
{ name: 'Zomato',                     symbol: 'ZOMATO.NS' },
{ name: 'Paytm (One97 Comm.)',        symbol: 'PAYTM.NS' },
{ name: 'Nykaa (FSN E-Commerce)',     symbol: 'NYKAA.NS' },
{ name: 'Avenue Supermarts (DMart)',  symbol: 'DMART.NS' },
{ name: 'Pidilite Industries',        symbol: 'PIDILITIND.NS' },
{ name: 'Godrej Consumer Products',  symbol: 'GODREJCP.NS' },
{ name: 'Havells India',              symbol: 'HAVELLS.NS' },
{ name: 'Ambuja Cements',             symbol: 'AMBUJACEM.NS' },
{ name: 'ACC',                        symbol: 'ACC.NS' },
{ name: 'Muthoot Finance',            symbol: 'MUTHOOTFIN.NS' },
{ name: 'Cholamandalam Investment',   symbol: 'CHOLAFIN.NS' },
{ name: 'DLF',                        symbol: 'DLF.NS' },
{ name: 'Mankind Pharma',             symbol: 'MANKIND.NS' },
{ name: 'Torrent Pharmaceuticals',    symbol: 'TORNTPHARM.NS' },
{ name: 'Motherson Sumi Wiring',      symbol: 'MSUMI.NS' },
{ name: 'Vedanta',                    symbol: 'VEDL.NS' },
{ name: 'Indian Oil Corporation',     symbol: 'IOC.NS' },
{ name: 'BPCL',                       symbol: 'BPCL.NS' },
{ name: 'HPCL',                       symbol: 'HINDPETRO.NS' },
{ name: 'Bharat Petroleum',           symbol: 'BPCL.NS' },
{ name: 'GAIL India',                 symbol: 'GAIL.NS' },
{ name: 'Petronet LNG',               symbol: 'PETRONET.NS' },
{ name: 'Adani Green Energy',         symbol: 'ADANIGREEN.NS' },
{ name: 'Adani Total Gas',            symbol: 'ATGL.NS' },
{ name: 'Adani Power',                symbol: 'ADANIPOWER.NS' },
{ name: 'Adani Wilmar',               symbol: 'AWL.NS' },
{ name: 'Adani Energy Solutions',     symbol: 'ADANIENSOL.NS' },
{ name: 'Bank of Baroda',             symbol: 'BANKBARODA.NS' },
{ name: 'Canara Bank',                symbol: 'CANBK.NS' },
{ name: 'Punjab National Bank',       symbol: 'PNB.NS' },
{ name: 'Union Bank of India',        symbol: 'UNIONBANK.NS' },
{ name: 'Indian Bank',                symbol: 'INDIANB.NS' },
{ name: 'Bank of India',              symbol: 'BANKINDIA.NS' },
{ name: 'Federal Bank',               symbol: 'FEDERALBNK.NS' },
{ name: 'IDFC First Bank',            symbol: 'IDFCFIRSTB.NS' },
{ name: 'Yes Bank',                   symbol: 'YESBANK.NS' },
{ name: 'RBL Bank',                   symbol: 'RBLBANK.NS' },
{ name: 'AU Small Finance Bank',      symbol: 'AUBANK.NS' },
{ name: 'Bandhan Bank',               symbol: 'BANDHANBNK.NS' },
{ name: 'IDBI Bank',                  symbol: 'IDBI.NS' },
{ name: 'SBI Cards',                  symbol: 'SBICARD.NS' },
{ name: 'ICICI Prudential Life',      symbol: 'ICICIPRULI.NS' },
{ name: 'ICICI Lombard General Ins.', symbol: 'ICICIGI.NS' },
{ name: 'LIC of India',               symbol: 'LICI.NS' },
{ name: 'New India Assurance',        symbol: 'NIACL.NS' },
{ name: 'GIC Re',                     symbol: 'GICRE.NS' },
{ name: 'Max Financial Services',     symbol: 'MFSL.NS' },
{ name: 'Aditya Birla Capital',       symbol: 'ABCAPITAL.NS' },
{ name: 'Aditya Birla Sun Life AMC',  symbol: 'ABSLAMC.NS' },
{ name: 'HDFC AMC',                   symbol: 'HDFCAMC.NS' },
{ name: 'Nippon Life India AMC',      symbol: 'NAM-INDIA.NS' },
{ name: 'UTI AMC',                    symbol: 'UTIAMC.NS' },
{ name: 'Angel One',                  symbol: 'ANGELONE.NS' },
{ name: 'BSE Ltd',                    symbol: 'BSE.NS' },
{ name: 'MCX India',                  symbol: 'MCX.NS' },
{ name: 'CDSL',                       symbol: 'CDSL.NS' },
{ name: 'CAMS',                       symbol: 'CAMS.NS' },

// ── IT & TECH ─────────────────────────────────────────────────────────────
{ name: 'Mphasis',                    symbol: 'MPHASIS.NS' },
{ name: 'LTIMindtree',                symbol: 'LTIM.NS' },
{ name: 'L&T Technology Services',   symbol: 'LTTS.NS' },
{ name: 'Persistent Systems',         symbol: 'PERSISTENT.NS' },
{ name: 'Coforge',                    symbol: 'COFORGE.NS' },
{ name: 'Hexaware Technologies',      symbol: 'HEXAWARE.NS' },
{ name: 'Zensar Technologies',        symbol: 'ZENSARTECH.NS' },
{ name: 'KPIT Technologies',          symbol: 'KPITTECH.NS' },
{ name: 'Tata Elxsi',                 symbol: 'TATAELXSI.NS' },
{ name: 'Mastek',                     symbol: 'MASTEK.NS' },
{ name: 'Birlasoft',                  symbol: 'BSOFT.NS' },
{ name: 'Cyient',                     symbol: 'CYIENT.NS' },
{ name: 'Sonata Software',            symbol: 'SONATSOFTW.NS' },
{ name: 'Happiest Minds',             symbol: 'HAPPSTMNDS.NS' },
{ name: 'Tanla Platforms',            symbol: 'TANLA.NS' },
{ name: 'Indiamart Intermesh',        symbol: 'INDIAMART.NS' },
{ name: 'Info Edge (Naukri)',          symbol: 'NAUKRI.NS' },
{ name: 'Just Dial',                  symbol: 'JUSTDIAL.NS' },
{ name: 'MapMyIndia',                 symbol: 'MAPMYINDIA.NS' },
{ name: 'Nazara Technologies',        symbol: 'NAZARA.NS' },
{ name: 'Policybazaar (PB Fintech)',  symbol: 'POLICYBZR.NS' },
{ name: 'CarTrade Tech',              symbol: 'CARTRADE.NS' },
{ name: 'Delhivery',                  symbol: 'DELHIVERY.NS' },
{ name: 'Ecom Express',               symbol: 'ECOMEXPRES.NS' },
{ name: 'Xpressbees (Spoton)',        symbol: 'SPOTON.NS' },

// ── AUTO & EV ─────────────────────────────────────────────────────────────
{ name: 'TVS Motor Company',          symbol: 'TVSMOTOR.NS' },
{ name: 'Ashok Leyland',              symbol: 'ASHOKLEY.NS' },
{ name: 'Force Motors',               symbol: 'FORCEMOT.NS' },
{ name: 'Tata Power',                 symbol: 'TATAPOWER.NS' },
{ name: 'Olectra Greentech',          symbol: 'OLECTRA.NS' },
{ name: 'Greaves Cotton',             symbol: 'GREAVESCOT.NS' },
{ name: 'Ather Energy',               symbol: 'ATHER.NS' },
{ name: 'Exide Industries',           symbol: 'EXIDEIND.NS' },
{ name: 'Amara Raja Energy',          symbol: 'AMARAJABAT.NS' },
{ name: 'Bosch India',                symbol: 'BOSCHLTD.NS' },
{ name: 'Motherson Sumi Systems',     symbol: 'MOTHERSON.NS' },
{ name: 'Minda Industries',           symbol: 'MINDAIND.NS' },
{ name: 'Suprajit Engineering',       symbol: 'SUPRAJIT.NS' },
{ name: 'Endurance Technologies',     symbol: 'ENDURANCE.NS' },

// ── PHARMA & HEALTHCARE ───────────────────────────────────────────────────
{ name: 'Lupin',                      symbol: 'LUPIN.NS' },
{ name: 'Aurobindo Pharma',           symbol: 'AUROPHARMA.NS' },
{ name: 'Alkem Laboratories',         symbol: 'ALKEM.NS' },
{ name: 'Biocon',                     symbol: 'BIOCON.NS' },
{ name: 'Glenmark Pharma',            symbol: 'GLENMARK.NS' },
{ name: 'Ipca Laboratories',          symbol: 'IPCALAB.NS' },
{ name: 'Abbott India',               symbol: 'ABBOTINDIA.NS' },
{ name: 'Pfizer India',               symbol: 'PFIZER.NS' },
{ name: 'Sanofi India',               symbol: 'SANOFI.NS' },
{ name: 'Laurus Labs',                symbol: 'LAURUSLABS.NS' },
{ name: 'Granules India',             symbol: 'GRANULES.NS' },
{ name: 'Strides Pharma',             symbol: 'STAR.NS' },
{ name: 'Natco Pharma',               symbol: 'NATCOPHARM.NS' },
{ name: 'Solara Active Pharma',       symbol: 'SOLARA.NS' },
{ name: 'Fortis Healthcare',          symbol: 'FORTIS.NS' },
{ name: 'Narayana Hrudayalaya',       symbol: 'NH.NS' },
{ name: 'Max Healthcare',             symbol: 'MAXHEALTH.NS' },
{ name: 'Medanta (Global Health)',    symbol: 'MEDANTA.NS' },
{ name: 'Aster DM Healthcare',        symbol: 'ASTERDM.NS' },
{ name: 'Krishna Vishwa Vidyapeeth',  symbol: 'KVB.NS' },
{ name: 'Metropolis Healthcare',      symbol: 'METROPOLIS.NS' },
{ name: 'Dr Lal PathLabs',            symbol: 'LALPATHLAB.NS' },
{ name: 'Thyrocare Technologies',     symbol: 'THYROCARE.NS' },

// ── FMCG & CONSUMER ───────────────────────────────────────────────────────
{ name: 'Dabur India',                symbol: 'DABUR.NS' },
{ name: 'Marico',                     symbol: 'MARICO.NS' },
{ name: 'Colgate-Palmolive India',    symbol: 'COLPAL.NS' },
{ name: 'Emami',                      symbol: 'EMAMILTD.NS' },
{ name: 'Godrej Industries',          symbol: 'GODREJIND.NS' },
{ name: 'Jyothy Labs',                symbol: 'JYOTHYLAB.NS' },
{ name: 'Procter & Gamble Hygiene',   symbol: 'PGHH.NS' },
{ name: 'Gillette India',             symbol: 'GILLETTE.NS' },
{ name: 'Britannia Industries',       symbol: 'BRITANNIA.NS' },
{ name: 'Varun Beverages',            symbol: 'VBL.NS' },
{ name: 'United Spirits',             symbol: 'MCDOWELL-N.NS' },
{ name: 'United Breweries',           symbol: 'UBL.NS' },
{ name: 'Radico Khaitan',             symbol: 'RADICO.NS' },
{ name: 'Bikaji Foods',               symbol: 'BIKAJI.NS' },
{ name: 'Patanjali Foods',            symbol: 'PATANJALI.NS' },
{ name: 'Heritage Foods',             symbol: 'HERITGFOOD.NS' },
{ name: 'Hatsun Agro Product',        symbol: 'HATSUN.NS' },

// ── CEMENT & CONSTRUCTION ─────────────────────────────────────────────────
{ name: 'Shree Cement',               symbol: 'SHREECEM.NS' },
{ name: 'India Cements',              symbol: 'INDIACEM.NS' },
{ name: 'Ramco Cements',              symbol: 'RAMCOCEM.NS' },
{ name: 'JK Cement',                  symbol: 'JKCEMENT.NS' },
{ name: 'Dalmia Bharat',              symbol: 'DALBHARAT.NS' },
{ name: 'Birla Corporation',          symbol: 'BIRLACORPN.NS' },
{ name: 'Orient Cement',              symbol: 'ORIENTCEM.NS' },
{ name: 'Heidelberg Cement India',    symbol: 'HEIDELBERG.NS' },
{ name: 'NCC Ltd',                    symbol: 'NCC.NS' },
{ name: 'J Kumar Infraprojects',      symbol: 'JKIL.NS' },
{ name: 'KNR Constructions',          symbol: 'KNRCON.NS' },
{ name: 'PNC Infratech',              symbol: 'PNCINFRA.NS' },
{ name: 'IRB Infrastructure',         symbol: 'IRB.NS' },
{ name: 'H.G. Infra Engineering',     symbol: 'HGINFRA.NS' },
{ name: 'Ahluwalia Contracts',        symbol: 'AHLUCONT.NS' },

// ── METALS & MINING ───────────────────────────────────────────────────────
{ name: 'SAIL',                       symbol: 'SAIL.NS' },
{ name: 'NMDC',                       symbol: 'NMDC.NS' },
{ name: 'Hindustan Zinc',             symbol: 'HINDZINC.NS' },
{ name: 'Hindustan Copper',           symbol: 'HINDCOPPER.NS' },
{ name: 'National Aluminium',         symbol: 'NATIONALUM.NS' },
{ name: 'Ratnamani Metals',           symbol: 'RATNAMANI.NS' },
{ name: 'APL Apollo Tubes',           symbol: 'APLAPOLLO.NS' },
{ name: 'Welspun Corp',               symbol: 'WELCORP.NS' },
{ name: 'Jindal Steel & Power',       symbol: 'JINDALSTEL.NS' },
{ name: 'Jindal Stainless',           symbol: 'JSL.NS' },
{ name: 'Shyam Metalics',             symbol: 'SHYAMMETL.NS' },

// ── ENERGY & POWER ────────────────────────────────────────────────────────
{ name: 'NHPC',                       symbol: 'NHPC.NS' },
{ name: 'SJVN',                       symbol: 'SJVN.NS' },
{ name: 'Torrent Power',              symbol: 'TORNTPOWER.NS' },
{ name: 'JSW Energy',                 symbol: 'JSWENERGY.NS' },
{ name: 'CESC',                       symbol: 'CESC.NS' },
{ name: 'Kalpataru Power Transmission',symbol:'KALPATPOWR.NS' },
{ name: 'KPI Green Energy',           symbol: 'KPIGREEN.NS' },
{ name: 'Sterling and Wilson Solar',  symbol: 'SWSOLAR.NS' },
{ name: 'Waaree Energies',            symbol: 'WAAREEENER.NS' },
{ name: 'Suzlon Energy',              symbol: 'SUZLON.NS' },
{ name: 'Inox Wind',                  symbol: 'INOXWIND.NS' },

// ── REAL ESTATE ───────────────────────────────────────────────────────────
{ name: 'Godrej Properties',          symbol: 'GODREJPROP.NS' },
{ name: 'Oberoi Realty',              symbol: 'OBEROIRLTY.NS' },
{ name: 'Prestige Estates',           symbol: 'PRESTIGE.NS' },
{ name: 'Brigade Enterprises',        symbol: 'BRIGADE.NS' },
{ name: 'Sobha Developers',           symbol: 'SOBHA.NS' },
{ name: 'Mahindra Lifespace',         symbol: 'MAHLIFE.NS' },
{ name: 'Kolte-Patil Developers',     symbol: 'KOLTEPATIL.NS' },
{ name: 'Phoenix Mills',              symbol: 'PHOENIXLTD.NS' },
{ name: 'Nexus Select Trust',         symbol: 'NEXUSSELECT.NS'},
{ name: 'Embassy REIT',               symbol: 'EMBASSY.NS' },
{ name: 'Mindspace REIT',             symbol: 'MINDSPACE.NS' },

// ── TELECOM & MEDIA ───────────────────────────────────────────────────────
{ name: 'Vodafone Idea',              symbol: 'IDEA.NS' },
{ name: 'MTNL',                       symbol: 'MTNL.NS' },
{ name: 'TTML (Tata Teleservices)',   symbol: 'TTML.NS' },
{ name: 'Zee Entertainment',          symbol: 'ZEEL.NS' },
{ name: 'Sun TV Network',             symbol: 'SUNTV.NS' },
{ name: 'TV Today Network',           symbol: 'TVTODAY.NS' },
{ name: 'Network18 Media',            symbol: 'NETWORK18.NS' },
{ name: 'TV18 Broadcast',             symbol: 'TV18BRDCST.NS' },
{ name: 'Dish TV India',              symbol: 'DISHTV.NS' },
{ name: 'Tata Play (Brightstar)',     symbol: 'TATAPLAY.NS' },
{ name: 'PVR Inox',                   symbol: 'PVRINOX.NS' },

// ── LOGISTICS & AVIATION ──────────────────────────────────────────────────
{ name: 'InterGlobe Aviation (IndiGo)',symbol:'INDIGO.NS' },
{ name: 'SpiceJet',                   symbol: 'SPICEJET.NS' },
{ name: 'Blue Dart Express',          symbol: 'BLUEDART.NS' },
{ name: 'Transport Corporation',      symbol: 'TCI.NS' },
{ name: 'VRL Logistics',              symbol: 'VRLLOG.NS' },
{ name: 'Mahindra Logistics',         symbol: 'MAHLOG.NS' },
{ name: 'Allcargo Logistics',         symbol: 'ALLCARGO.NS' },
{ name: 'Container Corp (CONCOR)',    symbol: 'CONCOR.NS' },
{ name: 'Gateway Distriparks',        symbol: 'GDL.NS' },
{ name: 'TCI Express',                symbol: 'TCIEXP.NS' },

// ── RETAIL & E-COMMERCE ───────────────────────────────────────────────────
{ name: 'Tata Trent',                 symbol: 'TRENT.NS' },
{ name: 'Shoppers Stop',              symbol: 'SHOPERSTOP.NS' },
{ name: 'V-Mart Retail',              symbol: 'VMART.NS' },
{ name: 'Metro Brands',               symbol: 'METROBRAND.NS' },
{ name: 'Campus Activewear',          symbol: 'CAMPUS.NS' },
{ name: 'Vedant Fashions (Manyavar)', symbol: 'MANYAVAR.NS' },
{ name: 'Bata India',                 symbol: 'BATAINDIA.NS' },
{ name: 'Page Industries',            symbol: 'PAGEIND.NS' },
{ name: 'Arvind Ltd',                 symbol: 'ARVIND.NS' },
{ name: 'Raymond',                    symbol: 'RAYMOND.NS' },
{ name: 'Welspun India',              symbol: 'WELSPUNIND.NS' },
{ name: 'Trident Ltd',                symbol: 'TRIDENT.NS' },

// ── HOSPITALITY & TOURISM ─────────────────────────────────────────────────
{ name: 'Indian Hotels (Taj)',        symbol: 'INDHOTEL.NS' },
{ name: 'EIH (Oberoi Hotels)',        symbol: 'EIHOTEL.NS' },
{ name: 'Lemon Tree Hotels',          symbol: 'LEMONTREE.NS' },
{ name: 'Chalet Hotels',              symbol: 'CHALET.NS' },
{ name: 'Thomas Cook India',          symbol: 'THOMASCOOK.NS' },
{ name: 'IRCTC',                      symbol: 'IRCTC.NS' },

// ── DEFENCE & AEROSPACE ───────────────────────────────────────────────────
{ name: 'HAL (Hindustan Aeronautics)',symbol: 'HAL.NS' },
{ name: 'Bharat Dynamics',            symbol: 'BDL.NS' },
{ name: 'Mazagon Dock Shipbuilders',  symbol: 'MAZDOCK.NS' },
{ name: 'Garden Reach Shipbuilders',  symbol: 'GRSE.NS' },
{ name: 'Cochin Shipyard',            symbol: 'COCHINSHIP.NS' },
{ name: 'MTAR Technologies',          symbol: 'MTAR.NS' },
{ name: 'Data Patterns',              symbol: 'DATAPATTNS.NS' },
{ name: 'Paras Defence',              symbol: 'PARAS.NS' },

// ── AGRI & CHEMICALS ──────────────────────────────────────────────────────
{ name: 'UPL Ltd',                    symbol: 'UPL.NS' },
{ name: 'Bayer CropScience',          symbol: 'BAYERCROP.NS' },
{ name: 'PI Industries',              symbol: 'PIIND.NS' },
{ name: 'Rallis India',               symbol: 'RALLIS.NS' },
{ name: 'Coromandel International',   symbol: 'COROMANDEL.NS' },
{ name: 'Chambal Fertilisers',        symbol: 'CHAMBLFERT.NS' },
{ name: 'GNFC',                       symbol: 'GNFC.NS' },
{ name: 'Navin Fluorine',             symbol: 'NAVINFLUOR.NS' },
{ name: 'SRF Ltd',                    symbol: 'SRF.NS' },
{ name: 'Aarti Industries',           symbol: 'AARTIIND.NS' },
{ name: 'Deepak Nitrite',             symbol: 'DEEPAKNTR.NS' },
{ name: 'Vinati Organics',            symbol: 'VINATIORGA.NS' },
{ name: 'Sudarshan Chemical',         symbol: 'SUDARSCHEM.NS' },
{ name: 'Tata Chemicals',             symbol: 'TATACHEM.NS' },
{ name: 'Gujarat Fluorochemicals',    symbol: 'FLUOROCHEM.NS' },

// ── NBFC & MICROFINANCE ───────────────────────────────────────────────────
{ name: 'Bajaj Holdings',             symbol: 'BAJAJHLDNG.NS' },
{ name: 'Power Finance Corp',         symbol: 'PFC.NS' },
{ name: 'REC Limited',                symbol: 'RECLTD.NS' },
{ name: 'IREDA',                      symbol: 'IREDA.NS' },
{ name: 'L&T Finance',                symbol: 'LTF.NS' },
{ name: 'Mahindra Finance',           symbol: 'M&MFIN.NS' },
{ name: 'Sundaram Finance',           symbol: 'SUNDARMFIN.NS' },
{ name: 'Manappuram Finance',         symbol: 'MANAPPURAM.NS' },
{ name: 'IIFL Finance',               symbol: 'IIFL.NS' },
{ name: 'Piramal Enterprises',        symbol: 'PEL.NS' },
{ name: 'CreditAccess Grameen',       symbol: 'CREDITACC.NS' },
{ name: 'Spandana Sphoorty',          symbol: 'SPANDANA.NS' },
{ name: 'Ujjivan Small Finance Bank', symbol: 'UJJIVANSFB.NS' },
{ name: 'Equitas Small Finance Bank', symbol: 'EQUITASBNK.NS' },
{ name: 'Jana Small Finance Bank',    symbol: 'JANASFB.NS' },

// ── CAPITAL GOODS & ENGINEERING ───────────────────────────────────────────
{ name: 'Siemens India',              symbol: 'SIEMENS.NS' },
{ name: 'ABB India',                  symbol: 'ABB.NS' },
{ name: 'Honeywell Automation',       symbol: 'HONAUT.NS' },
{ name: 'Thermax',                    symbol: 'THERMAX.NS' },
{ name: 'Cummins India',              symbol: 'CUMMINSIND.NS' },
{ name: 'Bharat Forge',               symbol: 'BHARATFORG.NS' },
{ name: 'Kirloskar Brothers',         symbol: 'KIRLOSBROS.NS' },
{ name: 'Elgi Equipments',            symbol: 'ELGIEQUIP.NS' },
{ name: 'Triveni Turbine',            symbol: 'TRITURBINE.NS' },
{ name: 'TD Power Systems',           symbol: 'TDPOWERSYS.NS' },
{ name: 'Waaree Renewable Tech',      symbol: 'WAAREERTL.NS' },
{ name: 'Bharat Heavy Electricals',   symbol: 'BHEL.NS' },
];

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const EMPTY = { type: 'stocks', name: '', symbol: '', units: '', buyPrice: '', currentValue: '' };

export default function Investments() {
  const [items, setItems]       = useState<any[]>([]);
  const [form, setForm]         = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // Stock search combobox
  const [stockSearch, setStockSearch]           = useState('');
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Edit modal
  const [editItem, setEditItem]   = useState<any>(null);
  const [editForm, setEditForm]   = useState<any>(null);
  const [updating, setUpdating]   = useState(false);
  const [editError, setEditError] = useState('');

  // Sort
  const [sortBy, setSortBy] = useState<'default'|'pl_desc'|'pl_asc'|'invested_desc'|'invested_asc'>('default');

  // Filter by type
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = () => getRows('investments').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  // Close stock dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowStockDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isMarketType       = MARKET_TYPES.includes(form.type);
  const computedInvested   = (Number(form.units) || 0) * (Number(form.buyPrice) || 0);
  const editIsMarket       = editItem ? MARKET_TYPES.includes(editItem.type) : false;
  const editComputedInvested = editForm
    ? (Number(editForm.units) || 0) * (Number(editForm.buyPrice) || 0)
    : 0;

  const filteredStocks = stockSearch
    ? POPULAR_STOCKS.filter(s =>
        s.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        s.symbol.toLowerCase().includes(stockSearch.toLowerCase()))
    : POPULAR_STOCKS;

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleTypeChange = (type: string) => {
    setForm({ ...EMPTY, type });
    setStockSearch('');
    setShowStockDropdown(false);
  };

  const handleSelectStock = (stock: { name: string; symbol: string }) => {
    setForm({ ...form, symbol: stock.symbol, name: stock.name });
    setStockSearch(stock.name);
    setShowStockDropdown(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMarketType && !form.symbol) { setError('Please select a stock or enter a ticker'); return; }
    setSaving(true);
    try {
      await addRow('investments', {
        id: crypto.randomUUID(),
        type: form.type,
        name: form.name.trim() || form.symbol,
        symbol: form.symbol.trim(),
        units: Number(form.units),
        buyPrice: Number(form.buyPrice),
        amountInvested: computedInvested,
        currentValue: isMarketType ? 0 : Number(form.currentValue),
      });
      setShowForm(false);
      setForm(EMPTY);
      setStockSearch('');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this investment?')) return;
    try { await deleteRow('investments', id); load(); }
    catch (e: any) { setError(e.message); }
  };

  const openEdit = (inv: any) => {
    setEditError('');
    setEditItem(inv);
    setEditForm({
      name: inv.name || '',
      units: String(inv.units || ''),
      buyPrice: String(inv.buyPrice || ''),
      currentValue: String(inv.currentValue || ''),
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !editForm) return;
    setUpdating(true);
    try {
      const updates: any = {
        name: editForm.name.trim() || editItem.symbol,
        units: Number(editForm.units),
        buyPrice: Number(editForm.buyPrice),
        amountInvested: editComputedInvested,
      };
      if (!editIsMarket) updates.currentValue = Number(editForm.currentValue);
      await updateRow('investments', editItem.id, updates);
      setEditItem(null);
      setEditForm(null);
      setEditError('');
      load();
    } catch (e: any) { setEditError(e.message); }
    finally { setUpdating(false); }
  };

  // ── totals ───────────────────────────────────────────────────────────────────

  const sq = search.toLowerCase();
  const filteredItems = items
    .filter(i => filterType === 'all' || i.type === filterType)
    .filter(i => !sq || `${i.name} ${i.symbol} ${i.type}`.toLowerCase().includes(sq));

  const totalInvested = filteredItems.reduce((s, i) => s + Number(i.amountInvested || 0), 0);
  const totalCurrent  = filteredItems.reduce((s, i) => s + Number(i.currentValue  || 0), 0);
  const gain    = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((gain / totalInvested) * 100).toFixed(1) : '0.0';

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aInvested = Number(a.amountInvested) || 0;
    const bInvested = Number(b.amountInvested) || 0;
    const aPL = (Number(a.currentValue) || 0) - aInvested;
    const bPL = (Number(b.currentValue) || 0) - bInvested;
    if (sortBy === 'pl_desc')       return bPL - aPL;
    if (sortBy === 'pl_asc')        return aPL - bPL;
    if (sortBy === 'invested_desc') return bInvested - aInvested;
    if (sortBy === 'invested_asc')  return aInvested - bInvested;
    return 0; // default: original order
  });

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">Investments</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Stocks, mutual funds, crypto &amp; more</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >+ Add</button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 ml-4">✕</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search investments…"
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4" key={filterType}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Invested{filterType !== 'all' && <span className="ml-1 normal-case text-violet-500">· {TYPE_META[filterType]?.label}</span>}
          </p>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1.5">{fmt(totalInvested)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Current Value{filterType !== 'all' && <span className="ml-1 normal-case text-violet-500">· {TYPE_META[filterType]?.label}</span>}
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1.5">{fmt(totalCurrent)}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-5 ${gain >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-700' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-700'}`}>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total P&amp;L</p>
          <p className={`text-2xl font-bold mt-1.5 ${gain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {gain >= 0 ? '+' : ''}{fmt(gain)}
          </p>
          <p className={`text-xs mt-1 ${gain >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>{gainPct}% return</p>
        </div>
      </div>

      {/* ── Type filter tabs ─────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', ...TYPES] as const).map(t => {
            const count = t === 'all' ? items.length : items.filter(i => i.type === t).length;
            if (t !== 'all' && count === 0) return null;
            const meta = t === 'all' ? null : TYPE_META[t];
            return (
              <button key={t} onClick={() => setFilterType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                  filterType === t
                    ? t === 'all'
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 border-slate-800 dark:border-slate-200'
                      : `${meta!.bg} ${meta!.color} border-transparent`
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800'
                }`}
              >
                {t === 'all' ? 'All' : meta!.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filterType === t
                    ? 'bg-white/30 text-inherit'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Add Form ─────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-50 bg-slate-50/50 dark:bg-slate-700/30">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">Add Investment</h3>
          </div>
          <form onSubmit={handleAdd} className="p-4 md:p-6 space-y-4">

            {/* Type selector */}
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TYPES.map(t => (
                  <button key={t} type="button" onClick={() => handleTypeChange(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                      form.type === t
                        ? `${TYPE_META[t].bg} ${TYPE_META[t].color} border-transparent`
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >{TYPE_META[t].label}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── Stock search combobox ── */}
              {form.type === 'stocks' && (
                <div className="sm:col-span-2" ref={dropdownRef}>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Search Stock *
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      placeholder="Type to search — e.g. Infosys, TCS, Reliance…"
                      value={stockSearch}
                      onChange={e => {
                        setStockSearch(e.target.value);
                        setShowStockDropdown(true);
                        if (!e.target.value) setForm({ ...form, symbol: '', name: '' });
                      }}
                      onFocus={() => setShowStockDropdown(true)}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />

                    {showStockDropdown && (
                      <div className="absolute z-20 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto">
                        {filteredStocks.slice(0, 20).map(s => (
                          <button key={s.symbol} type="button"
                            onMouseDown={() => handleSelectStock(s)}
                            className="w-full text-left px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 flex items-center justify-between group"
                          >
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-violet-700 dark:group-hover:text-violet-400">{s.name}</span>
                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 group-hover:text-violet-500 dark:group-hover:text-violet-400">{s.symbol}</span>
                          </button>
                        ))}
                        {/* Custom ticker option when search doesn't match list */}
                        {stockSearch && !filteredStocks.find(s => s.name.toLowerCase() === stockSearch.toLowerCase()) && (
                          <button type="button"
                            onMouseDown={() => {
                              const sym = stockSearch.toUpperCase().includes('.')
                                ? stockSearch.toUpperCase()
                                : stockSearch.toUpperCase() + '.NS';
                              setForm({ ...form, symbol: sym, name: form.name || sym });
                              setShowStockDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between"
                          >
                            <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">Use as custom NSE ticker</span>
                            <span className="text-xs font-mono text-amber-500 dark:text-amber-400">
                              {stockSearch.toUpperCase().includes('.') ? stockSearch.toUpperCase() : stockSearch.toUpperCase() + '.NS'}
                            </span>
                          </button>
                        )}
                        {filteredStocks.length === 0 && !stockSearch && (
                          <p className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">Start typing to search…</p>
                        )}
                      </div>
                    )}
                  </div>

                  {form.symbol && (
                    <p className="text-xs mt-1.5 font-medium text-violet-600">
                      ✓ Ticker: <span className="font-mono">{form.symbol}</span>
                      <span className="text-emerald-600 ml-2">· Live price auto-updated by Google Sheets</span>
                    </p>
                  )}
                </div>
              )}

              {/* Mutual fund ticker (manual entry) */}
              {form.type === 'mutual_fund' && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Google Finance Ticker *
                  </label>
                  <input
                    placeholder="e.g. 0P0001ISIZ.BO  (search on google.com/finance)"
                    value={form.symbol}
                    onChange={e => setForm({ ...form, symbol: e.target.value })}
                    required
                    className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Find it at <span className="font-mono">google.com/finance</span>
                    <span className="ml-2 text-emerald-600 font-medium">· Live NAV auto-updated</span>
                  </p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isMarketType ? 'Display Name (optional)' : 'Name *'}
                </label>
                <input
                  placeholder={isMarketType ? 'e.g. Infosys' : 'e.g. HDFC Fixed Deposit'}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required={!isMarketType}
                  className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Units */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantity / Units *</label>
                <input
                  type="number" min="0" step="any" placeholder="0"
                  value={form.units}
                  onChange={e => setForm({ ...form, units: e.target.value })}
                  required
                  className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Avg Buy Price */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Buy Price (₹) *</label>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.buyPrice}
                  onChange={e => setForm({ ...form, buyPrice: e.target.value })}
                  required
                  className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Amount Invested (computed) */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount Invested</label>
                <div className="mt-1.5 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {computedInvested > 0 ? fmt(computedInvested) : <span className="text-slate-400 dark:text-slate-500 font-normal">Qty × Avg Buy Price</span>}
                </div>
              </div>

              {/* Current Value */}
              {isMarketType ? (
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Value</label>
                  <div className="mt-1.5 border border-emerald-100 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <span>✦</span> Auto-updated via GOOGLEFINANCE in your Sheet
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Value (₹) *</label>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.currentValue}
                    onChange={e => setForm({ ...form, currentValue: e.target.value })}
                    required
                    className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY); setStockSearch(''); }}
                className="px-5 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Investment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      {editItem && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Edit Investment</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {editItem.name || editItem.symbol}
                  {editItem.symbol && editItem.name !== editItem.symbol &&
                    <span className="font-mono ml-1">({editItem.symbol})</span>}
                </p>
              </div>
              <button onClick={() => { setEditItem(null); setEditForm(null); }}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {editError && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 text-rose-700 rounded-lg px-3 py-2 text-sm">
                  {editError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">

                {/* Name */}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Display Name</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                {/* Units */}
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Units</label>
                  <input
                    type="number" min="0" step="any" required
                    value={editForm.units}
                    onChange={e => setEditForm({ ...editForm, units: e.target.value })}
                    className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                {/* Avg Buy Price */}
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Buy Price (₹)</label>
                  <input
                    type="number" min="0" step="0.01" required
                    value={editForm.buyPrice}
                    onChange={e => setEditForm({ ...editForm, buyPrice: e.target.value })}
                    className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                {/* Amount Invested (computed) */}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount Invested</label>
                  <div className="mt-1.5 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {editComputedInvested > 0 ? fmt(editComputedInvested) : '—'}
                  </div>
                </div>

                {/* Current Value — manual only for non-market types */}
                {!editIsMarket ? (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Value (₹)</label>
                    <input
                      type="number" min="0" step="0.01" required
                      value={editForm.currentValue}
                      onChange={e => setEditForm({ ...editForm, currentValue: e.target.value })}
                      className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                ) : (
                  <div className="col-span-2">
                    <div className="border border-emerald-100 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <span>✦</span> Current value is auto-updated via GOOGLEFINANCE · Changing units will refresh the formula
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                <button type="button"
                  onClick={() => { setEditItem(null); setEditForm(null); }}
                  className="px-5 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium">Cancel</button>
                <button type="submit" disabled={updating}
                  className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {updating ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sort bar ────────────────────────────────────────────────────────── */}
      {filteredItems.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sort by</span>
          {([
            ['default',      'Date Added'],
            ['pl_desc',      'P&L ↓ High'],
            ['pl_asc',       'P&L ↑ Low'],
            ['invested_desc','Invested ↓'],
            ['invested_asc', 'Invested ↑'],
          ] as const).map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                sortBy === val
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-600'
              }`}
            >{label}</button>
          ))}
        </div>
      )}

      {/* ── Investment Cards ─────────────────────────────────────────────────── */}
      {sortedItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm py-16 text-center">
          <p className="text-4xl mb-3">📈</p>
          {items.length === 0
            ? <><p className="text-slate-500 dark:text-slate-400 font-medium">No investments yet</p><p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Click "+ Add" to track your portfolio</p></>
            : <><p className="text-slate-500 dark:text-slate-400 font-medium">No {TYPE_META[filterType]?.label ?? filterType} investments</p><button onClick={() => setFilterType('all')} className="text-sm text-violet-600 hover:underline mt-1">Show all →</button></>
          }
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedItems.map(inv => {
            const invested   = Number(inv.amountInvested) || (Number(inv.units || 0) * Number(inv.buyPrice || 0));
            const current    = Number(inv.currentValue) || 0;
            const units      = Number(inv.units) || 0;
            const unitPrice  = current > 0 && units > 0 ? current / units : 0;
            const g          = current - invested;
            const gPct       = invested > 0 ? ((g / invested) * 100).toFixed(1) : '0.0';
            const meta       = TYPE_META[inv.type] || TYPE_META.other;
            const isMarket   = MARKET_TYPES.includes(inv.type);
            const isStock    = inv.type === 'stocks';
            const isMF       = inv.type === 'mutual_fund';
            return (
              <div key={inv.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    {isMarket && <span className="text-xs text-emerald-500 font-medium" title="Live price from Google Sheets">● Live</span>}
                  </div>
                  <div className="flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(inv)}
                      title="Edit"
                      className="text-slate-300 hover:text-violet-500 transition-colors text-base leading-none">✎</button>
                    <button onClick={() => handleDelete(inv.id)}
                      title="Delete"
                      className="text-slate-300 hover:text-rose-400 transition-colors text-xl font-bold leading-none">×</button>
                  </div>
                </div>

                <p className="font-semibold text-slate-800 dark:text-slate-100 text-base mb-0.5">
                  {inv.name && inv.name !== inv.symbol ? inv.name : (inv.symbol || '—')}
                </p>
                {inv.symbol && inv.name && inv.name !== inv.symbol && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-1">{inv.symbol}</p>
                )}
                {inv.units > 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                    {Number(inv.units).toLocaleString('en-IN')} units
                    {inv.buyPrice > 0 && ` @ ₹${Number(inv.buyPrice).toLocaleString('en-IN')} avg`}
                  </p>
                )}

                {/* LTP / NAV pill */}
                {unitPrice > 0 && (isStock || isMF) && (
                  <div className="mb-2.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isStock ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-700'
                    }`}>
                      {isStock ? 'LTP' : 'NAV'}
                      <span className="font-mono">
                        ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Invested</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{fmt(invested)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Current</p>
                    <p className="font-semibold text-blue-600 mt-0.5">{fmt(current)}</p>
                  </div>
                </div>

                <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold ${g >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'}`}>
                  <span>{g >= 0 ? '▲' : '▼'} P&amp;L</span>
                  <span>{g >= 0 ? '+' : ''}{fmt(g)} ({gPct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
