
'use strict';

// FOUNDER — Build Your Empire
// Vanilla JavaScript and Canvas. Works on GitHub Pages.

const SAVE_KEY = 'founder-tycoon-v1';
const MAP_WIDTH = 1100;
const MAP_HEIGHT = 650;

const PROPERTY_LIST = [
  { id:'maple', label:'Maple Corner', district:'Market Square', kind:'cafe', kindName:'Coffee shop', short:'MAPLE COFFEE', cost:4200, rent:150, traffic:'Very high', multiplier:1.18, x:105, y:139, w:176, h:136, shade:'#d8ac80', roof:'#f2d2aa', height:34 },
  { id:'cedar', label:'Cedar Collective', district:'Arts Quarter', kind:'retail', kindName:'Retail store', short:'CEDAR GOODS', cost:6100, rent:195, traffic:'High', multiplier:1.09, x:329, y:91, w:132, h:141, shade:'#aab4b5', roof:'#d6d9ce', height:63 },
  { id:'foundry', label:'Foundry Works', district:'Innovation Row', kind:'tech', kindName:'Tech startup', short:'FOUNDRY TECH', cost:8600, rent:265, traffic:'Moderate', multiplier:1.0, x:733, y:97, w:189, h:151, shade:'#7c9aa1', roof:'#b0c9c5', height:62 },
  { id:'west', label:'Westside Market', district:'Old Town', kind:'cafe', kindName:'Food & drink', short:'WESTSIDE DELI', cost:3500, rent:135, traffic:'High', multiplier:1.02, x:125, y:484, w:181, h:121, shade:'#bf976f', roof:'#e6c19a', height:31 },
  { id:'skyline', label:'Skyline Offices', district:'Central Business', kind:'tech', kindName:'Software company', short:'SKYLINE HQ', cost:12500, rent:350, traffic:'Very high', multiplier:1.30, x:768, y:461, w:164, h:143, shade:'#809caa', roof:'#c3d5d4', height:92 }
];

const TYPE = {
  cafe: { price:12, baseDemand:48, unitCost:3.8, startStock:110, pack:80, staffCapacity:56, wage:120, maxStaff:6, name:'Coffee shop', product:'orders' },
  retail: { price:50, baseDemand:20, unitCost:21, startStock:55, pack:40, staffCapacity:29, wage:120, maxStaff:6, name:'Retail store', product:'items' },
  tech: { price:75, baseDemand:14, unitCost:13, startStock:null, pack:null, staffCapacity:20, wage:175, maxStaff:8, name:'Software company', product:'subscriptions' }
};

const GOALS = [
  {name:'Open for business', detail:'Launch your first company', target:1, metric:'count'},
  {name:'Growing network', detail:'Own 3 businesses in Oakwood', target:3, metric:'count'},
  {name:'Great place to work', detail:'Hire a total of 8 employees', target:8, metric:'employees'},
  {name:'First big payday', detail:'Earn $5,000 in cumulative profit', target:5000, metric:'profit'},
  {name:'The empire builder', detail:'Build your cash reserves to $100,000', target:100000, metric:'cash'}
];

const $ = selector => document.querySelector(selector);
const icon = id => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const money = value => `${value < 0 ? '-' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-AU')}`;
const signed = value => `${value > 0 ? '+' : value < 0 ? '-' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-AU')}`;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const propById = id => PROPERTY_LIST.find(p => p.id === id);
const weekdays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const defaultGame = () => ({
  version:1,
  day:1,
  cash:28000,
  selected:'maple',
  view:'city',
  theme:'dark',
  collapsed:false,
  businesses:[],
  history:[],
  events:[{
    day:1,
    title:'Welcome to Oakwood',
    message:'Select a marked building to open your first business.',
    loss:false
  }],
  totalProfit:0,
  lastDay:{
    revenue:0,profit:0,rent:0,wages:0,
    marketing:0,cogs:0,sold:0,customers:0
  }
});

function loadGame(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return defaultGame();

    const s = JSON.parse(raw);

    if(
      s.version !== 1 ||
      !Array.isArray(s.businesses) ||
      !Number.isFinite(s.cash) ||
      !Number.isFinite(s.day)
    ) return defaultGame();

    const goodBusinesses = s.businesses
      .filter(b =>
        propById(b.propertyId) &&
        TYPE[b.kind] &&
        Number.isFinite(b.price) &&
        Number.isFinite(b.staff)
      )
      .map(b=>({
        ...b,
        level:clamp(b.level||1,1,5),
        quality:clamp(b.quality||72,1,100),
        lastRevenue:b.lastRevenue||0,
        lastProfit:b.lastProfit||0
      }));

    return {
      ...defaultGame(),
      ...s,
      businesses:goodBusinesses,
      history:Array.isArray(s.history)?s.history.slice(-60):[],
      events:Array.isArray(s.events)?s.events.slice(0,12):[],
      selected:propById(s.selected)?s.selected:'maple',
      view:['city','overview','portfolio','finances','goals'].includes(s.view)?s.view:'city',
      theme:s.theme==='light'?'light':'dark',
      day:Math.max(1,Math.floor(s.day))
    };
  }catch(err){
    return defaultGame();
  }
}

let game = loadGame();

function save(){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify(game));
  }catch(err){}
}

function businessFor(propertyId){
  return game.businesses.find(b=>b.propertyId===propertyId);
}

function selectedProperty(){
  return propById(game.selected)||PROPERTY_LIST[0];
}

function employeeCount(){
  return game.businesses.reduce((total,b)=>total+b.staff,0);
}

function addEvent(title,message,loss=false){
  game.events.unshift({day:game.day,title,message,loss});
  game.events=game.events.slice(0,12);
}

function canAfford(n){
  return game.cash>=n;
}

function toast(message,error=false){
  const item=document.createElement('div');
  item.className=`toast${error?' error':''}`;
  item.textContent=message;
  $('#toastRoot').append(item);
  setTimeout(()=>item.remove(),3400);
}

// Main interface

