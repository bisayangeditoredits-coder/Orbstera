'use client';

import { useState } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { QrCode, X, Plus, Wifi, Link } from 'lucide-react';


export function QRPanel({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<'text' | 'wifi'>('text');
  
  // text state
  const [data, setData] = useState('https://orbstera.com');
  
  // wifi state
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState('WPA');
  const [hidden, setHidden] = useState(false);

  const [color, setColor] = useState('#000000');
  
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const getQrData = () => {
    if (tab === 'text') return data;
    if (tab === 'wifi') {
      if (!ssid.trim()) return '';
      return `WIFI:S:${ssid};T:${encryption};P:${password};H:${hidden ? 'true' : 'false'};;`;
    }
    return '';
  };

  const currentData = getQrData();

  const handleAddQR = () => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;
    if (!currentData.trim()) return;

    // api.qrserver.com uses hex without the hash
    const colorHex = color.replace('#', '');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(currentData)}&color=${colorHex}`;

    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      x: 540,
      y: 260,
      width: 200,
      height: 200,
      src: qrUrl,
      zIndex: 100,
    } as any);
  };

  const COLORS = ['#000000', '#2563EB', '#DC2626', '#16A34A', '#7C3AED', '#DB2777'];

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] text-black overflow-hidden relative">
      <div className="shrink-0 flex flex-col border-b border-black/[0.06] bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/10 flex items-center justify-center shrink-0">
              <QrCode size={19} className="text-indigo-500" strokeWidth={1.75} />
            </div>
            <div className="pt-0.5">
              <h2 className="text-[16px] font-semibold text-neutral-900 tracking-tight leading-tight">QR Code</h2>
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.14em] mt-1 leading-snug">
                100% Free Generator
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-xl border border-black/[0.06] bg-white text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 hover:border-black/[0.08] transition-all flex items-center justify-center shadow-sm"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-6">
        <div className="space-y-6">
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => setTab('text')}
              className={`flex-1 flex items-center justify-center gap-2 h-9 text-[12px] font-bold rounded-lg transition-all ${tab === 'text' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Link size={14} /> Link / Text
            </button>
            <button
              onClick={() => setTab('wifi')}
              className={`flex-1 flex items-center justify-center gap-2 h-9 text-[12px] font-bold rounded-lg transition-all ${tab === 'wifi' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Wifi size={14} /> Wi-Fi
            </button>
          </div>

          {tab === 'text' ? (
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-neutral-700">URL or Text Data</label>
              <input
                type="text"
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full h-11 bg-white border border-black/[0.08] rounded-xl px-4 text-[13px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
              />
            </div>
          ) : (
            <div className="space-y-3 border border-black/[0.05] p-4 rounded-2xl bg-white shadow-sm">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Network Name (SSID)</label>
                <input
                  type="text"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  placeholder="My Home WiFi"
                  className="w-full h-10 bg-neutral-50 border border-black/[0.06] rounded-lg px-3 text-[13px] font-medium focus:bg-white focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-10 bg-neutral-50 border border-black/[0.06] rounded-lg px-3 text-[13px] font-medium focus:bg-white focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Security</label>
                  <select
                    value={encryption}
                    onChange={(e) => setEncryption(e.target.value)}
                    className="w-full h-10 bg-neutral-50 border border-black/[0.06] rounded-lg px-2 text-[13px] font-medium focus:bg-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  >
                    <option value="WPA">WPA/WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="hidden-net"
                    checked={hidden}
                    onChange={(e) => setHidden(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="hidden-net" className="text-[12px] font-medium text-neutral-700">Hidden</label>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[12px] font-bold text-neutral-700">QR Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-indigo-500 scale-110 shadow-md' : 'border-transparent shadow-sm'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <div className="bg-white border border-black/[0.05] rounded-2xl p-6 flex flex-col items-center justify-center gap-4 shadow-sm">
              <div className="w-32 h-32 bg-neutral-50 border border-neutral-100 rounded-xl overflow-hidden flex items-center justify-center relative">
                {currentData.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentData)}&color=${color.replace('#', '')}`}
                    alt="QR Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode size={40} className="text-neutral-200" strokeWidth={1} />
                )}
              </div>
              <button
                onClick={handleAddQR}
                disabled={!currentData.trim()}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-indigo-200"
              >
                <Plus size={16} strokeWidth={2.5} />
                Add to Slide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
