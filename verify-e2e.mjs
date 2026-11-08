import LZString from 'lz-string';

const BASE_URL = 'http://localhost:3005';

async function runSuite() {
  console.log('====================================================');
  console.log(' STATELESS EQUITY TERMINAL - E2E LIVE VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, detail = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ✓ ${testName} ${detail ? `(${detail})` : ''}`);
    } else {
      console.error(`[FAIL] ✗ ${testName} ${detail ? `(${detail})` : ''}`);
    }
  }

  // ----------------------------------------------------
  // TEST SUITE 1: ROOT UI SERVER-SIDE VERIFICATION
  // ----------------------------------------------------
  console.log('--- SUITE 1: ROOT UI ROUTE (GET /) ---');
  try {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, 'HTTP 200 OK for root page');
    const html = await res.text();
    assert(html.includes('Morse Bridge'), 'Page contains Morse Bridge title');
    assert(html.includes('dark'), 'Dark mode root class rendered');
    assert(html.includes('Zero-DB') || html.includes('ZERO-DB'), 'Zero-DB verification badge rendered');
  } catch (err) {
    assert(false, 'Root page fetched successfully', err.message);
  }

  // ----------------------------------------------------
  // TEST SUITE 2: 409A BLACK-SCHOLES API QUANT ENGINE
  // ----------------------------------------------------
  console.log('\n--- SUITE 2: 409A BLACK-SCHOLES QUANT ENGINE (/api/price-409a) ---');

  // Benchmark A: Classic At-the-Money (S=100, K=100, T=1, r=0.05, sigma=0.20) -> 10.4506
  try {
    const resA = await fetch(`${BASE_URL}/api/price-409a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockPrice: 100,
        strikePrice: 100,
        timeToExit: 1,
        riskFreeRate: 0.05,
        volatility: 0.20,
      }),
    });
    assert(resA.status === 200, 'ATM BSM API status 200');
    const dataA = await resA.json();
    assert(
      Math.abs(dataA.callPrice - 10.4506) < 0.02,
      'ATM Call Option Price exact benchmark match',
      `Result: $${dataA.callPrice}, Target: ~$10.45`
    );
    assert(
      dataA.delta >= 0.63 && dataA.delta <= 0.64,
      'ATM Delta within theoretical bounds [0.63, 0.64]',
      `Delta: ${dataA.delta}`
    );
  } catch (err) {
    assert(false, 'ATM BSM test executed', err.message);
  }

  // Benchmark B: Deep In-the-Money (S=150, K=100, T=1, r=0.05, sigma=0.20)
  try {
    const resB = await fetch(`${BASE_URL}/api/price-409a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockPrice: 150,
        strikePrice: 100,
        timeToExit: 1,
        riskFreeRate: 0.05,
        volatility: 0.20,
      }),
    });
    const dataB = await resB.json();
    assert(dataB.callPrice > 50, 'ITM Call Price exceeds intrinsic value ($50)', `Result: $${dataB.callPrice}`);
    assert(dataB.delta > 0.95, 'ITM Delta approaches 1.0', `Delta: ${dataB.delta}`);
  } catch (err) {
    assert(false, 'ITM BSM test executed', err.message);
  }

  // Benchmark C: Startup 409A Baseline (Elena & Marcus company state)
  try {
    const resC = await fetch(`${BASE_URL}/api/price-409a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockPrice: 3.50,
        strikePrice: 3.50,
        timeToExit: 2.5,
        riskFreeRate: 0.045,
        volatility: 0.65,
      }),
    });
    const dataC = await resC.json();
    assert(dataC.callPrice > 0, 'Startup 409A produces valid positive FMV', `FMV: $${dataC.callPrice}`);
    assert(dataC.gamma > 0, 'Gamma is strictly positive', `Gamma: ${dataC.gamma}`);
  } catch (err) {
    assert(false, 'Startup 409A test executed', err.message);
  }

  // ----------------------------------------------------
  // TEST SUITE 3: SAFE CONVERSION API ENGINE
  // ----------------------------------------------------
  console.log('\n--- SUITE 3: SAFE CONVERSION QUANT ENGINE (/api/convert-safes) ---');
  try {
    const safePayload = {
      companyDetails: {
        companyName: 'Apex Robotics Inc.',
        totalAuthorizedShares: 15000000,
        targetSeriesAValuation: 25000000,
        seriesANewMoney: 5000000,
      },
      capTable: [
        { id: 'stk-1', name: 'Elena Rostova', shareClass: 'Common', shares: 4500000, investmentAmount: 4500 },
        { id: 'stk-2', name: 'Marcus Vance', shareClass: 'Common', shares: 3500000, investmentAmount: 3500 },
        { id: 'stk-3', name: 'Option Pool', shareClass: 'Common', shares: 1000000, investmentAmount: 0 },
        { id: 'stk-4', name: 'Vanguard Seed', shareClass: 'Preferred', shares: 1000000, investmentAmount: 1500000 },
      ],
      safes: [
        { id: 'safe-1', investor: 'YC Post-Money', amount: 500000, valuationCap: 15000000, discount: 0, type: 'Post-Money' },
        { id: 'safe-2', investor: 'Horizon Pre-Money', amount: 1000000, valuationCap: 12000000, discount: 0.20, type: 'Pre-Money' },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/convert-safes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safePayload),
    });
    assert(res.status === 200, 'SAFE Conversion API status 200');
    const data = await res.json();
    
    assert(data.totalShares > 10000000, 'Diluted total shares expanded beyond initial 10M', `Total: ${data.totalShares.toLocaleString()}`);
    assert(data.postMoneyValuation === 30000000, 'Post-Money Valuation equals Pre-Money ($25M) + New Money ($5M)', `$${data.postMoneyValuation.toLocaleString()}`);
    assert(data.seriesAPricePerShare > 0, 'Series A PPS is positive', `$${data.seriesAPricePerShare}`);
    assert(data.dilutedCapTable.length === 7, 'All original stakeholders + 2 converted SAFEs + Series A present (7 rows)', `Rows: ${data.dilutedCapTable.length}`);

    // Check sum of ownership percentages equals 100% (+/- 0.05% rounding)
    const totalOwnership = data.dilutedCapTable.reduce((sum, s) => sum + s.ownershipPercent, 0);
    assert(Math.abs(totalOwnership - 100) < 0.05, 'Sum of all diluted ownership percentages equals 100.0%', `Sum: ${totalOwnership.toFixed(2)}%`);
  } catch (err) {
    assert(false, 'SAFE Conversion test executed', err.message);
  }

  // ----------------------------------------------------
  // TEST SUITE 4: EXIT WATERFALL API ENGINE
  // ----------------------------------------------------
  console.log('\n--- SUITE 4: EXIT WATERFALL QUANT ENGINE (/api/waterfall) ---');
  const capTableForWaterfall = [
    { id: 'stk-1', name: 'Founders', shareClass: 'Common', shares: 8000000, investmentAmount: 8000 },
    { id: 'stk-2', name: 'Seed Preferred', shareClass: 'Preferred', shares: 2000000, investmentAmount: 2000000 },
  ];

  // Scenario 1: Downside / Impaired Exit ($1M exit, Preferred preference is $2M)
  try {
    const resLow = await fetch(`${BASE_URL}/api/waterfall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capTable: capTableForWaterfall,
        exitValuation: 1000000,
      }),
    });
    const dataLow = await resLow.json();
    const prefPayout = dataLow.payouts.find(p => p.shareClass === 'Preferred');
    const commonPayout = dataLow.payouts.find(p => p.shareClass === 'Common');

    assert(prefPayout.totalPayout === 1000000, 'Preferred takes 100% of proceeds up to preference during downside exit', `Preferred: $${prefPayout.totalPayout.toLocaleString()}`);
    assert(commonPayout.totalPayout === 0, 'Common receives $0 in downside exit prior to preference clearance', `Common: $${commonPayout.totalPayout}`);
    assert(!prefPayout.convertedToCommon, 'Preferred elects 1x liquidation preference (unconverted)', 'Converted: false');
  } catch (err) {
    assert(false, 'Waterfall downside test executed', err.message);
  }

  // Scenario 2: Upside / Crossover Exit ($50M exit, crossover is $10M)
  try {
    const resHigh = await fetch(`${BASE_URL}/api/waterfall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capTable: capTableForWaterfall,
        exitValuation: 50000000,
      }),
    });
    const dataHigh = await resHigh.json();
    const prefPayout = dataHigh.payouts.find(p => p.shareClass === 'Preferred');
    const commonPayout = dataHigh.payouts.find(p => p.shareClass === 'Common');

    assert(prefPayout.convertedToCommon === true, 'Preferred converts to Common above crossover point', 'Converted: true');
    assert(prefPayout.totalPayout === 10000000, 'Preferred receives 20% pro-rata common share ($10M)', `Preferred: $${prefPayout.totalPayout.toLocaleString()}`);
    assert(commonPayout.totalPayout === 40000000, 'Common receives 80% pro-rata share ($40M)', `Common: $${commonPayout.totalPayout.toLocaleString()}`);

    // Conservation of proceeds check
    const totalDistributed = dataHigh.payouts.reduce((sum, p) => sum + p.totalPayout, 0);
    assert(totalDistributed === 50000000, 'Exit proceeds conservation is 100% exact', `Distributed: $${totalDistributed.toLocaleString()}`);
  } catch (err) {
    assert(false, 'Waterfall crossover test executed', err.message);
  }

  // ----------------------------------------------------
  // TEST SUITE 5: URL HASH ENCODING FIDELITY & ZERO-DB
  // ----------------------------------------------------
  console.log('\n--- SUITE 5: URL HASH COMPRESSION & ZERO-DB FIDELITY ---');
  const complexState = {
    version: 1,
    companyDetails: {
      companyName: 'Acme Quantum Systems Inc. (Series B Ready)',
      totalAuthorizedShares: 20000000,
      targetSeriesAValuation: 45000000,
      seriesANewMoney: 10000000,
    },
    capTable: [
      { id: '1', name: 'Founder 1', shareClass: 'Common', shares: 5000000, investmentAmount: 5000 },
      { id: '2', name: 'Founder 2', shareClass: 'Common', shares: 3000000, investmentAmount: 3000 },
      { id: '3', name: 'VC Series Seed', shareClass: 'Preferred', shares: 2000000, investmentAmount: 4000000 },
    ],
    safes: [
      { id: 's1', investor: 'Strategic Partner', amount: 2000000, valuationCap: 30000000, discount: 0.15, type: 'Post-Money' },
    ],
    params409A: {
      stockPrice: 4.85,
      strikePrice: 4.85,
      timeToExit: 3.0,
      riskFreeRate: 0.0425,
      volatility: 0.70,
    },
    waterfallParams: {
      exitValuation: 85000000,
    },
  };

  const rawJson = JSON.stringify(complexState);
  const compressed = LZString.compressToEncodedURIComponent(rawJson);
  assert(compressed.length > 0, 'State compressed into URI-safe encoded string', `Length: ${compressed.length} chars`);
  assert(decodeURIComponent(compressed) === compressed, 'Compressed hash is safe for URI components without double escaping');

  const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
  const restoredState = JSON.parse(decompressed);
  assert(JSON.stringify(restoredState) === rawJson, 'Exact lossless round-trip decompression verified');

  console.log('\n====================================================');
  console.log(` VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSuite();
