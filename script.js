const API_KEY  = '6939f340c2cd00bfa7bf657a9bf9ccc4'; 
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL  = 'https://api.openweathermap.org/geo/1.0';

const WEATHER_ICONS = {
  '01d':'☀️','01n':'🌙','02d':'⛅','02n':'⛅',
  '03d':'☁️','03n':'☁️','04d':'☁️','04n':'☁️',
  '09d':'🌧','09n':'🌧','10d':'🌦','10n':'🌦',
  '11d':'⛈','11n':'⛈','13d':'❄️','13n':'❄️',
  '50d':'🌫','50n':'🌫',
};

const COMPASS = ['N','NE','E','SE','S','SW','W','NW'];

const state = {
  unit: 'metric',
  theme: 'dark',
  recentSearches: JSON.parse(localStorage.getItem('aether_recent') || '[]'),
  currentWeather: null,
  forecast: null,
  map: null,
  mapMarker: null,
  tempChart: null,
  humidChart: null,
  particles: [],
};

const $        = id => document.getElementById(id);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const tempFmt  = t => state.unit === 'metric' ? `${Math.round(t)}°C` : `${Math.round(t)}°F`;
const windFmt  = s => state.unit === 'metric' ? `${Math.round(s)} m/s` : `${Math.round(s * 2.237)} mph`;
const windDir  = deg => COMPASS[Math.round(deg / 45) % 8];
const icon     = code => WEATHER_ICONS[code] || '⛅';
const fmtTime  = (unix, tz) => new Date((unix + tz) * 1000).toUTCString().slice(17, 22);

const canvas = $('bg-canvas');
const ctx    = canvas.getContext('2d');
let   animFrame;

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function applyGradient(code, temp, isDay) {
  const c = String(code);
  let a, b, g;

  if      (c.startsWith('2'))                  { a='#1a1a2e'; b='#16213e'; g='#0f2b5c'; }
  else if (c.startsWith('3')||c.startsWith('5')){
    if (isDay) { a='#1e3a5f'; b='#2d5986'; g='#1a7a9c'; }
    else       { a='#0d1b2a'; b='#1a2f45'; g='#0f3a55'; }
  }
  else if (c.startsWith('6'))                   { a='#1a2a4a'; b='#2a3f6a'; g='#3d5a8a'; }
  else if (c === '800') {
    if (!isDay)      { a='#0a0a1a'; b='#0f1535'; g='#1a1f4a'; }
    else if (temp>35){ a='#8b1a00'; b='#cc3300'; g='#ff6600'; }
    else if (temp>25){ a='#c85c00'; b='#e87500'; g='#2196f3'; }
    else if (temp>10){ a='#1a3a6a'; b='#2255aa'; g='#1e88e5'; }
    else             { a='#0d2b4a'; b='#1a4066'; g='#1565c0'; }
  }
  else {
    if (isDay) { a='#2c3e60'; b='#3d5080'; g='#4a6090'; }
    else       { a='#1a2035'; b='#252d45'; g='#1f3055'; }
  }

  document.documentElement.style.setProperty('--grad-a', a);
  document.documentElement.style.setProperty('--grad-b', b);
  document.documentElement.style.setProperty('--grad-c', g);
  $('bgGrad').style.background = `linear-gradient(135deg,${a} 0%,${b} 50%,${g} 100%)`;
  spawnParticles(c, isDay);
}

function spawnParticles(code, isDay) {
  state.particles = [];
  cancelAnimationFrame(animFrame);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (code.startsWith('5') || code.startsWith('3')) {
    for (let i = 0; i < 80; i++) state.particles.push({
      x: Math.random()*canvas.width, y: Math.random()*canvas.height,
      len: Math.random()*15+8, speed: Math.random()*6+8,
      opacity: Math.random()*0.4+0.1, type:'rain'
    });
    animateRain();
  } else if (code.startsWith('6')) {
    for (let i = 0; i < 60; i++) state.particles.push({
      x: Math.random()*canvas.width, y: Math.random()*canvas.height,
      r: Math.random()*3+1, speed: Math.random()*1.5+0.5,
      drift: Math.random()*0.5-0.25, opacity: Math.random()*0.5+0.2, type:'snow'
    });
    animateSnow();
  } else if (code === '800' && isDay) {
    for (let i = 0; i < 20; i++) state.particles.push({
      x: Math.random()*canvas.width, y: Math.random()*canvas.height*0.5,
      r: Math.random()*80+40, opacity: Math.random()*0.03+0.01,
      drift: Math.random()*0.2-0.1, type:'shimmer'
    });
    animateShimmer();
  }
}

