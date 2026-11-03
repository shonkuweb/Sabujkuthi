"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiPause, FiPlay, FiVideo, FiVolume2, FiVolumeX } from "react-icons/fi";
import { parseVideoUrl } from "../../lib/video-section.mjs";
import { loadYouTubePlayer } from "../../lib/youtube-player";
import styles from "./VideoReels.module.css";

function VideoCard({ video, activeId, activate }) {
  const source = useMemo(() => parseVideoUrl(video.url), [video.url]);
  const card = useRef(null);
  const host = useRef(null);
  const file = useRef(null);
  const player = useRef(null);
  const active = useRef(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(source.provider === 'file');
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState('');
  const [posterError, setPosterError] = useState(false);
  active.current = activeId === video.id;
  const poster = posterError ? '' : video.posterUrl || (source.provider === 'youtube' ? `https://i.ytimg.com/vi/${source.videoId}/hqdefault.jpg` : video.product?.image || '');
  const pause = useCallback(() => {
    file.current?.pause();
    player.current?.pauseVideo?.();
    setPlaying(false);
  }, []);

  useEffect(() => { if (activeId !== video.id) pause(); }, [activeId, video.id, pause]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting || entries[0].intersectionRatio < 0.15) pause();
    }, { threshold: 0.15 }) : null;
    if (card.current) observer?.observe(card.current);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [pause]);

  useEffect(() => {
    if (!started || source.provider !== 'youtube') return;
    let cancelled = false;
    loadYouTubePlayer().then(YT => {
      if (cancelled || !host.current) return;
      const target = document.createElement('div');
      host.current.appendChild(target);
      const instance = new YT.Player(target, {
        width: '100%', height: '100%', videoId: source.videoId,
        playerVars: { controls: 0, playsinline: 1, rel: 0, enablejsapi: 1, loop: 1, playlist: source.videoId, origin: window.location.origin },
        events: {
          onReady: event => {
            if (cancelled) return;
            event.target.mute(); setReady(true);
            const bounds = card.current?.getBoundingClientRect();
            if (active.current && !document.hidden && bounds?.bottom > 0 && bounds?.top < window.innerHeight) event.target.playVideo();
          },
          onStateChange: event => {
            if (cancelled) return;
            setPlaying(event.data === YT.PlayerState.PLAYING);
            if (event.data === YT.PlayerState.PLAYING) activate(video.id);
          },
          onError: () => { if (!cancelled) { setError('This video cannot play here.'); setPlaying(false); } },
        },
      });
      player.current = instance;
    }).catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; player.current?.destroy?.(); player.current = null; };
  }, [started, source.provider, source.videoId, video.id, activate]);

  const togglePlay = async () => {
    if (playing) { pause(); return; }
    activate(video.id); setStarted(true); setError('');
    if (source.provider === 'file') {
      try { await file.current.play(); } catch { setError('Unable to play this video.'); }
    } else if (ready) player.current?.playVideo();
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (file.current) file.current.muted = next;
    if (next) player.current?.mute?.(); else player.current?.unMute?.();
  };

  return <article className={styles.card} ref={card} aria-label={video.title}>
    <div className={styles.frame}>
      {source.provider === 'file' ? <video ref={file} src={source.url} poster={poster || undefined} playsInline loop muted={muted} preload="none" onPlay={() => { setPlaying(true); activate(video.id); }} onPause={() => setPlaying(false)} onError={() => setError('Unable to play this video.')} aria-label={video.title} /> : started && <div className={styles.player} ref={host} />}
      {!started && <div className={styles.poster}>{poster ? <img src={poster} alt="" loading="lazy" onError={() => setPosterError(true)} /> : <FiVideo aria-hidden="true" />}</div>}
      {(!started || (!playing && ready && !error)) && <button type="button" className={styles.play} onClick={togglePlay} aria-label={`Play ${video.title}`}><FiPlay aria-hidden="true" /></button>}
      {started && !ready && !error && <span className={styles.loading} role="status">Loading video…</span>}
      {started && ready && !error && <div className={styles.controls}><button type="button" onClick={togglePlay} aria-label={`${playing ? 'Pause' : 'Play'} ${video.title}`}>{playing ? <FiPause /> : <FiPlay />}</button><button type="button" onClick={toggleMute} aria-label={`${muted ? 'Unmute' : 'Mute'} ${video.title}`}>{muted ? <FiVolumeX /> : <FiVolume2 />}</button></div>}
      {error && <div className={styles.error}><p role="status">{error}</p><a href={video.url} target="_blank" rel="noopener noreferrer">Open original video</a></div>}
    </div>
    {video.product ? <Link className={styles.caption} href={`/product/${video.product.slug}`}>{video.product.image && <img className={styles.productImage} src={video.product.image} alt="" loading="lazy" />}<span>{video.title}</span></Link> : <div className={styles.caption}><span>{video.title}</span></div>}
  </article>;
}

export default function VideoReels() {
  const [settings, setSettings] = useState(null);
  const [activeId, setActiveId] = useState(null);
  useEffect(() => {
    let active = true;
    let controller;
    const refresh = async () => {
      controller?.abort(); controller = new AbortController();
      try {
        const response = await fetch('/api/store-settings/videos', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json();
        if (active) setSettings(data);
      } catch (error) { if (active && error.name !== 'AbortError') setSettings(null); }
    };
    const onVisible = () => { if (!document.hidden) refresh(); };
    refresh();
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', onVisible);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('store-settings') : null;
    if (channel) channel.onmessage = refresh;
    return () => { active = false; controller?.abort(); channel?.close(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  if (!settings?.enabled || !settings.videos?.length) return null;
  return <section className={styles.section} aria-labelledby="video-section-title"><h2 id="video-section-title">{settings.title}</h2><div className={styles.track} tabIndex={0} aria-label="Plant videos, scroll horizontally">{settings.videos.map(video => <VideoCard key={`${video.id}-${video.url}`} video={video} activeId={activeId} activate={setActiveId} />)}</div></section>;
}
