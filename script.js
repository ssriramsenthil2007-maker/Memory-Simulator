/* =========================================================
   Memory Management Simulator - simulator.html
   Parts: 1) Tabs  2) Paging  3) Segmentation  4) Page replacement
   ========================================================= */

/* ---------- 1) Tabs ---------- */
function showTab(name) {
  document.querySelectorAll(".tab").forEach(function (t) {
    t.classList.toggle("active", t.id === "tab-" + name);
  });
  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.tab === name);
  });
}

document.querySelectorAll(".tabs button").forEach(function (b) {
  b.addEventListener("click", function () { showTab(b.dataset.tab); });
});

// open the tab chosen on the front page (simulator.html?tab=seg)
const wanted = new URLSearchParams(location.search).get("tab");
if (wanted) showTab(wanted);


/* ---------- 2) Paging ---------- */
// index = page number, value = frame number (null = not in memory)
const pageTable = [5, 2, null, 0, 3, 1, null, 4];

function drawPageTable() {
  let html = "<tr><th>Page number</th><th>Frame number</th><th>Mapping status</th></tr>";
  for (let i = 0; i < pageTable.length; i++) {
    const frame = pageTable[i];
    const mapped = frame !== null;
    html += "<tr data-page=\"" + i + "\"><td>" + i + "</td><td>" + (mapped ? frame : "—") +
            "</td><td>" + (mapped ? "Page " + i + " → Frame " + frame : "Not in memory") + "</td></tr>";
  }
  document.getElementById("pageTable").innerHTML = html;
}

function renderPagingFlow(address, pageSize, page, offset, frame, physical, status) {
  document.getElementById("flowLogical").textContent = address;
  document.getElementById("flowSplit").textContent = "Page size: " + pageSize;
  document.getElementById("flowPage").textContent = page === null ? "—" : page;
  document.getElementById("flowOffset").textContent = offset === null ? "—" : offset;
  document.getElementById("flowMapping").textContent = status === "mapped"
    ? "Page " + page + " → Frame " + frame
    : status === "fault" ? "Page " + page + " → no frame (page fault)" : "No page-table entry";
  document.getElementById("flowFrame").textContent = status === "mapped" ? frame : "—";
  document.getElementById("flowPhysicalOffset").textContent = offset === null ? "—" : offset;
  document.getElementById("flowPhysical").textContent = status === "mapped" ? physical : "Not available";
  document.getElementById("flowFormula").textContent = status === "mapped"
    ? frame + " × " + pageSize + " + " + offset + " = " + physical
    : status === "fault" ? "A frame mapping is needed before a physical address can be formed."
      : "The logical address is outside this page table.";
  document.getElementById("flowLookupStage").classList.toggle("is-unavailable", status !== "mapped");
  document.getElementById("flowPhysicalStage").classList.toggle("is-unavailable", status !== "mapped");
  document.querySelectorAll("#pageTable tr[data-page]").forEach(function (row) {
    row.classList.toggle("current-page", Number(row.dataset.page) === page);
  });
}

function translatePaging() {
  const pageSize = Number(document.getElementById("pageSize").value);
  const address = Number(document.getElementById("address").value);
  const result = document.getElementById("result");

  if (!(pageSize > 0) || address < 0 || isNaN(address)) {
    renderPagingFlow(document.getElementById("address").value || "—",
      document.getElementById("pageSize").value || "—", null, null, null, null, "invalid");
    result.textContent = "Enter a page size above 0 and an address of 0 or more.";
    return;
  }

  const page = Math.floor(address / pageSize);
  const offset = address % pageSize;

  if (page >= pageTable.length) {
    renderPagingFlow(address, pageSize, page, offset, null, null, "out-of-range");
    result.textContent =
      "Invalid address: page " + page + " does not exist in this page table.\n" +
      "Address split: floor(" + address + " / " + pageSize + ") = page " + page +
      ", offset " + offset + ".";
    return;
  }

  const frame = pageTable[page];
  if (frame === null) {
    renderPagingFlow(address, pageSize, page, offset, null, null, "fault");
    result.textContent =
      "1. Split the logical address: floor(" + address + " / " + pageSize +
      ") = page " + page + ", remainder = offset " + offset + ".\n" +
      "2. Look up page " + page + " in the page table: it has no frame mapping (not in memory).\n" +
      "3. Result: page fault. The operating system must load the page into a frame, update the page-table mapping, and retry the address. No physical address is available yet.";
    return;
  }

  const physical = frame * pageSize + offset;
  renderPagingFlow(address, pageSize, page, offset, frame, physical, "mapped");
  result.textContent =
    "1. Split the logical address: floor(" + address + " / " + pageSize +
    ") = page " + page + ", remainder = offset " + offset + ".\n" +
    "2. Page-table lookup: page " + page + " \u2192 frame " + frame + ".\n" +
    "3. Physical address = frame \u00d7 page size + offset = " + frame + " \u00d7 " +
    pageSize + " + " + offset + " = " + physical + ".";
}