function animateRain() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  state.particles.forEach(p => {
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-1,p.y+p.len);
    ctx.strokeStyle=`rgba(174,214,241,${p.opacity})`; ctx.lineWidth=1; ctx.stroke();
    p.y+=p.speed;
    if(p.y>canvas.height){p.y=-20;p.x=Math.random()*canvas.width;}
  });
  animFrame=requestAnimationFrame(animateRain);
}

function animateSnow() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  state.particles.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${p.opacity})`; ctx.fill();
    p.y+=p.speed; p.x+=p.drift;
    if(p.y>canvas.height){p.y=-10;p.x=Math.random()*canvas.width;}
  });
  animFrame=requestAnimationFrame(animateSnow);
}

function animateShimmer() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  state.particles.forEach(p => {
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
    g.addColorStop(0,`rgba(255,220,100,${p.opacity})`); g.addColorStop(1,'transparent');
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    p.x+=p.drift;
    if(p.x>canvas.width+p.r) p.x=-p.r;
  });
  animFrame=requestAnimationFrame(animateShimmer);
}

function getSmartTip(w) {
  const code=String(w.weather[0].id), temp=w.main.temp,
        hum=w.main.humidity,         wind=w.wind.speed;
  if(code.startsWith('2')) return {icon:'⚡',text:'<em>Thunderstorm alert!</em> Stay indoors and avoid open areas.'};
  if(code.startsWith('3')||code.startsWith('5')) return {icon:'☂️',text:'Grab your <em>umbrella</em> — rain is expected today.'};
  if(code.startsWith('6')) return {icon:'🧥',text:'<em>Snowfall ahead!</em> Layer up and drive carefully.'};
  if(code==='741') return {icon:'🌫',text:'Dense <em>fog</em> warning — reduce speed while driving.'};
  if(temp>38) return {icon:'🥵',text:'<em>Extreme heat!</em> Stay indoors, hydrate, avoid midday sun.'};
  if(temp>30) return {icon:'💧',text:'Hot day — <em>drink plenty of water</em> and use sunscreen.'};
  if(temp<5)  return {icon:'🥶',text:'<em>Freezing!</em> Wear thermal layers and protect your extremities.'};
  if(temp<15) return {icon:'🧣',text:'Chilly — a <em>jacket or sweater</em> is recommended.'};
  if(wind>12) return {icon:'💨',text:'<em>Strong winds</em> — secure loose items and be careful outdoors.'};
  if(hum>80)  return {icon:'😰',text:'Very <em>humid</em> today — light breathable clothing is ideal.'};
  return {icon:'✅',text:'<em>Great weather</em> today! Perfect time to head outside.'};
}

async function fetchWeather(city=null, lat=null, lon=null) {
  showLoading(true); hideError();
  try {
    const q = city ? `q=${encodeURIComponent(city)}` : `lat=${lat}&lon=${lon}`;
    const [wRes, fRes] = await Promise.all([
      fetch(`${BASE_URL}/weather?${q}&appid=${API_KEY}&units=${state.unit}`),
      fetch(`${BASE_URL}/forecast?${q}&appid=${API_KEY}&units=${state.unit}`),
    ]);
    if (!wRes.ok) throw new Error(wRes.status===404 ? 'City not found' : 'API error — check your key');
    const [w, f] = await Promise.all([wRes.json(), fRes.json()]);
    state.currentWeather = w; state.forecast = f;
    renderWeather(w, f);
    saveRecent(`${w.name}, ${w.sys.country}`);
  } catch(e) {
    showError(e.message || 'Failed to fetch weather data');
  } finally {
    showLoading(false);
  }
}

async function fetchSuggestions(query) {
  if (!query || query.length < 2) { closeSuggestions(); return; }
  try {
    const res  = await fetch(`${GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`);
    const data = await res.json();
    renderSuggestions(data);
  } catch { closeSuggestions(); }
}

function renderWeather(w, f) {
  $('emptyState').style.display = 'none';
  $('mainContent').style.display = 'block';

  const isDay   = w.dt > w.sys.sunrise && w.dt < w.sys.sunset;
  const code    = w.weather[0].id;

  $('heroCountry').textContent  = `${w.name}, ${w.sys.country}`;
  $('heroCity').textContent     = w.name;
  $('heroDate').textContent     = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  $('heroTemp').textContent     = Math.round(w.main.temp);
  $('heroUnit').textContent     = state.unit==='metric' ? '°C' : '°F';
  $('heroCondition').textContent= w.weather[0].description.replace(/^\w/,c=>c.toUpperCase());
  $('heroIcon').textContent     = icon(w.weather[0].icon);
  $('statHumidity').textContent = `${w.main.humidity}%`;
  $('statWind').textContent     = windFmt(w.wind.speed);
  $('statVis').textContent      = `${(w.visibility/1000).toFixed(1)} km`;

  $('exFeels').textContent = tempFmt(w.main.feels_like);
  const diff = w.main.feels_like - w.main.temp;
  $('exFeelsNote').textContent = diff>2 ? 'Warmer than actual' : diff<-2 ? 'Colder than actual' : 'Close to actual';
  $('exPressure').textContent  = w.main.pressure;
  $('exSunrise').textContent   = fmtTime(w.sys.sunrise, w.timezone);
  $('exSunset').textContent    = fmtTime(w.sys.sunset,  w.timezone);

  $('windArrow').style.transform = `translateX(-50%) rotate(${w.wind.deg||0}deg)`;
  $('windSpeed2').textContent    = windFmt(w.wind.speed);
  $('windDirLabel').textContent  = `${windDir(w.wind.deg||0)} direction`;

  const tip = getSmartTip(w);
  $('tipIcon').textContent = tip.icon;
  $('tipText').innerHTML   = tip.text;

  applyGradient(code, w.main.temp, isDay);
  renderForecast(f);
  renderHourly(f);
  renderCharts(f);
  renderMap(w.coord.lat, w.coord.lon, w.name);
}

function renderForecast(f) {
  const daily = {};
  f.list.forEach(item => {
    const d = item.dt_txt.split(' ')[0];
    if (!daily[d]) daily[d] = [];
    daily[d].push(item);
  });
  $('forecastScroll').innerHTML = Object.entries(daily).slice(0,5).map(([date,items],i) => {
    const high = Math.max(...items.map(x=>x.main.temp_max));
    const low  = Math.min(...items.map(x=>x.main.temp_min));
    const ic   = icon(items[Math.floor(items.length/2)].weather[0].icon);
    const day  = i===0 ? 'Today' : new Date(date).toLocaleDateString('en-US',{weekday:'short'});
    return `<div class="forecast-card ${i===0?'active':''}" onclick="activateCard(this,'.forecast-card')">
      <div class="fc-day">${day}</div>
      <span class="fc-icon">${ic}</span>
      <div class="fc-high">${Math.round(high)}°</div>
      <div class="fc-low">${Math.round(low)}°</div>
    </div>`;
  }).join('');
}

function renderHourly(f) {
  $('hourlyScroll').innerHTML = f.list.slice(0,8).map((item,i) => {
    const time = i===0 ? 'Now' : item.dt_txt.split(' ')[1].slice(0,5);
    return `<div class="hourly-chip ${i===0?'active':''}" onclick="activateCard(this,'.hourly-chip')">
      <div class="hc-time">${time}</div>
      <span class="hc-icon">${icon(item.weather[0].icon)}</span>
      <div class="hc-temp">${Math.round(item.main.temp)}°</div>
    </div>`;
  }).join('');
}

function renderSuggestions(data) {
  const el = $('suggestions');
  if (!data.length) { closeSuggestions(); return; }
  el.innerHTML = data.map(c => {
    const label = [c.name,c.state,c.country].filter(Boolean).join(', ');
    return `<div class="suggestion-item" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${label}">📍 ${label}</div>`;
  }).join('');
  el.classList.add('open');
  el.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      $('searchInput').value = item.dataset.name;
      closeSuggestions();
      fetchWeather(null, parseFloat(item.dataset.lat), parseFloat(item.dataset.lon));
    });
  });
}