function render(){
  document.body.dataset.theme=game.theme;
  $('#sidebar').classList.toggle('collapsed',game.collapsed);

  $('#themeToggle span').textContent =
    game.theme==='dark'?'Light appearance':'Dark appearance';

  $('#themeToggle use').setAttribute(
    'href',
    game.theme==='dark'?'#i-sun':'#i-moon'
  );

  document.querySelectorAll('.nav-button[data-view]')
    .forEach(b=>b.classList.toggle('active',b.dataset.view===game.view));

  const names={
    city:['CITY','Your city'],
    overview:['OVERVIEW','The big picture'],
    portfolio:['BUSINESSES','Your portfolio'],
    finances:['FINANCES','Money matters'],
    goals:['GOALS','Your milestones']
  };

  $('#breadcrumb').textContent=names[game.view][0];
  $('#pageTitle').innerHTML=
    `${names[game.view][1]}<span class="heading-accent">.</span>`;

  $('#dateText').textContent=`DAY ${game.day}`;
  $('#weekdayText').textContent=weekdays[(game.day-1)%7].toUpperCase();

  $('#cashValue').textContent=money(game.cash);
  $('#cashCaption').textContent=
    game.cash<5000?'Cash is running low':'Bank balance';
  $('#cashCaption').classList.toggle('negative',game.cash<5000);

  $('#revenueValue').textContent=money(game.lastDay.revenue);
  $('#revenueCaption').textContent=
    game.day===1?'No sales yet':`Day ${game.day-1} sales`;

  $('#profitValue').textContent=signed(game.lastDay.profit);
  $('#profitValue').classList.toggle('negative',game.lastDay.profit<0);
  $('#profitCaption').textContent='After business costs';

  $('#businessValue').innerHTML=
    `${game.businesses.length} <em>/ 5</em>`;

  $('#businessCaption').textContent=
    game.businesses.length===0
      ?'Open a property to begin'
      :`${employeeCount()} employees working`;

  $('#mapCaption').textContent=
    `${PROPERTY_LIST.length-game.businesses.length} properties available`;

  $('#tipText').textContent=
    game.businesses.length===0
      ?'Select a property on the map to launch your first business.'
      :game.businesses.some(b=>b.kind!=='tech'&&b.stock<20)
        ?'Stock is running low. Select your business and restock before the next day.'
        :'Try changing your prices or marketing, then advance the day to see the result.';

  $('#cityView').hidden=game.view!=='city';
  $('#otherView').hidden=game.view==='city';

  if(game.view==='city') renderInspector();
  else renderOtherView();

  save();
}

function switchView(view){
  game.view=view;
  render();
}

function selectProperty(id){
  if(!propById(id)) return;
  game.selected=id;
  game.view='city';
  render();
}

function miniatureIllustration(kind,owned=false){
  return `
  <div class="illustration" aria-hidden="true">
    <div class="ill-sky"></div>
    <div class="ill-sun"></div>
    <div class="ill-building ${kind} ${owned?'owned':''}">
      <span></span><span></span><span></span>
    </div>
  </div>`;
}

function upgradeCost(b){
  return Math.round(
    (1000+propById(b.propertyId).cost*.22)*
    Math.pow(1.75,b.level-1)
  );
}

function renderInspector(){
  const p=selectedProperty();
  const b=businessFor(p.id);

  if(!b){
    $('#inspector').innerHTML=`
      <div class="inspector-kicker">AVAILABLE PROPERTY</div>
      ${miniatureIllustration(p.kind)}
      <h2 class="inspector-title">${p.label}</h2>
      <p class="inspector-desc">
        ${p.district} · Set up a ${p.kindName.toLowerCase()}
        and begin building your business empire.
      </p>
      <div class="property-tags">
        <span class="tag">${p.kindName}</span>
        <span class="tag">${p.traffic} foot traffic</span>
      </div>
      <hr class="separator">
      <div class="detail-grid">
        <div class="detail-item">
          <span>Launch cost</span><strong>${money(p.cost)}</strong>
        </div>
        <div class="detail-item">
          <span>Daily rent</span><strong>${money(p.rent)}</strong>
        </div>
        <div class="detail-item">
          <span>First employee</span><strong>Included</strong>
        </div>
        <div class="detail-item">
          <span>Location</span><strong>${p.district}</strong>
        </div>
      </div>
      <div class="inspector-bottom">
        <button class="primary-button full"
          data-action="open-modal" data-id="${p.id}"
          ${canAfford(p.cost)?'':'disabled'}>
          ${icon('plus')} Launch a business
        </button>
        <p class="subtle-note">
          ${canAfford(p.cost)
            ?'Includes opening setup and starter supplies.'
            :'You need more money before opening here.'}
        </p>
      </div>`;
    return;
  }

  const cfg=TYPE[b.kind];
  const rating=(b.quality/20).toFixed(1);

  $('#inspector').innerHTML=`
    <div class="owned-scroll">
      <div class="inspector-kicker">BUSINESS MANAGEMENT</div>
      <span class="property-status">
        ${icon('check')} OPEN FOR BUSINESS
      </span>
      <h2 class="inspector-title">${escapeHTML(b.name)}</h2>
      <p class="inspector-desc">
        ${p.district} · Level ${b.level} ${cfg.name.toLowerCase()}
      </p>
      <div class="property-tags">
        <span class="tag">${b.staff} staff</span>
        <span class="tag">${rating} / 5.0 satisfaction</span>
      </div>
      <div class="stat-bar">
        <div class="stat-bar-head">
          <span>Customer satisfaction</span>
          <strong>${Math.round(b.quality)}%</strong>
        </div>
        <div class="track">
          <div class="track-fill" style="width:${b.quality}%"></div>
        </div>
      </div>
      <hr class="separator">
      <div class="detail-grid">
        <div class="detail-item">
          <span>Last-day sales</span>
          <strong>${money(b.lastRevenue)}</strong>
        </div>
        <div class="detail-item">
          <span>Last-day profit</span>
          <strong class="${b.lastProfit<0?'negative':''}">
            ${signed(b.lastProfit)}
          </strong>
        </div>
      </div>

      <div class="manage-group">
        <div class="manage-label">
          <span>Price per ${b.kind==='tech'?'subscription':'sale'}</span>
          <strong>Suggested ${money(cfg.price)}</strong>
        </div>
        <div class="stepper">
          <button class="mini-action" data-action="price-down"
            data-id="${p.id}" aria-label="Reduce price">
            ${icon('minus')}
          </button>
          <strong>${money(b.price)}</strong>
          <button class="mini-action" data-action="price-up"
            data-id="${p.id}" aria-label="Increase price">
            ${icon('plus')}
          </button>
        </div>
      </div>

      <div class="manage-group">
        <div class="manage-label">
          <span>Team members</span>
          <strong>${money(cfg.wage)} / employee / day</strong>
        </div>
        <div class="stepper">
          <button class="mini-action" data-action="fire"
            data-id="${p.id}" aria-label="Reduce staff"
            ${b.staff<=1?'disabled':''}>
            ${icon('minus')}
          </button>
          <strong>${b.staff} / ${cfg.maxStaff}</strong>
          <button class="mini-action" data-action="hire"
            data-id="${p.id}" aria-label="Hire staff"
            ${b.staff>=cfg.maxStaff?'disabled':''}>
            ${icon('plus')}
          </button>
        </div>
      </div>

      <div class="manage-group">
        <div class="manage-label">
          <span>Daily marketing budget</span>
          <strong>Improves demand</strong>
        </div>
        <div class="stepper">
          <button class="mini-action" data-action="marketing-down"
            data-id="${p.id}" aria-label="Reduce marketing">
            ${icon('minus')}
          </button>
          <strong>${money(b.marketing)} / day</strong>
          <button class="mini-action" data-action="marketing-up"
            data-id="${p.id}" aria-label="Increase marketing">
            ${icon('plus')}
          </button>
        </div>
      </div>

      <div class="management-actions">
        ${b.kind!=='tech'
          ?`<button class="secondary-button"
             data-action="restock" data-id="${p.id}">
             ${icon('box')} Restock ${cfg.pack} units ·
             ${money(cfg.pack*cfg.unitCost)}
           </button>`
          :''}
        <button class="secondary-button" data-action="upgrade"
          data-id="${p.id}" ${b.level>=5?'disabled':''}>
          ${icon('bolt')}
          ${b.level>=5?'Fully upgraded'
            :`Upgrade to level ${b.level+1} · ${money(upgradeCost(b))}`}
        </button>
      </div>
      <div class="property-balance">
        <span>
          ${b.kind==='tech'
            ?'Digital product — no stock needed'
            :'Inventory in storage'}
        </span>
        <strong>${b.kind==='tech'?'Unlimited':`${b.stock} units`}</strong>
      </div>
    </div>`;
}

