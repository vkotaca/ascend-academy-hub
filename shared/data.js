/*  Ascend Academy — Data Explorer
    API integrations: USAspending, BLS, FRED, Census, World Bank
    Pure vanilla JS — no chart libraries.
*/

var FRED_KEY = '301ec32385dd5c5daee44be21a3bad12';

function initDataDashboard() {
  fetchBudget();
  fetchBLS();
  fetchFRED();
  fetchCensus();
  fetchWorldBank();
}

// ─── HELPERS ───

function showLoading(id) {
  document.getElementById(id).innerHTML = '<div class="data-loading">Loading...</div>';
}

function showError(id, msg) {
  document.getElementById(id).innerHTML = '<div class="data-error">' + (msg || 'Data unavailable — try again later.') + '</div>';
}

function formatNum(n) {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return n.toLocaleString();
  return String(n);
}

function formatPlain(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return n.toLocaleString();
  if (typeof n === 'number') return n.toFixed(1);
  return String(n);
}

// ─── BAR CHART RENDERER ───

function renderBars(containerId, data, maxVal) {
  var html = data.map(function (d) {
    var pct = Math.max((d.value / maxVal) * 100, 1);
    return '<div class="bar-row">' +
      '<div class="bar-label" title="' + d.label + '">' + d.label + '</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="bar-value">' + d.display + '</div>' +
    '</div>';
  }).join('');
  document.getElementById(containerId).innerHTML = html;
}

// ─── SVG LINE CHART RENDERER ───

function renderLineChart(containerId, points, opts) {
  opts = opts || {};
  var w = 100, h = 50;
  var pad = { top: 4, right: 2, bottom: 10, left: 2 };
  var cw = w - pad.left - pad.right;
  var ch = h - pad.top - pad.bottom;

  var vals = points.map(function (p) { return p.value; });
  var minV = opts.minZero ? 0 : Math.min.apply(null, vals) * 0.95;
  var maxV = Math.max.apply(null, vals) * 1.05;
  if (maxV === minV) maxV = minV + 1;

  var coords = points.map(function (p, i) {
    var x = pad.left + (i / (points.length - 1)) * cw;
    var y = pad.top + ch - ((p.value - minV) / (maxV - minV)) * ch;
    return { x: x, y: y, label: p.label, value: p.value };
  });

  var pathD = coords.map(function (c, i) {
    return (i === 0 ? 'M' : 'L') + c.x.toFixed(2) + ',' + c.y.toFixed(2);
  }).join(' ');

  var areaD = pathD + ' L' + coords[coords.length - 1].x.toFixed(2) + ',' + (pad.top + ch) +
    ' L' + coords[0].x.toFixed(2) + ',' + (pad.top + ch) + ' Z';

  // X-axis labels (show ~5)
  var step = Math.max(1, Math.floor(points.length / 5));
  var labels = '';
  for (var i = 0; i < points.length; i += step) {
    labels += '<text class="chart-label" x="' + coords[i].x.toFixed(2) + '" y="' + (h - 1) + '" text-anchor="middle">' + points[i].label + '</text>';
  }

  // Y-axis labels
  var yLabels = '';
  for (var j = 0; j <= 3; j++) {
    var yVal = minV + (j / 3) * (maxV - minV);
    var yPos = pad.top + ch - (j / 3) * ch;
    yLabels += '<line class="chart-grid-line" x1="' + pad.left + '" y1="' + yPos.toFixed(2) + '" x2="' + (w - pad.right) + '" y2="' + yPos.toFixed(2) + '"/>';
  }

  // Hover dots (show last point)
  var last = coords[coords.length - 1];
  var dots = '<circle class="chart-dot" cx="' + last.x.toFixed(2) + '" cy="' + last.y.toFixed(2) + '" r="0.8"/>';

  var svg = '<svg class="line-chart-svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    yLabels +
    '<path class="chart-area" d="' + areaD + '"/>' +
    '<path class="chart-line" d="' + pathD + '"/>' +
    dots + labels +
    '</svg>';

  var latestVal = points[points.length - 1];
  var summary = '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;">' +
    '<span style="font-size:11px;color:#999;">Latest: ' + latestVal.label + '</span>' +
    '<span style="font-family:Playfair Display,serif;font-size:20px;font-weight:700;color:#111;">' + (opts.format ? opts.format(latestVal.value) : formatPlain(latestVal.value)) + '</span>' +
    '</div>';

  document.getElementById(containerId).innerHTML = svg + summary;
}

// ─── COMPARISON RENDERER ───