function closeSuggestions() { $('suggestions').classList.remove('open'); $('suggestions').innerHTML=''; }

// ── CHARTS ─────────────────────────────────────────────
function renderCharts(f) {
  const daily = {};
  f.list.forEach(item => {
    const d = item.dt_txt.split(' ')[0];
    if (!daily[d]) daily[d] = [];
    daily[d].push(item);
  });
  const days   = Object.entries(daily).slice(0,5);
  const labels = days.map(([d],i) => i===0?'Today':new Date(d).toLocaleDateString('en-US',{weekday:'short'}));
  const temps  = days.map(([,items]) => Math.round(items.reduce((s,x)=>s+x.main.temp,0)/items.length));
  const humids = days.map(([,items]) => Math.round(items.reduce((s,x)=>s+x.main.humidity,0)/items.length));

  const base = {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{
      x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'rgba(255,255,255,0.5)',font:{family:'DM Sans'}}},
      y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'rgba(255,255,255,0.5)',font:{family:'DM Sans'}}},
    },
  };

  if (state.tempChart)  state.tempChart.destroy();
  if (state.humidChart) state.humidChart.destroy();

  state.tempChart = new Chart($('tempChart'),{
    type:'line',
    data:{labels,datasets:[{
      data:temps,
      borderColor:'rgba(125,249,194,0.9)',
      backgroundColor:'rgba(125,249,194,0.08)',
      borderWidth:2.5, pointBackgroundColor:'rgba(125,249,194,1)',
      pointRadius:5, tension:0.4, fill:true
    }]},
    options:{...base,plugins:{...base.plugins,tooltip:{callbacks:{label:c=>`${c.raw}°`}}}},
  });

  state.humidChart = new Chart($('humidChart'),{
    type:'bar',
    data:{labels,datasets:[{
      data:humids,
      backgroundColor:'rgba(126,200,227,0.3)',
      borderColor:'rgba(126,200,227,0.8)',
      borderWidth:2, borderRadius:8,
    }]},
    options:{...base,plugins:{...base.plugins,tooltip:{callbacks:{label:c=>`${c.raw}%`}}}},
  });
}