// Dashboard views

function goalValue(metric){
  return metric==='count'?game.businesses.length:
    metric==='employees'?employeeCount():
    metric==='profit'?game.totalProfit:game.cash;
}

function emptyMarkup(title,desc){
  return `<div class="big-empty">
    ${icon('shop')}
    <h3>${title}</h3>
    <p>${desc}</p>
    <button class="primary-button" data-action="go-city">
      Explore Oakwood ${icon('arrow')}
    </button>
  </div>`;
}

function activityMarkup(){
  return game.events.slice(0,7).map(e=>`
    <div class="activity-item">
      <span class="activity-dot ${e.loss?'loss':''}"></span>
      <div>
        <strong>${escapeHTML(e.title)}
          <span style="font-weight:500;color:var(--subtle);font-size:10px">
            · Day ${e.day}
          </span>
        </strong>
        <p>${escapeHTML(e.message)}</p>
      </div>
    </div>`).join('');
}

function chartMarkup(){
  const raw=game.history.slice(-10);
  const values=raw.length?raw:[{day:1,profit:0}];
  const bottom=Math.min(0,...values.map(v=>v.profit));
  const top=Math.max(50,...values.map(v=>v.profit));
  const range=Math.max(50,top-bottom);

  const X=i=>26+(i/(Math.max(values.length-1,1)))*560;
  const Y=v=>222-((v-bottom)/range)*188;
  const points=values.map((v,i)=>`${X(i)},${Y(v.profit)}`).join(' ');
  const area=`26,226 ${points} ${X(values.length-1)},226`;
  const zero=Y(0);

  return `
    <div class="chart-wrap">
      <svg viewBox="0 0 620 250" preserveAspectRatio="none"
        role="img" aria-label="Daily profit chart">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop stop-color="#a8df70" stop-opacity=".35"/>
            <stop offset="1" stop-color="#a8df70" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${[0,1,2,3,4].map(i=>`
          <line x1="26" x2="610"
            y1="${30+i*48}" y2="${30+i*48}"
            stroke="var(--line)" stroke-dasharray="4 7"/>
        `).join('')}
        <line x1="26" x2="610" y1="${zero}" y2="${zero}"
          stroke="var(--muted)" stroke-opacity=".6"/>
        <polygon points="${area}" fill="url(#chartGradient)"/>
        <polyline points="${points}" fill="none"
          stroke="var(--accent)" stroke-width="3.5"
          stroke-linecap="round" stroke-linejoin="round"
          vector-effect="non-scaling-stroke"/>
        ${values.map((v,i)=>`
          <circle cx="${X(i)}" cy="${Y(v.profit)}"
            r="4" fill="var(--accent)"
            stroke="var(--surface)" stroke-width="2">
            <title>Day ${v.day}: ${signed(v.profit)}</title>
          </circle>
        `).join('')}
      </svg>
    </div>
    <div class="chart-axis">
      <span>DAY ${values[0].day}</span>
      <span>${values.length<2
        ?'Advance a day to see results'
        :'DAY '+values[values.length-1].day}</span>
    </div>`;
}