document.getElementById("translateBtn").addEventListener("click", translatePaging);

drawPageTable();
translatePaging();


/* ---------- 3) Segmentation ---------- */
const segments = [
  { base: 1400, limit: 1000 },
  { base: 6300, limit: 400 },
  { base: 4300, limit: 400 },
  { base: 3200, limit: 1100 },
  { base: 4700, limit: 1000 }
];

function drawSegTable() {
  let html = "<tr><th>Segment</th><th>Base address</th><th>Limit (size)</th><th>Valid offsets</th><th>Physical address range</th></tr>";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    html += "<tr data-segment=\"" + i + "\"><td>" + i + "</td><td>" + segment.base +
            "</td><td>" + segment.limit + "</td><td>0 to " + (segment.limit - 1) +
            "</td><td>" + segment.base + " to " +
            (segment.base + segment.limit - 1) + "</td></tr>";
  }
  document.getElementById("segTable").innerHTML = html;
}

function renderSegFlow(segmentNumber, offset, segment, status, physical) {
  document.getElementById("flowSegment").textContent = segmentNumber;
  document.getElementById("flowSegOffset").textContent = offset;
  document.getElementById("flowBase").textContent = segment ? segment.base : "—";
  document.getElementById("flowLimit").textContent = segment ? segment.limit : "—";
  document.getElementById("flowSegCheck").textContent = status === "valid"
    ? offset + " < " + segment.limit + " (valid)"
    : status === "fault" ? offset + " ≥ " + segment.limit + " (out of bounds)"
      : "Check offset against limit";
  document.getElementById("flowSegStatus").textContent = status === "valid"
    ? "Offset is within the segment; add it to the base."
    : status === "fault" ? "Segmentation fault: the offset is outside this segment."
      : segment ? "The offset must be less than the segment limit."
        : "No segment-table entry exists for this segment number.";
  document.getElementById("flowSegPhysical").textContent = status === "valid" ? physical : "Not available";
  document.getElementById("flowSegFormula").textContent = status === "valid"
    ? segment.base + " + " + offset + " = " + physical
    : status === "fault" ? "No physical address is generated."
      : "A valid segment mapping is required.";
  document.getElementById("flowSegLookupStage").classList.toggle("is-unavailable", status === "invalid-segment" || status === "fault");
  document.getElementById("flowSegPhysicalStage").classList.toggle("is-unavailable", status !== "valid");
  document.querySelectorAll("#segTable tr[data-segment]").forEach(function (row) {
    row.classList.toggle("current-page", Number(row.dataset.segment) === segmentNumber);
  });
}

function translateSegmentation() {
  const s = Number(document.getElementById("segNo").value);
  const d = Number(document.getElementById("segOffset").value);
  const out = document.getElementById("segResult");

  if (!Number.isInteger(s) || s < 0 || s >= segments.length) {
    renderSegFlow(document.getElementById("segNo").value || "—",
      document.getElementById("segOffset").value || "—", null, "invalid-segment", null);
    out.textContent =
      "1. Segment-table lookup failed: segment " + s + " does not exist.\n" +
      "2. Use a segment number from 0 to " + (segments.length - 1) + ".";
    return;
  }
  if (isNaN(d) || d < 0) {
    renderSegFlow(s, document.getElementById("segOffset").value || "—",
      segments[s], "invalid-offset", null);
    out.textContent = "Enter a non-negative offset so it can be checked against the selected segment's limit.";
    return;
  }
  if (d >= segments[s].limit) {
    renderSegFlow(s, d, segments[s], "fault", null);
    out.textContent =
      "1. Segment-table lookup: segment " + s + " has base " + segments[s].base +
      " and limit " + segments[s].limit + ".\n" +
      "2. Bounds check failed: offset " + d + " must be less than the limit " +
      segments[s].limit + " (valid offsets are 0 to " + (segments[s].limit - 1) + ").\n" +
      "3. Result: segmentation fault. No physical address is generated.";
    return;
  }

  const physical = segments[s].base + d;
  renderSegFlow(s, d, segments[s], "valid", physical);
  out.textContent =
    "1. Segment-table lookup: segment " + s + " \u2192 base " + segments[s].base +
    ", limit " + segments[s].limit + ".\n" +
    "2. Bounds check: offset " + d + " < limit " + segments[s].limit + " (valid).\n" +
    "3. Physical address = base + offset = " + segments[s].base + " + " + d +
    " = " + physical + ".";
}

document.getElementById("segBtn").addEventListener("click", translateSegmentation);

drawSegTable();
translateSegmentation();