// ── MAP ────────────────────────────────────────────────
function renderMap(lat, lon, name) {
  if (!state.map) {
    state.map = L.map('map',{zoomControl:false}).setView([lat,lon],10);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
      attribution:'© CartoDB', subdomains:'abcd', maxZoom:19
    }).addTo(state.map);
    L.control.zoom({position:'bottomright'}).addTo(state.map);
  } else {
    state.map.setView([lat,lon],10);
  }
  if (state.mapMarker) state.mapMarker.remove();
  state.mapMarker = L.circleMarker([lat,lon],{
    radius:10, color:'#7DF9C2', weight:3, fillColor:'#7DF9C2', fillOpacity:0.4
  }).addTo(state.map).bindPopup(`<b>${name}</b>`).openPopup();
}

function saveRecent(city) {
  let list = state.recentSearches.filter(c=>c!==city);
  list.unshift(city);
  list = list.slice(0,5);
  state.recentSearches = list;
  localStorage.setItem('aether_recent', JSON.stringify(list));
  renderRecent();
}

function renderRecent() {
  const list = state.recentSearches;
  if (!list.length) { $('recentWrap').style.display='none'; return; }
  $('recentWrap').style.display = 'block';
  $('recentChips').innerHTML = list.map(c =>
    `<div class="recent-chip" onclick="quickSearch('${c}')">
      ${c}<span class="x" onclick="event.stopPropagation();removeRecent('${c}')">✕</span>
    </div>`
  ).join('');
}

