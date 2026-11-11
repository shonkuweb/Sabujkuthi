"use client";
import { useEffect, useRef, useState } from "react";
import { FiArrowUpRight, FiImage, FiLock, FiPercent, FiTruck, FiVideo, FiX } from "react-icons/fi";
import VideoSettingsEditor from "./VideoSettingsEditor";
import HeroSettingsEditor from "./HeroSettingsEditor";
import DeliverySettingsEditor from "./DeliverySettingsEditor";
import PasswordSettingsEditor from "./PasswordSettingsEditor";
import OffersSettingsEditor from "./OffersSettingsEditor";
import styles from "./StoreSettingsPanel.module.css";

const settings = [
  { id: 'offers', title: 'Offers & Discounts', description: 'Announcement bar text, discount rules and progress nudges', icon: FiPercent },
  { id: 'hero', title: 'Hero Banner Editing', description: 'Banner images and homepage tickers', icon: FiImage },
  { id: 'delivery', title: 'Delivery & Shipping', description: 'Standard charges and free delivery conditions', icon: FiTruck },
  { id: 'password', title: 'Password Update', description: 'Update admin panel login password', icon: FiLock },
  { id: 'videos', title: 'Video Cards', description: 'Video links, captions and section visibility', icon: FiVideo },
];

export default function StoreSettingsPanel({ active }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const current = settings.find(setting => setting.id === selected);
  const close = () => { if (!saving) setSelected(null); };

  useEffect(() => { if (!active) setSelected(null); }, [active]);
  useEffect(() => {
    if (!selected || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [selected]);

  return <div className={styles.workspace}>
    <p className={styles.intro}>Choose a setting to configure your store.</p>
    <div className={styles.grid}>
      {settings.map(({ id, title, description, icon: Icon }) => <button
        key={id} type="button" className={styles.tile}
        aria-haspopup="dialog" aria-expanded={selected === id}
        onClick={event => { triggerRef.current = event.currentTarget; setSelected(id); }}
      >
        <FiArrowUpRight className={styles.arrow} aria-hidden="true" />
        <span className={styles.tileIcon}><Icon aria-hidden="true" /></span>
        <strong>{title}</strong><span className={styles.description}>{description}</span>
      </button>)}
    </div>
    {current && <dialog ref={dialogRef} className={`${styles.modal} ${selected === 'hero' ? styles.modalHero : ''}`}
      aria-labelledby="store-setting-title"
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}
    >
      <header className={styles.modalHeader}><div><span>STORE SETTINGS</span><h2 id="store-setting-title">{current.title}</h2></div><button type="button" aria-label="Close setting panel" disabled={saving} onClick={close}><FiX aria-hidden="true" /></button></header>
      <div className={styles.content}>
        {selected === 'offers' && <OffersSettingsEditor onSavingChange={setSaving} />}
        {selected === 'hero' && <HeroSettingsEditor onSavingChange={setSaving} />}
        {selected === 'delivery' && <DeliverySettingsEditor onSavingChange={setSaving} />}
        {selected === 'password' && <PasswordSettingsEditor onSavingChange={setSaving} />}
        {selected === 'videos' && <VideoSettingsEditor onSavingChange={setSaving} />}
      </div>
    </dialog>}
  </div>;
}