/* ---------- 4) Page replacement ---------- */
const info = {
  FIFO: "Replaces the page that has been in memory the longest.",
  LRU: "Replaces the page that has not been used for the longest time.",
  Optimal: "Replaces the page that will not be needed for the longest time in the future."
};

function simulate(refs, n, algo) {
  const frames = [];
  const steps = [];
  const lastUsed = {};
  let faults = 0;
  let oldest = 0;

  for (let i = 0; i < refs.length; i++) {
    const page = refs[i];
    const fault = !frames.includes(page);
    let victim = null;

    if (fault) {
      faults++;
      if (frames.length < n) {
        frames.push(page);
      } else {
        let v = 0;
        if (algo === "FIFO") {
          v = oldest;
          oldest = (oldest + 1) % n;
        } else if (algo === "LRU") {
          let best = Infinity;
          for (let j = 0; j < frames.length; j++) {
            if (lastUsed[frames[j]] < best) {
              best = lastUsed[frames[j]];
              v = j;
            }
          }
        } else {
          let farthest = -1;
          for (let j = 0; j < frames.length; j++) {
            let next = refs.indexOf(frames[j], i + 1);
            if (next === -1) next = Infinity;
            if (next > farthest) {
              farthest = next;
              v = j;
            }
          }
        }
        victim = frames[v];
        frames[v] = page;
      }
    }

    lastUsed[page] = i;
    steps.push({ page: page, frames: frames.slice(), fault: fault, victim: victim });
  }
  return { steps: steps, faults: faults };
}

function stepTable(steps, n) {
  let html = "<table><tr><th>Reference</th>";
  steps.forEach(function (s) { html += "<th>" + s.page + "</th>"; });
  html += "</tr>";

  for (let r = 0; r < n; r++) {
    html += "<tr><th>Frame " + r + "</th>";
    steps.forEach(function (s) {
      const v = s.frames[r];
      html += "<td class='" + (s.fault ? "fault" : "") + "'>" + (v === undefined ? "" : v) + "</td>";
    });
    html += "</tr>";
  }

  html += "<tr><th>Result</th>";
  steps.forEach(function (s) {
    html += "<td class='" + (s.fault ? "fault" : "hit") + "'>" + (s.fault ? "Fault" : "Hit") + "</td>";
  });
  html += "</tr><tr><th>Replaced</th>";
  steps.forEach(function (s) {
    html += "<td class='evict'>" + (s.victim === null ? "-" : s.victim) + "</td>";
  });
  return html + "</tr></table>";
}

function runAll() {
  const refs = document.getElementById("refString").value
    .split(/[\s,]+/).filter(function (x) { return x !== ""; }).map(Number);
  const n = Number(document.getElementById("frameCount").value);
  const msg = document.getElementById("vmResult");
  const stats = document.getElementById("stats");
  const details = document.getElementById("details");

  const bad = refs.some(function (x) { return !Number.isInteger(x) || x < 0; });
  if (refs.length === 0 || bad || !Number.isInteger(n) || n < 1) {
    msg.textContent = "Enter page numbers separated by spaces, and at least 1 frame.";
    stats.innerHTML = "";
    details.innerHTML = "";
    return;
  }
  msg.textContent = "";

  const results = ["FIFO", "LRU", "Optimal"].map(function (name) {
    const r = simulate(refs, n, name);
    return { name: name, steps: r.steps, faults: r.faults };
  });
  const fewest = Math.min.apply(null, results.map(function (r) { return r.faults; }));

  let statHtml = "";
  let detailHtml = "";
  results.forEach(function (r) {
    const best = r.faults === fewest;
    const ratio = ((refs.length - r.faults) / refs.length * 100).toFixed(1);
    const width = (r.faults / refs.length * 100).toFixed(0);

    statHtml += "<div class='stat " + (best ? "best" : "") + "'>" +
      (best ? "<span class='badge'>Fewest faults</span>" : "") +
      "<h3>" + r.name + "</h3>" +
      "<div class='num'>" + r.faults + "</div>" +
      "<small>page faults \u00b7 hit ratio " + ratio + "%</small>" +
      "<div class='bar'><div data-w='" + width + "%'></div></div></div>";

    detailHtml += "<div class='algo-card'><h3>" + r.name + "</h3>" +
      "<p class='desc'>" + info[r.name] + "</p>" +
      "<div class='scroll'>" + stepTable(r.steps, n) + "</div></div>";
  });

  stats.innerHTML = statHtml;
  details.innerHTML = detailHtml;

  // animate the bars
  setTimeout(function () {
    document.querySelectorAll(".bar div").forEach(function (d) {
      d.style.width = d.dataset.w;
    });
  }, 50);
}

document.getElementById("runBtn").addEventListener("click", runAll);
runAll();