export const defaultVideoSection = { enabled: false, title: 'Join the Tribe', videos: [] };
export function parseVideoUrl(value) {
  if (typeof value !== 'string' || value.length > 2000) throw new Error('Enter a valid video link.');
  let url;
  try { url = new URL(value); } catch { throw new Error('Enter a valid HTTPS video link.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS video link without embedded credentials.');
  const host = url.hostname.toLowerCase();
  let id;
  if (host === 'youtu.be' || host === 'www.youtu.be') id = url.pathname.split('/')[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
    const parts = url.pathname.split('/').filter(Boolean);
    id = ['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : url.searchParams.get('v');
  }
  if (id !== undefined && id !== null) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('This YouTube video link is invalid.');
    return { provider: 'youtube', videoId: id, url: url.toString() };
  }
  if (/\.(mp4|webm|ogg|m4v)$/i.test(url.pathname)) return { provider: 'file', url: url.toString() };
  throw new Error('Use a YouTube video/Shorts link or a direct MP4, WebM, OGG or M4V video link.');
}
export function validateVideoSection(input) {
  if (!input || typeof input !== 'object' || typeof input.enabled !== 'boolean') throw new Error('Choose whether the video section is enabled.');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 80) throw new Error('Section heading must be between 1 and 80 characters.');
  if (!Array.isArray(input.videos) || input.videos.length > 12) throw new Error('Add up to 12 videos.');
  if (input.enabled && !input.videos.length) throw new Error('Add a video before enabling this section.');
  const ids = new Set();
  const videos = input.videos.map((video, index) => {
    if (!video || typeof video.id !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(video.id) || ids.has(video.id)) throw new Error('Video identifiers must be unique.');
    ids.add(video.id);
    if (typeof video.title !== 'string' || !video.title.trim() || video.title.trim().length > 120) throw new Error(`Enter a caption of 1–120 characters for video ${index + 1}.`);
    const parsed = parseVideoUrl(video.url);
    let posterUrl = '';
    if (video.posterUrl) {
      if (typeof video.posterUrl !== 'string' || video.posterUrl.length > 2000) throw new Error('Enter a valid cover image URL.');
      let poster;
      try { poster = new URL(video.posterUrl); } catch { throw new Error('Cover images must use an HTTPS URL.'); }
      if (poster.protocol !== 'https:' || poster.username || poster.password) throw new Error('Cover images must use an HTTPS URL without embedded credentials.');
      posterUrl = poster.toString();
    }
    if (video.productId && typeof video.productId !== 'string') throw new Error('Choose a valid linked product.');
    return { id: video.id, title: video.title.trim(), url: parsed.url, posterUrl, productId: video.productId || '' };
  });
  return { enabled: input.enabled, title: input.title.trim(), videos };
}