function renderOtherView(){
  const root=$('#otherView');

  if(game.view==='overview'){
    const t=game.history.reduce((a,h)=>a+h.profit,0);
    root.innerHTML=`
      <div class="view-intro">
        <div><h2>Business at a glance</h2>
          <p>Your latest performance, activity, and next steps.</p>
        </div>
      </div>
      <div class="overview-grid">
        <article class="content-card">
          <div class="card-topline">
            <h3>Daily profit performance</h3>
            <span>Last ${Math.min(10,game.history.length)} days</span>
          </div>
          ${chartMarkup()}
          <div class="tile-stats">
            <div><span>Total days trading</span>
              <strong>${game.history.filter(h=>h.count>0).length}</strong>
            </div>
            <div><span>Net profit to date</span>
              <strong class="${t<0?'negative':''}">${signed(t)}</strong>
            </div>
          </div>
        </article>
        <article class="content-card">
          <div class="card-topline">
            <h3>Recent activity</h3><span>Game log</span>
          </div>
          <div class="activity-list">${activityMarkup()}</div>
        </article>
      </div>`;
  }

  if(game.view==='portfolio'){
    root.innerHTML=`
      <div class="view-intro">
        <div><h2>All your businesses</h2>
          <p>Every venture you own, all in one place.</p>
        </div>
        <button class="secondary-button" data-action="go-city">
          ${icon('city')} Explore map
        </button>
      </div>
      ${game.businesses.length
        ?`<div class="portfolio-grid">
          ${game.businesses.map(b=>{
            const p=propById(b.propertyId);
            return `
              <article class="portfolio-tile">
                <div class="portfolio-icon">
                  ${icon(b.kind==='tech'?'bolt':'shop')}
                </div>
                <div>
                  <h3>${escapeHTML(b.name)}</h3>
                  <p>${p.district} · Level ${b.level} ${TYPE[b.kind].name}</p>
                </div>
                <div class="tile-stats">
                  <div><span>Daily sales</span>
                    <strong>${money(b.lastRevenue)}</strong>
                  </div>
                  <div><span>Daily profit</span>
                    <strong class="${b.lastProfit<0?'negative':''}">
                      ${signed(b.lastProfit)}
                    </strong>
                  </div>
                </div>
                <button class="secondary-button" data-action="manage"
                  data-id="${p.id}">
                  Manage business ${icon('arrow')}
                </button>
              </article>`;
          }).join('')}
        </div>`
        :emptyMarkup('You have no businesses yet',
          'Choose a building in Oakwood District to get started.')}`;
  }

  if(game.view==='finances'){
    const d=game.lastDay;

    root.innerHTML=`
      <div class="view-intro">
        <div><h2>Financial report</h2>
          <p>Results from the most recently completed trading day.</p>
        </div>
      </div>
      <div class="finance-grid">
        <article class="content-card">
          <div class="card-topline">
            <h3>Last-day income statement</h3>
            <span>Day ${Math.max(1,game.day-1)}</span>
          </div>
          <div class="finance-rows">
            <div class="finance-row"><span>Gross revenue</span>
              <strong>${money(d.revenue)}</strong></div>
            <div class="finance-row"><span>Cost of goods and services sold</span>
              <strong>-${money(d.cogs)}</strong></div>
            <div class="finance-row"><span>Employee wages</span>
              <strong>-${money(d.wages)}</strong></div>
            <div class="finance-row"><span>Property rent</span>
              <strong>-${money(d.rent)}</strong></div>
            <div class="finance-row"><span>Marketing costs</span>
              <strong>-${money(d.marketing)}</strong></div>
            <div class="finance-row finance-total">
              <span>Net operating profit</span>
              <strong class="${d.profit<0?'negative':'positive'}">
                ${signed(d.profit)}
              </strong>
            </div>
          </div>
        </article>
        <article class="content-card">
          <div class="card-topline">
            <h3>Performance trend</h3>
            <span>Operating profit</span>
          </div>
          ${chartMarkup()}
          <p class="dialog-warning">
            Inventory is paid for when you restock. The income statement
            recognises inventory as a cost when items sell, so cash
            changes can differ from operating profit.
          </p>
        </article>
      </div>`;
  }

  if(game.view==='goals'){
    root.innerHTML=`
      <div class="view-intro">
        <div><h2>The road to an empire</h2>
          <p>Build something from nothing, one milestone at a time.</p>
        </div>
      </div>
      <div class="goal-list">
        ${GOALS.map(g=>{
          const current=goalValue(g.metric);
          const done=current>=g.target;
          return `
            <article class="goal-item ${done?'done':''}">
              <span class="goal-check">
                ${icon(done?'check':'target')}
              </span>
              <div class="goal-copy">
                <h3>${g.name}</h3><p>${g.detail}</p>
              </div>
              <div class="goal-progress">
                ${done?'COMPLETED':`
                  ${g.metric==='cash'||g.metric==='profit'
                    ?money(Math.max(0,current)):current}
                  /
                  ${g.metric==='cash'||g.metric==='profit'
                    ?money(g.target):g.target}`}
              </div>
            </article>`;
        }).join('')}
      </div>
      <div class="reward-banner">
        <div>
          <strong>
            ${GOALS.filter(g=>goalValue(g.metric)>=g.target).length}
            of ${GOALS.length} milestones complete
          </strong>
          <p>Every new business brings you closer to running the district.</p>
        </div>
        ${icon('star')}
      </div>`;
  }
}

// Business creation

function openBusinessModal(id){
  const p=propById(id);
  if(!p||businessFor(id)) return;

  const suggestedName=
    p.kind==='cafe'?'Daybreak Coffee':
    p.kind==='retail'?'Cedar & Co.':'Nova Digital';

  $('#modalRoot').innerHTML=`
    <div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true"
        aria-labelledby="modalTitle">
        <div class="modal-top">
          <div>
            <div class="inspector-kicker">YOUR NEXT CHAPTER</div>
            <h2 id="modalTitle">Launch a business</h2>
          </div>
          <button class="icon-button" data-action="close-modal"
            aria-label="Close dialog">${icon('close')}</button>
        </div>
        <p class="modal-subtitle">
          Open a ${p.kindName.toLowerCase()} at ${p.label}.
          Start with one employee and ${p.kind==='tech'
            ?'a ready-to-sell digital service'
            :'starter inventory'}.
        </p>
        <form id="launchForm" data-id="${p.id}">
          <div class="form-field">
            <label for="businessName">BUSINESS NAME</label>
            <input id="businessName" maxlength="28" minlength="2"
              required value="${escapeHTML(suggestedName)}"
              autocomplete="off">
          </div>
          <div class="purchase-breakdown">
            <div>
              <span>Premises setup and launch package</span>
              <strong>${money(p.cost)}</strong>
            </div>
            <div>
              <span>Daily rent (from first trading day)</span>
              <strong>${money(p.rent)}</strong>
            </div>
            <div class="total">
              <span>Upfront cost</span>
              <strong>${money(p.cost)}</strong>
            </div>
            <div>
              <span>Cash remaining</span>
              <strong>${money(game.cash-p.cost)}</strong>
            </div>
          </div>
          <div class="modal-alert" id="modalError"></div>
          <div class="modal-actions">
            <button class="secondary-button" type="button"
              data-action="close-modal">Cancel</button>
            <button class="primary-button" type="submit"
              ${canAfford(p.cost)?'':'disabled'}>
              Launch business ${icon('arrow')}
            </button>
          </div>
        </form>
      </section>
    </div>`;

  $('#businessName').focus();
  $('#businessName').select();
}

