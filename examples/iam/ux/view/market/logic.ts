// load market data from static JSON file served under public/api/asset/eod
export async function loadMarketData() {
  const resp = await fetch('/api/asset/eod/TSLA.json');
  if (!resp.ok) throw new Error('failed to load market data');
  const data = await resp.json();
  // assume file structure contains an array of {time, price}
  return { series: data, table: data };
}