function renderComparison(containerId, name1, name2, stats) {
  var html = '<div class="compare-grid">' +
    '<div class="compare-col"><div class="compare-name">' + name1 + '</div>' +
    stats.map(function (s) {
      return '<div class="compare-stat"><div class="compare-stat-label">' + s.label + '</div><div class="compare-stat-value">' + s.val1 + '</div></div>';
    }).join('') +
    '</div>' +
    '<div class="compare-col"><div class="compare-name">' + name2 + '</div>' +
    stats.map(function (s) {
      return '<div class="compare-stat"><div class="compare-stat-label">' + s.label + '</div><div class="compare-stat-value">' + s.val2 + '</div></div>';
    }).join('') +
    '</div></div>';
  document.getElementById(containerId).innerHTML = html;
}

// ═══════════════════════════════════════
// 1. FEDERAL BUDGET (USAspending.gov)
// ═══════════════════════════════════════

function fetchBudget() {
  var year = document.getElementById('budget-year').value;
  showLoading('budget-chart');

  fetch('https://api.usaspending.gov/api/v2/spending/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'agency',
      filters: { fy: year }
    })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.results || !data.results.length) { showError('budget-chart'); return; }
      var items = data.results
        .sort(function (a, b) { return b.obligated_amount - a.obligated_amount; })
        .slice(0, 10);
      var maxVal = items[0].obligated_amount;
      var barData = items.map(function (item) {
        return {
          label: item.name,
          value: item.obligated_amount,
          display: formatNum(item.obligated_amount)
        };
      });
      renderBars('budget-chart', barData, maxVal);
    })
    .catch(function () { showError('budget-chart'); });
}

// ═══════════════════════════════════════
// 2. BLS — JOBS & WAGES
// ═══════════════════════════════════════

function fetchBLS() {
  var seriesId = document.getElementById('bls-series').value;
  showLoading('bls-chart');

  var endYear = new Date().getFullYear();
  var startYear = endYear - 10;

  fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seriesid: [seriesId],
      startyear: String(startYear),
      endyear: String(endYear)
    })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results || !data.Results.series[0]) {
        showError('bls-chart'); return;
      }
      var series = data.Results.series[0].data;
      // BLS returns newest first, reverse for chronological
      var points = series.reverse().map(function (d) {
        return {
          label: d.year + (d.period !== 'M13' ? '-' + d.period.replace('M', '') : ''),
          value: parseFloat(d.value)
        };
      });
      // Show only annual averages (M13) or Jan values to reduce noise
      var annual = points.filter(function (p, i) {
        return p.label.indexOf('-1') > -1 || p.label.indexOf('-M13') > -1 || i === points.length - 1;
      });
      if (annual.length < 3) annual = points; // fallback if filtering removes too much
      // Trim labels to just year
      annual.forEach(function (p) { p.label = p.label.split('-')[0]; });
      renderLineChart('bls-chart', annual, {
        format: function (v) {
          if (seriesId === 'CES0000000001') return formatPlain(v * 1000);
          return v.toFixed(1) + (seriesId === 'LNS14000000' ? '%' : '');
        }
      });
    })
    .catch(function () { showError('bls-chart'); });
}

// ═══════════════════════════════════════
// 3. FRED — ECONOMIC TRENDS
// ═══════════════════════════════════════

function fetchFRED() {
  var seriesId = document.getElementById('fred-series').value;
  var range = parseInt(document.getElementById('fred-range').value);
  showLoading('fred-chart');

  var endDate = new Date().toISOString().split('T')[0];
  var startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - range);
  startDate = startDate.toISOString().split('T')[0];

  fetch('https://api.stlouisfed.org/fred/series/observations?series_id=' + seriesId +
    '&api_key=' + FRED_KEY +
    '&file_type=json&observation_start=' + startDate + '&observation_end=' + endDate +
    '&frequency=a')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.observations || !data.observations.length) { showError('fred-chart'); return; }
      var points = data.observations
        .filter(function (o) { return o.value !== '.'; })
        .map(function (o) {
          return {
            label: o.date.substring(0, 4),
            value: parseFloat(o.value)
          };
        });
      var isRate = seriesId === 'FEDFUNDS';
      var isDollar = seriesId === 'GDP' || seriesId === 'GFDEBTN';
      renderLineChart('fred-chart', points, {
        format: function (v) {
          if (isRate) return v.toFixed(2) + '%';
          if (isDollar) return formatNum(v * (seriesId === 'GDP' ? 1e9 : 1e6));
          return formatPlain(v);
        }
      });
    })
    .catch(function () { showError('fred-chart'); });
}