function closeModal(){
  $('#modalRoot').innerHTML='';
}

function launchBusiness(id,name){
  const p=propById(id);
  if(!p||businessFor(id))return;

  name=name.trim().replace(/\s+/g,' ');

  if(name.length<2||name.length>28){
    $('#modalError').textContent=
      'Use a business name between 2 and 28 characters.';
    return;
  }

  if(!canAfford(p.cost)){
    toast('Not enough cash to open here.',true);
    return;
  }

  const t=TYPE[p.kind];
  game.cash-=p.cost;

  game.businesses.push({
    propertyId:p.id,
    kind:p.kind,
    name,
    level:1,
    staff:1,
    price:t.price,
    marketing:0,
    stock:t.startStock,
    quality:76,
    lastRevenue:0,
    lastProfit:0
  });

  game.selected=id;
  game.view='city';

  addEvent('New business opened',
    `${name} has launched in ${p.district}.`);

  closeModal();
  render();
  toast(`${name} is open for business!`);
}

// Managing employees, stock and businesses

function performManagement(action,id){
  const b=businessFor(id);
  if(!b)return;

  const cfg=TYPE[b.kind];

  if(action==='price-down'){
    b.price=Math.max(
      Math.round(cfg.price*.45),
      b.price-(b.kind==='cafe'?1:5)
    );
  }

  if(action==='price-up'){
    b.price=Math.min(
      cfg.price*3,
      b.price+(b.kind==='cafe'?1:5)
    );
  }

  if(action==='marketing-down'){
    b.marketing=Math.max(0,b.marketing-35);
  }

  if(action==='marketing-up'){
    b.marketing=Math.min(280,b.marketing+35);
  }

  if(action==='hire'){
    if(b.staff>=cfg.maxStaff)return;

    if(!canAfford(200)){
      toast('Hiring requires $200 for onboarding.',true);
      return;
    }

    game.cash-=200;
    b.staff++;

    addEvent('Employee hired',
      `${b.name} expanded to ${b.staff} team members.`);
  }

  if(action==='fire'){
    if(b.staff<=1)return;
    b.staff--;

    addEvent('Team adjusted',
      `${b.name} now has ${b.staff} employees.`);
  }

  if(action==='restock'){
    if(b.kind==='tech')return;

    const total=Math.round(cfg.pack*cfg.unitCost);

    if(!canAfford(total)){
      toast(`You need ${money(total)} to restock.`,true);
      return;
    }

    game.cash-=total;
    b.stock+=cfg.pack;

    toast(`Purchased ${cfg.pack} units for ${b.name}`);
  }

  if(action==='upgrade'){
    if(b.level>=5)return;

    const cost=upgradeCost(b);

    if(!canAfford(cost)){
      toast(`You need ${money(cost)} to upgrade.`,true);
      return;
    }

    game.cash-=cost;
    b.level++;
    b.quality=clamp(b.quality+4,40,100);

    addEvent('Business upgraded',
      `${b.name} reached level ${b.level}.`);

    toast(`${b.name} upgraded to level ${b.level}!`);
  }

  render();
}

// Economic simulation

function simulateDay(){
  const totals={
    revenue:0,profit:0,rent:0,wages:0,
    marketing:0,cogs:0,sold:0,customers:0
  };

  const previousGoalCount=
    GOALS.filter(g=>goalValue(g.metric)>=g.target).length;

  const previousDay=game.day;
  const soldOut=[];

  for(const b of game.businesses){
    const p=propById(b.propertyId);
    const cfg=TYPE[b.kind];

    const priceFactor=clamp(
      Math.pow(cfg.price/b.price,1.52),.32,2.15
    );

    const marketingFactor=
      1+Math.min(.72,b.marketing/350);

    const reputationFactor=
      .68+b.quality/235;

    const levelFactor=
      1+(b.level-1)*.20;

    const randomFactor=
      .85+Math.random()*.3;

    const isWeekend=
      ['Saturday','Sunday'].includes(
        weekdays[(game.day-1)%7]
      );

    const weekendFactor=isWeekend
      ?(b.kind==='tech'?.86:1.18)
      :1;

    const demand=Math.max(0,Math.round(
      cfg.baseDemand*
      p.multiplier*
      priceFactor*
      marketingFactor*
      reputationFactor*
      levelFactor*
      randomFactor*
      weekendFactor
    ));

    const capacity=Math.floor(
      cfg.staffCapacity*b.staff*(1+(b.level-1)*.06)
    );

    const served=Math.min(demand,capacity);

    const sold=Math.min(
      served,
      b.kind==='tech'?Infinity:b.stock
    );

    const cogs=Math.round(sold*cfg.unitCost);
    const revenue=Math.round(sold*b.price);
    const wages=b.staff*cfg.wage;

    const profit=
      revenue-cogs-wages-p.rent-b.marketing;

    // Stock is purchased during restocking.
    // Do not charge cash twice when products are sold.
    game.cash+=revenue-wages-p.rent-b.marketing;

    if(b.kind!=='tech')b.stock-=sold;

    const shortage=served>sold;
    if(shortage)soldOut.push(b.name);

    const pricePenalty=Math.max(
      0,(b.price/cfg.price-1)*11
    );

    const servicePenalty=Math.max(
      0,(demand-served)/Math.max(demand,1)*13
    );

    const idealQuality=clamp(
      89-pricePenalty-servicePenalty-
      (shortage?20:0)+(b.level-1)*2,
      35,99
    );

    b.quality=clamp(
      b.quality*.80+idealQuality*.20,
      20,100
    );

    b.lastRevenue=revenue;
    b.lastProfit=profit;

    totals.revenue+=revenue;
    totals.profit+=profit;
    totals.rent+=p.rent;
    totals.wages+=wages;
    totals.marketing+=b.marketing;
    totals.cogs+=cogs;
    totals.sold+=sold;
    totals.customers+=demand;
  }

  game.totalProfit+=totals.profit;

  game.history.push({
    day:previousDay,
    profit:totals.profit,
    revenue:totals.revenue,
    count:game.businesses.length
  });

  game.history=game.history.slice(-60);
  game.lastDay=totals;
  game.day++;

  if(game.businesses.length){
    addEvent(
      totals.profit>=0
        ?'Profitable trading day'
        :'Operating loss',
      `Day ${previousDay}: ${money(totals.revenue)} in sales · ${signed(totals.profit)} operating profit.`,
      totals.profit<0
    );

    if(soldOut.length){
      addEvent(
        'Stock running low',
        `${soldOut.join(', ')} ran out of products. Restock before your next day.`,
        true
      );
    }
  }

  const newGoalCount=
    GOALS.filter(g=>goalValue(g.metric)>=g.target).length;

  if(newGoalCount>previousGoalCount){
    toast('Milestone reached! Check your goals.');
  }else if(!game.businesses.length){
    toast('A new day begins. Open a business to start earning.');
  }else{
    toast(
      `Day ${previousDay} complete · ${signed(totals.profit)} profit`,
      totals.profit<0
    );
  }

  render();
}

