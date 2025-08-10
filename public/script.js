const TMDB_API_KEY = 'ea97a714a43a0e3481592c37d2c7178a';

function getPageType() {
  return window.location.pathname.includes("/tv") ? "tv" : "movie";
}

function getId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function fetchBackdropAndTitle(pageType, id) {
  try {
    if (pageType === "movie") {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`);
      const data = await res.json();
      const year = data.release_date ? data.release_date.slice(0, 4) : '';
      const title = data.title ? `${data.title} (${year})` : `Movie ${id}`;
      const backdrop = `https://image.tmdb.org/t/p/original${data.backdrop_path || ''}`;
      return { title, backdrop };
    } else {
      const [tvId, season, episode] = id.split('/');
      const res = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`);
      const data = await res.json();
      const year = data.air_date ? data.air_date.slice(0, 4) : '';
      const title = data.name ? `${data.name} (${year})` : `S${season}E${episode}`;
      const backdrop = `https://image.tmdb.org/t/p/original${data.still_path || data.backdrop_path || ''}`;
      return { title, backdrop };
    }
  } catch (err) {
    console.error("TMDB fetch error:", err);
    return { title: "Unknown", backdrop: "" };
  }
}

async function fetchLogoUrl(pageType, id) {
  try {
    const actualId = pageType === 'movie' ? id : id.split('/')[0];
    const res = await fetch(`https://api.themoviedb.org/3/${pageType}/${actualId}/images?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    const logo = (data.logos || []).find(l => l.iso_639_1 === 'en') || data.logos?.[0];
    return logo ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : null;
  } catch (e) {
    console.warn("Failed to fetch logo:", e);
    return null;
  }
}

async function loadData() {
  const pageType = getPageType();
  const id = getId();
  const status = document.getElementById("status");
  const titleElement = document.getElementById("title");

  if (!id) {
    status.textContent = "Missing ID in URL. Use ?id=...";
    return;
  }

  const { title, backdrop } = await fetchBackdropAndTitle(pageType, id);
  const logoUrl = await fetchLogoUrl(pageType, id);

  if (logoUrl) {
    titleElement.innerHTML = `<img src="${logoUrl}" alt="${title}">`;
  } else {
    titleElement.textContent = title;
  }

  if (backdrop) {
    document.body.style.backgroundImage = `url(${backdrop})`;
  }

  try {
    const apiRes = await fetch(`/api/${pageType}?id=${encodeURIComponent(id)}`);
    const data = await apiRes.json();

    if (data.error) {
      status.textContent = "API Error: " + data.error;
      return;
    }

    status.textContent = "";

    const safeTitle = title.replace(/[^a-z0-9]/gi, '_');
    const dContainer = document.getElementById("downloads");
    const sContainer = document.getElementById("subtitles");
    dContainer.innerHTML = "";
    sContainer.innerHTML = "";

    (data.downloads || []).forEach(d => {
      const link = document.createElement("a");
      link.href = d.url;
      link.textContent = `${d.resolution}p (${d.size} MB)`;
      link.setAttribute("download", `${safeTitle}_${d.resolution}p.mp4`);
      dContainer.appendChild(link);
    });

    (data.subtitles || []).forEach(s => {
      const link = document.createElement("a");
      link.href = s.url;
      link.textContent = `${s.lanName} (${s.size} KB)`;
      link.setAttribute("download", `${safeTitle}_${s.lanName}.srt`);
      sContainer.appendChild(link);
    });

  } catch (err) {
    status.textContent = "Error fetching download info.";
    console.error(err);
  }
}

loadData();


// Disable right-click
document.addEventListener('contextmenu', e => e.preventDefault());

// Detect DevTools via debugger trap
setInterval(() => {
  const before = new Date();
  debugger;
  const after = new Date();
  if (after - before > 100) {
    document.body.innerHTML = '<h1>DevTools is not allowed.</h1>';
  }
}, 1000);

// Detect common key combos
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
    (e.ctrlKey && e.key.toUpperCase() === 'U') // View source
  ) {
    e.preventDefault();
    alert("Action blocked.");
  }
});
