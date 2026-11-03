"use client";
import { useEffect, useState } from "react";
import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2 } from "react-icons/fi";
import styles from "./CategoriesPanel.module.css";

export default function VideoSettingsEditor({ onSavingChange }) {
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setError('');
    try {
      const [settingsResponse, productsResponse] = await Promise.all([fetch('/api/store-settings/videos?admin=1', { cache: 'no-store' }), fetch('/api/products?admin=1', { cache: 'no-store' })]);
      const data = await settingsResponse.json();
      if (!settingsResponse.ok) throw new Error(data.error || 'Unable to load store settings.');
      const productData = await productsResponse.json();
      if (!productsResponse.ok || !Array.isArray(productData)) throw new Error(productData.error || 'Unable to load products.');
      setSettings(data); setProducts(productData);
    } catch (error) { setError(error.message); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { onSavingChange(saving); }, [saving, onSavingChange]);
  const changeVideo = (id, key, value) => setSettings(current => ({ ...current, videos: current.videos.map(video => video.id === id ? { ...video, [key]: value } : video) }));
  const move = (index, direction) => setSettings(current => { const videos = [...current.videos]; [videos[index], videos[index + direction]] = [videos[index + direction], videos[index]]; return { ...current, videos }; });
  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/store-settings/videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save settings.');
      setSettings(data); setNotice('Video section settings saved.');
      if (typeof BroadcastChannel !== 'undefined') { const channel = new BroadcastChannel('store-settings'); channel.postMessage('videos-updated'); channel.close(); }
    } catch (error) { setError(error.message); } finally { setSaving(false); }
  };
  if (!settings) return <div className={styles.empty}>{error ? <><p role="alert">{error}</p><button className={styles.secondary} onClick={load}>Try again</button></> : <p role="status">Loading store settings…</p>}</div>;
  return <div className={styles.workspace}><p className={styles.hint}>Configure the homepage video section shown above customer reviews.</p>
    <form className={styles.editor} onSubmit={save} aria-label="Homepage video section settings"><fieldset className={styles.fields} disabled={saving}>
      <div className={styles.visibility}><div><label htmlFor="videos-enabled">Show video section</label><p>Enable or hide the section without removing your saved videos.</p></div><button type="button" id="videos-enabled" role="switch" aria-label="Show video section" aria-checked={settings.enabled} className={styles.switch} onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}><span /></button></div>
      <label className={styles.label} htmlFor="video-heading" style={{ marginTop: 24 }}>Section heading</label><input id="video-heading" className={styles.nameInput} value={settings.title} required maxLength={80} onChange={event => setSettings({ ...settings, title: event.target.value })} />
      <p className={styles.hint}>Use YouTube videos/Shorts or direct MP4, WebM, OGG and M4V links. Hosted videos must allow embedding. YouTube thumbnails load automatically; a custom cover is optional.</p>
      {settings.videos.map((video, index) => <section className={styles.videoEditor} key={video.id} aria-label={`Video ${index + 1}`}><div className={styles.videoHeading}><strong>Video {index + 1}</strong><div><button type="button" className={styles.iconButton} aria-label={`Move video ${index + 1} up`} disabled={index === 0} onClick={() => move(index,-1)}><FiArrowUp /></button><button type="button" className={styles.iconButton} aria-label={`Move video ${index + 1} down`} disabled={index === settings.videos.length - 1} onClick={() => move(index,1)}><FiArrowDown /></button><button type="button" className={styles.iconButton} aria-label={`Remove video ${index + 1}`} onClick={() => setSettings(current => ({ ...current, videos: current.videos.filter(item => item.id !== video.id) }))}><FiTrash2 /></button></div></div>
        {[
          ['title', 'Caption', 'e.g. Petrea Volubilis', 'text'], ['url', 'Video link', 'https://www.youtube.com/shorts/…', 'url'], ['posterUrl', 'Cover image URL (optional)', 'https://…', 'url'],
        ].map(([key,label,placeholder,type]) => <div key={key}><label className={styles.label} htmlFor={`${video.id}-${key}`}>{label}</label><input className={styles.nameInput} id={`${video.id}-${key}`} type={type} value={video[key]} required={key !== 'posterUrl'} maxLength={key === 'title' ? 120 : 2000} placeholder={placeholder} onChange={event => changeVideo(video.id,key,event.target.value)} /></div>)}
        <label className={styles.label} htmlFor={`${video.id}-product`}>Linked product (optional)</label><select className={styles.nameInput} id={`${video.id}-product`} value={video.productId} onChange={event => changeVideo(video.id,'productId',event.target.value)}><option value="">No linked product</option>{products.map(product => <option key={product.id} value={product.id}>{product.title}</option>)}</select>
      </section>)}
      {!settings.videos.length && <p className={styles.hint}>No videos added. Add your own links to create the cards.</p>}
      <button type="button" className={styles.secondary} disabled={settings.videos.length >= 12} onClick={() => setSettings(current => ({ ...current, videos: [...current.videos, { id: crypto.randomUUID(), title: '', url: '', posterUrl: '', productId: '' }] }))}><FiPlus aria-hidden="true" />Add video</button>
      {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.success} role="status">{notice}</p>}
      <div className={styles.actions}><button type="submit" className={styles.primary}>{saving ? 'Saving…' : 'Save settings'}</button></div>
    </fieldset></form>
  </div>;
}