// The visual city

const canvas=$('#cityCanvas');
const ctx=canvas.getContext('2d');

let hoveredProperty=null;
let lastSceneFrame=0;

function rect(x,y,w,h,fill){
  ctx.fillStyle=fill;
  ctx.fillRect(x,y,w,h);
}

function roundedRect(x,y,w,h,r,color){
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  ctx.fill();
}

function polygon(points,color){
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);

  for(let i=1;i<points.length;i++){
    ctx.lineTo(...points[i]);
  }

  ctx.closePath();
  ctx.fillStyle=color;
  ctx.fill();
}

function disk(x,y,r,c){
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=c;
  ctx.fill();
}

function line(x1,y1,x2,y2,color,w=1){
  ctx.strokeStyle=color;
  ctx.lineWidth=w;
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
}

function textLabel(s,x,y,color='#fafff7',size=12,weight=800){
  ctx.fillStyle=color;
  ctx.font=`${weight} ${size}px Manrope, sans-serif`;
  ctx.fillText(s,x,y);
}

function shadow(x,y,w,h){
  ctx.save();
  ctx.globalAlpha=.20;
  roundedRect(x+13,y+16,w,h,15,'#243531');
  ctx.restore();
}

function tree(x,y,s=1){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(s,s);

  ctx.globalAlpha=.2;
  disk(7,9,15,'#253d40');
  ctx.globalAlpha=1;

  rect(-2,2,5,13,'#7b7763');
  disk(-5,-3,15,'#4f8665');
  disk(8,-10,15,'#609b72');
  disk(0,-16,13,'#77ab77');
  disk(-7,-14,3,'#a8cda1');

  ctx.restore();
}

function planter(x,y){
  roundedRect(x-13,y-7,26,14,4,'#c7bbb0');
  disk(x-4,y-6,10,'#5b9271');
  disk(x+6,y-8,9,'#4b795d');
}

function shadeColor(hex,delta){
  const n=parseInt(hex.slice(1),16);
  const r=clamp((n>>16)+delta,0,255);
  const g=clamp(((n>>8)&255)+delta,0,255);
  const b=clamp((n&255)+delta,0,255);
  return `rgb(${r},${g},${b})`;
}

function building(p,time){
  const {x,y,w,h,height:d}=p;

  const owned=businessFor(p.id);
  const selected=game.selected===p.id&&game.view==='city';
  const hovered=hoveredProperty===p.id;

  ctx.save();

  shadow(x,y,w,h);
  roundedRect(x-15,y+h+8,w+31,15,4,'#b1bdb1');

  polygon(
    [[x,y+12],[x+21,y],[x+w+17,y],[x+w-3,y+12]],
    '#e0dcc8'
  );

  // Walls and roof

  polygon(
    [[x+w,y-d],[x+w+21,y-d+12],
     [x+w+21,y+h+9],[x+w,y+h-3]],
    shadeColor(p.shade,-33)
  );

  polygon(
    [[x,y-d],[x+w,y-d],[x+w,y+h-3],[x,y+h-3]],
    p.shade
  );

  polygon(
    [[x-9,y-d+5],[x+13,y-d-12],
     [x+w+14,y-d-12],[x+w,y-d+5]],
    p.roof
  );

  rect(
    x,y+h-39,w,
    h>135?32:29,
    shadeColor(p.shade,-24)
  );

  const windowColor=owned?'#bfead3':'#557b86';
  const cols=Math.max(2,Math.floor((w-28)/38));

  for(let i=0;i<cols;i++){
    const wx=x+15+i*(w-30)/cols;

    roundedRect(wx,y-d+24,22,25,3,'#f1e8d4');
    roundedRect(wx+3,y-d+27,16,19,2,windowColor);
    line(wx+11,y-d+27,wx+11,y-d+46,'#e4e7d7',2);
  }

  if(d>=58){
    for(let i=0;i<cols;i++){
      const wx=x+15+i*(w-30)/cols;
      roundedRect(wx,y-d+58,22,22,3,'#f0e9dc');
      rect(
        wx+3,y-d+61,16,16,
        owned?'#85c9b0':'#648895'
      );
    }
  }

  // Shop entrance and awning

  roundedRect(
    x+17,y+h-39,
    Math.min(42,w*.3),39,3,
    '#425e65'
  );

  rect(
    x+23,y+h-33,
    Math.min(30,w*.3-12),24,
    owned?'#87c5ad':'#96b5b8'
  );

  const awning=owned?'#a8df70':'#e8b572';

  roundedRect(x+7,y+h-50,w-14,13,2,awning);

  for(let i=0;i<Math.floor((w-14)/20);i++){
    rect(x+8+i*20,y+h-47,9,10,'#f0ebe1');
  }

  // Rooftop details

  roundedRect(x+w*.61,y-d-7,26,11,2,'#8c9e9d');
  rect(x+w*.64,y-d-12,15,5,'#bdd0c7');

  if(d<60){
    disk(x+w*.80,y-d-6,11,'#729c81');
    disk(x+w*.75,y-d-10,9,'#8eb28d');
  }

  // Business signage

  roundedRect(
    x+w*.37,y+h-31,w*.57,22,4,
    '#293a41'
  );

  const storeName=owned
    ?owned.name.toUpperCase().slice(0,19)
    :p.short;

  ctx.font='800 10px Manrope, sans-serif';

  const fitting=Math.min(
    10,
    (w*.54)/Math.max(ctx.measureText(storeName).width/10,1)
  );

  textLabel(
    storeName,
    x+w*.40,
    y+h-16,
    '#f1f9e5',
    fitting,
    800
  );

  if(owned){
    roundedRect(x+w-34,y-d-30,32,23,7,'#b9eb73');
    textLabel('✓',x+w-23,y-d-13,'#24412e',16,900);

    const move=(time*.015+(x%20))%40;
    const customerX=x+w*.52+Math.sin(move)*7;

    disk(customerX,y+h+17,4,'#233e4b');
    disk(customerX,y+h+11,4,'#f6c6a8');
  }else{
    roundedRect(x+w-50,y-d-28,51,21,5,'#f9c77a');
    textLabel('LEASE',x+w-42,y-d-13,'#543c22',10,900);
  }

  if(selected||hovered){
    ctx.strokeStyle=selected?'#f4fff2':'#f9ca83';
    ctx.lineWidth=4;
    ctx.strokeRect(x-9,y-d-35,w+35,h+d+48);

    const bubbleY=Math.max(12,y-d-66);

    roundedRect(
      x+w/2-60,bubbleY,120,25,6,
      selected?'#eaffd8':'#fff1d7'
    );

    ctx.textAlign='center';
    textLabel(
      p.label,x+w/2,bubbleY+17,
      '#294135',12,900
    );
    ctx.textAlign='left';
  }

  ctx.restore();
}

