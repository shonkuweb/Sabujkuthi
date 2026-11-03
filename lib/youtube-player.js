let loading;
export function loadYouTubePlayer() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => { clearTimeout(timer); script.remove(); loading = null; reject(new Error('Unable to load this video. Try again or open the original link.')); };
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      try { if (previous) previous(); } catch {}
      if (window.YT?.Player) resolve(window.YT); else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}
