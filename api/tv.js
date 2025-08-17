// /pages/api/tv.js or movie.js
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing ?id (format: tvId/season/episode)" });
  }

  const [tvId, season, episode] = id.split('/');
  if (!tvId || !season || !episode) {
    return res.status(400).json({ error: "Invalid ID format. Use tvId/season/episode" });
  }

  try {
    // ✅ Fetch the original video data
    const fetchUrl = `http://213.232.235.66:3014/tv/${tvId}/${season}/${episode}`;
    const response = await fetch(fetchUrl);
    const result = await response.json();

    if (result.code !== 0 || !result.data?.downloads) {
      return res.status(404).json({ error: "TV episode not found or invalid response." });
    }

    // ✅ Fetch episode title from TMDB
    const tmdbApiKey = 'ea97a714a43a0e3481592c37d2c7178a';
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/season/${season}/episode/${episode}?api_key=${tmdbApiKey}`);
    const tmdbData = await tmdbRes.json();

    const rawTitle = tmdbData.name || `TV_${tvId}_S${season}E${episode}`;
    const safeTitle = rawTitle.replace(/[^a-z0-9]/gi, '_');

    // ✅ Format download URLs using your new proxy
    const downloads = result.data.downloads.map(d => {
      const proxyUrl = `https://meowflex.com/proxy.php?url=${encodeURIComponent(d.url)}`;
      return {
        resolution: d.resolution,
        size: (parseInt(d.size) / 1024 / 1024).toFixed(1), // MB
        url: proxyUrl + `&n=${encodeURIComponent(safeTitle)}.mp4`
      };
    });

    // ✅ Format subtitles
    const subtitles = (result.data.captions || []).map(c => ({
      lanName: c.lanName,
      size: (parseInt(c.size) / 1024).toFixed(1), // KB
      url: c.url
    }));

    // ✅ Respond with data
    res.status(200).json({
      id,
      title: rawTitle,
      downloads,
      subtitles
    });

  } catch (err) {
    console.error("Error fetching TV episode:", err);
    res.status(500).json({ error: "Failed to fetch TV episode data." });
  }
}