// ═══════════════════════════════════════
// 4. CENSUS — AMERICA BY THE NUMBERS
// ═══════════════════════════════════════

var CENSUS_STATES = {
  '06': 'California', '48': 'Texas', '36': 'New York', '12': 'Florida',
  '17': 'Illinois', '42': 'Pennsylvania', '39': 'Ohio', '13': 'Georgia',
  '37': 'North Carolina', '26': 'Michigan'
};

function fetchCensus() {
  var s1 = document.getElementById('census-state1').value;
  var s2 = document.getElementById('census-state2').value;
  showLoading('census-chart');

  // ACS 5-Year estimates — population, median income, poverty count, bachelor's degree
  var vars = 'B01003_001E,B19013_001E,B17001_002E,B15003_022E';
  var url = 'https://api.census.gov/data/2022/acs/acs5?get=' + vars + '&for=state:' + s1 + ',' + s2;

  fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || data.length < 2) { showError('census-chart'); return; }
      // data[0] is headers, data[1+] are rows
      var row1 = null, row2 = null;
      for (var i = 1; i < data.length; i++) {
        if (data[i][4] === s1) row1 = data[i];
        if (data[i][4] === s2) row2 = data[i];
      }
      if (!row1 || !row2) { showError('census-chart'); return; }

      var stats = [
        { label: 'Population', val1: parseInt(row1[0]).toLocaleString(), val2: parseInt(row2[0]).toLocaleString() },
        { label: 'Median Household Income', val1: '$' + parseInt(row1[1]).toLocaleString(), val2: '$' + parseInt(row2[1]).toLocaleString() },
        { label: 'People in Poverty', val1: parseInt(row1[2]).toLocaleString(), val2: parseInt(row2[2]).toLocaleString() },
        { label: "Bachelor's Degrees", val1: parseInt(row1[3]).toLocaleString(), val2: parseInt(row2[3]).toLocaleString() }
      ];
      renderComparison('census-chart', CENSUS_STATES[s1], CENSUS_STATES[s2], stats);
    })
    .catch(function () { showError('census-chart'); });
}

// ═══════════════════════════════════════
// 5. WORLD BANK — GLOBAL COMPARISON
// ═══════════════════════════════════════

var WB_INDICATORS = [
  { id: 'NY.GDP.PCAP.CD', label: 'GDP per Capita', format: function (v) { return '$' + Math.round(v).toLocaleString(); } },
  { id: 'SP.DYN.LE00.IN', label: 'Life Expectancy', format: function (v) { return v.toFixed(1) + ' years'; } },
  { id: 'EN.ATM.CO2E.PC', label: 'CO2 Emissions (tons/capita)', format: function (v) { return v.toFixed(1); } },
  { id: 'SE.XPD.TOTL.GD.ZS', label: 'Education Spending (% GDP)', format: function (v) { return v.toFixed(1) + '%'; } }
];

function fetchWorldBank() {
  var c1 = document.getElementById('wb-country1').value;
  var c2 = document.getElementById('wb-country2').value;
  showLoading('wb-chart');

  var promises = WB_INDICATORS.map(function (ind) {
    return fetch('https://api.worldbank.org/v2/country/' + c1 + ';' + c2 + '/indicator/' + ind.id + '?format=json&date=2018:2023&per_page=50')
      .then(function (r) { return r.json(); });
  });

  Promise.all(promises)
    .then(function (results) {
      var stats = WB_INDICATORS.map(function (ind, idx) {
        var data = results[idx][1] || [];
        var v1 = null, v2 = null;
        // Get most recent non-null value for each country
        for (var i = 0; i < data.length; i++) {
          if (data[i].value !== null && data[i].country.id === c1 && v1 === null) v1 = data[i].value;
          if (data[i].value !== null && data[i].country.id === c2 && v2 === null) v2 = data[i].value;
        }
        return {
          label: ind.label,
          val1: v1 !== null ? ind.format(v1) : 'N/A',
          val2: v2 !== null ? ind.format(v2) : 'N/A'
        };
      });

      // Get country names from first result
      var allData = results[0][1] || [];
      var name1 = c1, name2 = c2;
      for (var i = 0; i < allData.length; i++) {
        if (allData[i].country.id === c1) name1 = allData[i].country.value;
        if (allData[i].country.id === c2) name2 = allData[i].country.value;
      }

      renderComparison('wb-chart', name1, name2, stats);
    })
    .catch(function () { showError('wb-chart'); });
}