function staticBuilding(x,y,w,h,d,roof,wall){
  shadow(x,y,w,h);

  polygon(
    [[x+w,y-d],[x+w+17,y-d+12],
     [x+w+17,y+h+8],[x+w,y+h]],
    shadeColor(wall,-30)
  );

  polygon(
    [[x,y-d],[x+w,y-d],[x+w,y+h],[x,y+h]],
    wall
  );

  polygon(
    [[x-8,y-d+3],[x+6,y-d-11],
     [x+w+14,y-d-11],[x+w,y-d+3]],
    roof
  );

  for(let iy=0;iy<Math.min(3,Math.floor((h+d-10)/32));iy++){
    for(let ix=0;ix<Math.floor((w-20)/31);ix++){
      roundedRect(
        x+12+ix*31,y-d+18+iy*33,
        17,19,2,'#dfe5d5'
      );

      rect(
        x+14+ix*31,y-d+20+iy*33,
        13,15,'#648c91'
      );
    }
  }
}

function drawRoads(){
  rect(0,0,MAP_WIDTH,MAP_HEIGHT,'#a8c3a6');

  // Grass tiles

  for(let gx=0;gx<MAP_WIDTH;gx+=42){
    for(let gy=0;gy<MAP_HEIGHT;gy+=42){
      ctx.fillStyle=((gx+gy)%3===0)
        ?'#a0bd9e':'#aec7a9';

      ctx.fillRect(gx+1,gy+1,40,40);
    }
  }

  // Roads

  roundedRect(0,305,MAP_WIDTH,99,3,'#c3c6b9');
  roundedRect(503,0,118,MAP_HEIGHT,3,'#c3c6b9');

  rect(0,318,MAP_WIDTH,72,'#596b72');
  rect(516,0,92,MAP_HEIGHT,'#596b72');

  // Lane markings

  for(let x=15;x<MAP_WIDTH;x+=75){
    if(x>495&&x<626)continue;
    roundedRect(x,353,39,3,1,'#e6dcb6');
  }

  for(let y=15;y<MAP_HEIGHT;y+=62){
    if(y>293&&y<413)continue;
    roundedRect(561,y,3,33,1,'#e6dcb6');
  }

  // Pedestrian crossings

  for(let i=0;i<7;i++){
    rect(471,324+i*9,28,5,'#dbe1d8');
    rect(623,324+i*9,28,5,'#dbe1d8');
    rect(526+i*11,289,6,22,'#dbe1d8');
    rect(526+i*11,396,6,22,'#dbe1d8');
  }

  // Curbs

  line(0,306,MAP_WIDTH,306,'#e1dfc9',4);
  line(0,403,MAP_WIDTH,403,'#dfdecb',4);
  line(504,0,504,MAP_HEIGHT,'#e1dfc9',4);
  line(620,0,620,MAP_HEIGHT,'#dfdecb',4);

  // Downtown plaza

  roundedRect(665,10,380,258,15,'#bed1bd');

  for(let x=675;x<1040;x+=25){
    for(let y=18;y<265;y+=25){
      rect(x,y,23,23,'#c8d8c4');
    }
  }

  roundedRect(967,92,80,63,8,'#90b6a5');
  disk(1007,125,18,'#c4e1d5');

  // City park

  roundedRect(15,430,380,210,13,'#83ad84');

  for(let i=0;i<4;i++){
    roundedRect(20+i*97,448,76,169,13,'#8eb68d');
  }

  roundedRect(334,480,33,98,8,'#d8cbb0');
  roundedRect(15,614,380,13,2,'#d1ccb2');

  // Street lamps

  for(const [x,y] of [
    [430,281],[650,278],[427,425],
    [651,430],[77,295],[1016,418]
  ]){
    line(x,y,x,y-23,'#55666c',3);
    disk(x,y-24,6,'#dff0c5');
  }
}

function drawCar(x,y,color,vertical=false){
  ctx.save();
  ctx.translate(x,y);

  if(vertical)ctx.rotate(Math.PI/2);

  roundedRect(-23,-10,46,20,6,'#273b46');
  roundedRect(-20,-11,40,18,6,color);
  roundedRect(-9,-9,15,16,3,'#b0d5d1');

  rect(-16,-6,4,5,'#f1e3ad');
  rect(13,-6,4,5,'#f1e3ad');

  ctx.restore();
}

function drawPedestrian(x,y,shirt){
  disk(x+3,y+6,5,'#415e56');
  disk(x,y,4,'#f5c6a5');
  roundedRect(x-3,y+4,7,9,3,shirt);
}

