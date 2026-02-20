const axios = require('axios');

// ── ALPACA ───────────────────────────────────────────────
async function fetchAlpacaTrades({ api_key, api_secret, paper = true }) {
  const baseURL = paper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
  const { data } = await axios.get(`${baseURL}/v2/orders`, {
    headers: { 'APCA-API-KEY-ID': api_key, 'APCA-API-SECRET-KEY': api_secret },
    params: { status: 'closed', limit: 500, direction: 'desc' }
  });
  return data.filter(o => o.filled_at).map(o => ({
    symbol: o.symbol,
    asset_type: o.asset_class === 'crypto' ? 'crypto' : 'stock',
    direction: o.side === 'buy' ? 'long' : 'short',
    entry_price: parseFloat(o.filled_avg_price || o.limit_price || 0),
    exit_price: parseFloat(o.filled_avg_price || 0),
    quantity: parseFloat(o.filled_qty),
    entry_date: o.submitted_at,
    exit_date: o.filled_at,
    commission: 0,
    broker: 'alpaca',
    broker_trade_id: o.id,
    strategy: 'Alpaca Import',
    notes: `Type: ${o.order_type}`,
    pnl: 0
  }));
}

// ── BINANCE ──────────────────────────────────────────────
async function fetchBinanceTrades({ api_key, api_secret }) {
  const crypto = require('crypto');
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}&limit=500`;
  const signature = crypto.createHmac('sha256', api_secret).update(queryString).digest('hex');

  const { data } = await axios.get('https://api.binance.com/api/v3/myTrades', {
    headers: { 'X-MBX-APIKEY': api_key },
    params: { timestamp, limit: 500, signature }
  });

  return data.map(t => ({
    symbol: t.symbol,
    asset_type: 'crypto',
    direction: t.isBuyer ? 'long' : 'short',
    entry_price: parseFloat(t.price),
    exit_price: parseFloat(t.price),
    quantity: parseFloat(t.qty),
    entry_date: new Date(t.time).toISOString(),
    exit_date: new Date(t.time).toISOString(),
    commission: parseFloat(t.commission),
    broker: 'binance',
    broker_trade_id: t.id.toString(),
    pnl: 0
  }));
}

// ── METATRADER 5 ─────────────────────────────────────────
async function fetchMetaTraderTrades({ api_key, account_id, server_url }) {
  if (!server_url) throw new Error('MetaTrader requires a server_url from your broker');
  const { data } = await axios.get(`${server_url}/api/mt/deals`, {
    headers: { Authorization: `Bearer ${api_key}` },
    params: { account: account_id, limit: 500 }
  });
  return data.map(d => ({
    symbol: d.symbol,
    asset_type: 'forex',
    direction: d.type === 0 ? 'long' : 'short',
    entry_price: d.price, exit_price: d.price,
    quantity: d.volume,
    entry_date: new Date(d.time * 1000).toISOString(),
    exit_date: new Date(d.time * 1000).toISOString(),
    commission: d.commission || 0,
    broker: 'metatrader',
    broker_trade_id: d.deal.toString(),
    pnl: d.profit || 0
  }));
}

// ── IBKR (stub — requires TWS Gateway) ───────────────────
async function fetchIBKRTrades() {
  throw new Error('IBKR requires IB Gateway running locally. Use CSV export instead for now.');
}

// ── MAIN ─────────────────────────────────────────────────
async function fetchTradesFromBroker(brokerName, credentials) {
  switch (brokerName.toLowerCase()) {
    case 'alpaca':     return fetchAlpacaTrades(credentials);
    case 'binance':    return fetchBinanceTrades(credentials);
    case 'metatrader': return fetchMetaTraderTrades(credentials);
    case 'ibkr':       return fetchIBKRTrades(credentials);
    default: throw new Error(`Unsupported broker: ${brokerName}`);
  }
}

module.exports = { fetchTradesFromBroker };