window.quickSearch  = city => { $('searchInput').value=city; fetchWeather(city); };
window.removeRecent = city => {
  state.recentSearches = state.recentSearches.filter(c=>c!==city);
  localStorage.setItem('aether_recent',JSON.stringify(state.recentSearches));
  renderRecent();
};
window.activateCard = (el, sel) => {
  el.closest('.forecast-scroll,.hourly-scroll').querySelectorAll(sel).forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
};
function showLoading(v) { $('loadingOverlay').classList.toggle('show',v); if(v) $('mainContent').style.display='none'; }
function showError(msg) { $('errorBox').classList.add('show'); $('errorMsg').textContent=msg; }
function hideError()    { $('errorBox').classList.remove('show'); }
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.onresult = e => {
    const city = e.results[0][0].transcript;
    $('searchInput').value = city;
    $('voiceStatus').classList.remove('show');
    $('voiceBtn').classList.remove('active');
    fetchWeather(city);
  };
  recognition.onend  = () => { $('voiceStatus').classList.remove('show'); $('voiceBtn').classList.remove('active'); };
  recognition.onerror= () => { $('voiceStatus').textContent='❌ Could not hear you. Try again.'; setTimeout(()=>$('voiceStatus').classList.remove('show'),2000); };
}
const debouncedSearch = debounce(fetchSuggestions, 350);

$('searchInput').addEventListener('input', e => { hideError(); debouncedSearch(e.target.value); });
$('searchInput').addEventListener('keydown', e => {
  if (e.key==='Enter') { closeSuggestions(); const v=$('searchInput').value.trim(); if(v) fetchWeather(v); }
});
document.addEventListener('click', e => { if(!e.target.closest('.search-wrap')) closeSuggestions(); });

$('voiceBtn').addEventListener('click', () => {
  if (!recognition) { alert('Voice search not supported in your browser.'); return; }
  recognition.start();
  $('voiceStatus').textContent = '🎙 Listening… speak a city name';
  $('voiceStatus').classList.add('show');
  $('voiceBtn').classList.add('active');
});

$('locBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { showError('Geolocation not supported.'); return; }
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeather(null, pos.coords.latitude, pos.coords.longitude),
    ()  => showError('Location permission denied. Enable it in browser settings.')
  );
});

$('btnC').addEventListener('click', () => {
  if (state.unit==='metric') return;
  state.unit='metric';
  $('btnC').classList.add('active'); $('btnF').classList.remove('active');
  if (state.currentWeather) fetchWeather(null, state.currentWeather.coord.lat, state.currentWeather.coord.lon);
});

$('btnF').addEventListener('click', () => {
  if (state.unit==='imperial') return;
  state.unit='imperial';
  $('btnF').classList.add('active'); $('btnC').classList.remove('active');
  if (state.currentWeather) fetchWeather(null, state.currentWeather.coord.lat, state.currentWeather.coord.lon);
});

$('themeBtn').addEventListener('click', () => {
  state.theme = state.theme==='dark' ? 'light' : 'dark';
  document.body.classList.toggle('light', state.theme==='light');
  $('themeBtn').textContent = state.theme==='dark' ? '🌙' : '☀️';
  localStorage.setItem('aether_theme', state.theme);
});
(function init() {
  // Restore saved theme
  if (localStorage.getItem('aether_theme')==='light') {
    state.theme='light';
    document.body.classList.add('light');
    $('themeBtn').textContent='☀️';
  }
  renderRecent();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(null, pos.coords.latitude, pos.coords.longitude),
      ()  => {} // silently fail → show empty state
    );
  }
})();