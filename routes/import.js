const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { dbRun } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

router.use(requireAuth);

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir, fileFilter: (req, file, cb) => { if (!file.originalname.endsWith('.csv')) return cb(new Error('Only CSV files allowed')); cb(null, true); }});

const ALIASES = { ticker:'symbol',name:'symbol',instrument:'symbol',type:'asset_type',class:'asset_type',side:'direction',action:'direction',entry:'entry_price',open:'entry_price',open_price:'entry_price',exit:'exit_price',close:'exit_price',close_price:'exit_price',qty:'quantity',size:'quantity',units:'quantity',shares:'quantity',lots:'quantity',entry_time:'entry_date',open_date:'entry_date',exit_time:'exit_date',close_date:'exit_date',sl:'stop_loss',stoploss:'stop_loss',tp:'take_profit',takeprofit:'take_profit',fee:'commission',fees:'commission',note:'notes',comment:'notes' };
const DIR_MAP = { buy:'long',sell:'short',b:'long',s:'short',long:'long',short:'short' };
const ASSET_MAP = { equities:'stock',equity:'stock',shares:'stock',fx:'forex',currency:'forex',coin:'crypto',cryptocurrency:'crypto',future:'futures',option:'options' };

function parseCSVLine(line) { const r=[]; let c=''; let q=false; for(const ch of line){ if(ch==='"')q=!q; else if(ch===','&&!q){r.push(c);c='';}else c+=ch; } r.push(c); return r; }

function parseCSVText(text) {
  const lines=text.trim().split('\n').filter(l=>l.trim());
  if(lines.length<2) throw new Error('CSV needs header + at least one row');
  const headers=lines[0].split(',').map(h=>{ const k=h.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z_]/g,''); return ALIASES[k]||k; });
  return lines.slice(1).map(line=>{
    const vals=parseCSVLine(line); const row={};
    headers.forEach((h,i)=>row[h]=(vals[i]||'').trim());
    row.direction=DIR_MAP[row.direction?.toLowerCase()]||'long';
    row.asset_type=ASSET_MAP[row.asset_type?.toLowerCase()]||row.asset_type?.toLowerCase()||'stock';
    const clean=v=>parseFloat((v||'').replace(/[$,]/g,''));
    row.entry_price=clean(row.entry_price); row.exit_price=clean(row.exit_price);
    row.quantity=clean(row.quantity); row.commission=clean(row.commission)||0;
    const errors=[];
    if(!row.symbol)errors.push('missing symbol');
    if(isNaN(row.entry_price))errors.push('invalid entry_price');
    if(isNaN(row.exit_price))errors.push('invalid exit_price');
    if(isNaN(row.quantity))errors.push('invalid quantity');
    if(!errors.length) row.pnl=parseFloat(((row.exit_price-row.entry_price)*row.quantity*(row.direction==='short'?-1:1)-row.commission).toFixed(8));
    else row._error=errors.join(', ');
    return row;
  });
}

router.post('/preview', upload.single('file'), (req, res) => {
  try {
    if(!req.file) return res.status(400).json({success:false,error:'No file'});
    const text=fs.readFileSync(req.file.path,'utf8'); fs.unlinkSync(req.file.path);
    const rows=parseCSVText(text);
    res.json({success:true,data:{total:rows.length,valid:rows.filter(r=>!r._error).length,errors:rows.filter(r=>r._error).length,rows}});
  } catch(err){res.status(400).json({success:false,error:err.message});}
});

router.post('/confirm', (req, res) => {
  try {
    const validRows=(req.body.rows||[]).filter(r=>!r._error);
    if(!validRows.length) return res.status(400).json({success:false,error:'No valid rows'});
    validRows.forEach(t=>dbRun(`INSERT OR IGNORE INTO trades (id,user_id,symbol,asset_type,direction,entry_price,exit_price,quantity,entry_date,exit_date,stop_loss,take_profit,strategy,notes,commission,market_conditions,pnl,broker) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(),req.user.id,t.symbol.toUpperCase(),t.asset_type,t.direction,t.entry_price,t.exit_price,t.quantity,t.entry_date||null,t.exit_date||null,parseFloat(t.stop_loss)||null,parseFloat(t.take_profit)||null,t.strategy||null,t.notes||null,t.commission||0,t.market_conditions||null,t.pnl,'csv_import']));
    res.json({success:true,imported:validRows.length});
  } catch(err){res.status(500).json({success:false,error:err.message});}
});

router.get('/sample', (req, res) => {
  const csv=['symbol,asset_type,direction,entry_price,exit_price,quantity,entry_date,exit_date,strategy,commission','AAPL,stock,long,178.50,182.30,100,2025-01-10,2025-01-10,Breakout,2.00'].join('\n');
  res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="sample.csv"'); res.send(csv);
});

module.exports = router;