function drawScene(now){
  requestAnimationFrame(drawScene);

  // 20 FPS, only when the city is visible
  if(
    now-lastSceneFrame<50 ||
    game.view!=='city' ||
    document.hidden
  ) return;

  lastSceneFrame=now;

  const seconds=now/1000;

  ctx.clearRect(0,0,MAP_WIDTH,MAP_HEIGHT);
  drawRoads();

  // Surrounding buildings

  staticBuilding(20,55,67,160,29,'#c5c8c1','#879ca2');
  staticBuilding(314,6,128,53,30,'#c5cfc4','#a1aba6');
  staticBuilding(977,196,91,68,53,'#c6c4b3','#9d9c8c');
  staticBuilding(978,466,95,133,64,'#a6bdbb','#708c99');
  staticBuilding(654,507,79,90,34,'#dec7a5','#a18c80');

  // Trees

  for(const [x,y,s] of [
    [38,250,1.2],[80,263,.75],[303,265,.9],
    [420,256,.7],[680,270,.9],[938,263,.9],
    [1037,274,1.1],[64,461,1],[50,530,.85],
    [365,462,.8],[397,574,.9],[451,527,.95],
    [655,451,1],[723,422,.8],[740,599,.9],
    [966,613,.9],[1069,579,.9]
  ]){
    tree(x,y,s);
  }

  planter(455,300);
  planter(696,295);
  planter(680,431);

  // Interactive properties

  for(const p of PROPERTY_LIST){
    building(p,seconds);
  }

  // Parked vehicles

  drawCar(381,430,'#eac28d');
  drawCar(969,432,'#a6ccc0');
  drawCar(1013,296,'#e8aaa2');
  drawCar(482,135,'#d8d8c4',true);

  // Driving vehicles

  drawCar(
    ((seconds*22+180)%(MAP_WIDTH+120))-60,
    339,'#eed7a4'
  );

  drawCar(
    MAP_WIDTH-((seconds*29+680)%(MAP_WIDTH+120))+60,
    375,'#92bacb'
  );

  drawCar(
    540,
    ((seconds*17+40)%(MAP_HEIGHT+110))-55,
    '#d99f8b',true
  );

  drawCar(
    583,
    MAP_HEIGHT-((seconds*22+220)%(MAP_HEIGHT+110))+55,
    '#b9e1a1',true
  );

  // Walking pedestrians

  for(let i=0;i<7;i++){
    const pedX=
      80+i*145+Math.sin(seconds*.45+i*2)*18;

    const pedY=i%2
      ?416+Math.cos(seconds*.6+i)*9
      :286+Math.sin(seconds*.4+i)*6;

    drawPedestrian(
      pedX,pedY,
      i%2?'#d17970':'#537b9d'
    );
  }

  // Atmospheric overlay

  const grad=ctx.createLinearGradient(0,0,0,MAP_HEIGHT);

  grad.addColorStop(0,'#fff6dc1b');
  grad.addColorStop(.6,'#fff6dc00');
  grad.addColorStop(1,'#21332a1f');

  rect(0,0,MAP_WIDTH,MAP_HEIGHT,grad);

  // Hover price bubble

  if(hoveredProperty&&hoveredProperty!==game.selected){
    const p=propById(hoveredProperty);

    if(p){
      ctx.save();

      roundedRect(
        p.x+p.w/2-47,
        p.y-p.height-94,
        94,21,6,'#223f37'
      );

      textLabel(
        money(p.cost),
        p.x+p.w/2-24,
        p.y-p.height-79,
        '#ebffe2',11
      );

      ctx.restore();
    }
  }
}

// Map interaction

function detectProperty(event){
  const box=canvas.getBoundingClientRect();

  const x=
    (event.clientX-box.left)/box.width*MAP_WIDTH;

  const y=
    (event.clientY-box.top)/box.height*MAP_HEIGHT;

  return [...PROPERTY_LIST].reverse().find(p=>
    x>=p.x-10 &&
    x<=p.x+p.w+24 &&
    y>=p.y-p.height-43 &&
    y<=p.y+p.h+16
  )?.id||null;
}

canvas.addEventListener('mousemove',e=>{
  hoveredProperty=detectProperty(e);
  canvas.style.cursor=hoveredProperty?'pointer':'grab';
});

canvas.addEventListener('mouseleave',()=>{
  hoveredProperty=null;
});

canvas.addEventListener('click',e=>{
  const id=detectProperty(e);
  if(id)selectProperty(id);
});

// Global controls

document.addEventListener('click',e=>{
  const viewButton=e.target.closest('[data-view]');

  if(viewButton){
    switchView(viewButton.dataset.view);
    return;
  }

  const action=e.target.closest('[data-action]');
  if(!action)return;

  const type=action.dataset.action;
  const id=action.dataset.id;

  if(type==='close-modal'){
    closeModal();
    return;
  }

  if(type==='open-modal'){
    openBusinessModal(id);
    return;
  }

  if(type==='go-city'){
    switchView('city');
    return;
  }

  if(type==='manage'){
    selectProperty(id);
    return;
  }

  if([
    'price-down','price-up',
    'marketing-down','marketing-up',
    'hire','fire','restock','upgrade'
  ].includes(type)){
    performManagement(type,id);
  }
});

document.addEventListener('submit',e=>{
  if(e.target.id==='launchForm'){
    e.preventDefault();

    launchBusiness(
      e.target.dataset.id,
      $('#businessName').value
    );
  }
});

$('#nextDayButton').addEventListener('click',simulateDay);

$('#sidebarToggle').addEventListener('click',()=>{
  game.collapsed=!game.collapsed;
  render();
});

$('#themeToggle').addEventListener('click',()=>{
  game.theme=game.theme==='dark'?'light':'dark';
  render();
});

$('#restartButton').addEventListener('click',()=>{
  $('#modalRoot').innerHTML=`
    <div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true"
        aria-labelledby="modalTitle">
        <div class="modal-top">
          <div>
            <div class="inspector-kicker">NEW BEGINNINGS</div>
            <h2 id="modalTitle">Start over?</h2>
          </div>
          <button class="icon-button" data-action="close-modal"
            aria-label="Close dialog">${icon('close')}</button>
        </div>
        <p class="dialog-warning">
          This will permanently replace your saved city,
          businesses, and financial progress on this device.
        </p>
        <div class="modal-actions">
          <button class="secondary-button" data-action="close-modal">
            Keep playing
          </button>
          <button class="primary-button" id="confirmRestart">
            Start new game
          </button>
        </div>
      </section>
    </div>`;

  $('#confirmRestart').addEventListener('click',()=>{
    const theme=game.theme;
    game=defaultGame();
    game.theme=theme;

    closeModal();
    render();
    toast('A fresh city awaits!');
  });
});

$('#modalRoot').addEventListener('click',e=>{
  if(e.target.classList.contains('modal-backdrop')){
    closeModal();
  }
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeModal();
});

// Start game

render();

if(ctx){
  requestAnimationFrame(drawScene);
}
