
// -------- CONFIG --------
// Replace with your live endpoint. The user provided a worker/base: `goldapi-my1rlotopzv3-io`
// If it's a full URL, set GOLD_API_URL accordingly. The JSON shape should match the sample.
const GOLD_API_URL = 'https://goldapi-my1rlotopzv3-io'; // <- put your exact endpoint here

// FX from USD -> target currency (browser fetch)

// FX from USD -> target currency (browser fetch)
const FX_API_URL = 'https://api.exchangerate.host/latest';

// Minimal hardcoded fallback (approx). Update occasionally.
const FX_FALLBACK = {
  USD: 1,
  AED: 3.6725,
  INR: 84.0,
  EUR: 0.93,
  GBP: 0.79,
  CNY: 7.10,
  SAR: 3.75,
  AUD: 1.51,
  CAD: 1.37,
  PKR: 279.0
};
let usingFxFallback = false;


// Constants
const OZ_TO_GRAM = 31.1034768;

// Cached data
let gold = null;
let fxRates = null;

// Utility
const fmt = (n, c='USD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(n);
  } catch (e) {
    // Fallback if unknown currency code
    return (c + ' ' + n.toFixed(2));
  }
};

const fmtGram = (n, c='USD') => fmt(n, c) + ' / g';

async function fetchGold() {
  try {
    const res = await fetch(GOLD_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Gold API error');
    gold = await res.json();
  } catch (e) {
    console.error(e);
    // Fallback to sample structure if API not reachable
    gold = {
      timestamp: 1762160856,
      price: 4022.36,
      ch: 19.96,
      chp: 0.5,
      open_price: 4002.4,
      low_price: 3962.625,
      high_price: 4028.04,
      price_gram_24k: 129.3219,
      price_gram_22k: 118.5451,
      price_gram_21k: 113.1566,
      price_gram_20k: 107.7682,
      price_gram_18k: 96.9914,
      price_gram_16k: 86.2146,
      price_gram_14k: 75.4378,
      price_gram_10k: 53.8841,
    };
  }
}

async function fetchFx() {
  try {
    const symbols = 'USD,AED,INR,EUR,GBP,CNY,SAR,AUD,CAD,PKR';
    const res = await fetch(`${FX_API_URL}?base=USD&symbols=${symbols}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('FX API error');
    const data = await res.json();
    if (!data || !data.rates || Object.keys(data.rates).length === 0) throw new Error('Empty FX');
    fxRates = data.rates;
    usingFxFallback = false;
  } catch (e) {
    console.warn('FX fetch failed, using fallback rates:', e);
    fxRates = { ...FX_FALLBACK };
    usingFxFallback = true;
  }
}

function toCurrency(amountUSD, ccy) {
  if (!fxRates || !fxRates[ccy]) return amountUSD; // assume USD if missing
  return amountUSD * fxRates[ccy];
}

function pricePerGramForKaratUSD(karat) {
  // Prefer API provided per-gram if available
  const key = `price_gram_${karat}k`;
  if (gold && gold[key] != null) return gold[key];
  // Otherwise derive from spot ounce (assume 24k spot)
  const perGram24 = (gold.price || 0) / OZ_TO_GRAM;
  if (karat == 24) return perGram24;
  // proportional purity approximation
  return perGram24 * (karat/24);
}

function unitToGrams(weight, unit) {
  if (unit === 'g') return weight;
  if (unit === 'kg') return weight * 1000;
  if (unit === 'oz') return weight * OZ_TO_GRAM;
  return weight;
}

function lastUpdateText(tsSec) {
  const now = Date.now();
  const t = (tsSec || (Date.now()/1000)) * 1000;
  const diffMin = Math.max(0, Math.round((now - t)/60000));
  if (diffMin <= 1) return 'just now';
  return `${diffMin} minutes ago`;
}

function applySentiment() {
  if (!gold) return '—';
  if (gold.ch > 0) return 'Bullish';
  if (gold.ch < 0) return 'Bearish';
  return 'Neutral';
}

function updateUI() {
  const ccy = document.getElementById('currency').value;
  // Hero stats
  document.getElementById('stat-24k').textContent = fmt(toCurrency(gold.price_gram_24k, ccy), ccy) + ' / g';
  document.getElementById('stat-22k').textContent = fmt(toCurrency(gold.price_gram_22k, ccy), ccy) + ' / g';
  document.getElementById('stat-spot').textContent = fmt(toCurrency(gold.price, ccy), ccy) + ' / oz';
  document.getElementById('stat-spot-ch').textContent = `${gold.chp>0?'+':''}${gold.chp}% (${gold.ch>0?'+':''}${gold.ch})`;

  // Live cards
  document.getElementById('card-24k').textContent = fmt(toCurrency(gold.price_gram_24k, ccy), ccy) + ' / g';
  document.getElementById('card-22k').textContent = fmt(toCurrency(gold.price_gram_22k, ccy), ccy) + ' / g';
  document.getElementById('card-18k').textContent = fmt(toCurrency(gold.price_gram_18k, ccy), ccy) + ' / g';
  document.getElementById('card-14k').textContent = fmt(toCurrency(gold.price_gram_14k, ccy), ccy) + ' / g';
  document.getElementById('card-24k-ch').textContent = `Spot change: ${gold.chp>0?'+':''}${gold.chp}%`;
  document.getElementById('card-22k-ch').textContent = `Spot change: ${gold.chp>0?'+':''}${gold.chp}%`;
  document.getElementById('card-18k-ch').textContent = `Spot change: ${gold.chp>0?'+':''}${gold.chp}%`;
  document.getElementById('card-14k-ch').textContent = `Spot change: ${gold.chp>0?'+':''}${gold.chp}%`;

  // Market stats
  document.getElementById('stat-open').textContent = fmt(toCurrency(gold.open_price, ccy), ccy) + ' / oz';
  document.getElementById('stat-high').textContent = fmt(toCurrency(gold.high_price, ccy), ccy) + ' / oz';
  document.getElementById('stat-low').textContent = fmt(toCurrency(gold.low_price, ccy), ccy) + ' / oz';
  document.getElementById('sentiment').textContent = applySentiment();

  // Update last update
  document.getElementById('last-update').textContent = lastUpdateText(gold.timestamp);

  // FX fallback notice
  const fxNoteEl = document.getElementById('fx-note');
  if (fxNoteEl) {
    fxNoteEl.textContent = usingFxFallback ? 'Converted using fallback FX rates (approx).' : 'Converted from USD via live FX.';
  }

}

function handleCalculator() {
  const btn = document.getElementById('btn-calc');
  btn.addEventListener('click', () => {
    const karat = parseInt(document.getElementById('calc-karat').value, 10);
    const weight = parseFloat(document.getElementById('calc-weight').value || '0');
    const unit = document.getElementById('calc-unit').value;
    const ccy = document.getElementById('calc-currency').value;
    if (!weight || weight <= 0) {
      document.getElementById('calc-result').textContent = 'Enter a valid weight.';
      return;
    }
    const grams = unitToGrams(weight, unit);
    const perGramUSD = pricePerGramForKaratUSD(karat);
    const totalUSD = grams * perGramUSD;
    const total = toCurrency(totalUSD, ccy);
    document.getElementById('calc-result').textContent = `≈ ${fmt(total, ccy)} (${grams.toFixed(3)} g × ${fmt(toCurrency(perGramUSD, ccy), ccy)}/g)`;
  });
}

async function init() {
  await Promise.all([fetchGold(), fetchFx()]);
  updateUI();
  handleCalculator();

  // React to currency change
  document.getElementById('currency').addEventListener('change', updateUI);

  // Auto-refresh every 60s
  setInterval(async () => {
    await fetchGold();
    updateUI();
  }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
