'use client';

import { useState } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { BarChart3, X, Plus } from 'lucide-react';

export function ChartsPanel({ onClose }: { onClose?: () => void }) {
  const [chartType, setChartType] = useState('bar');
  const [labels, setLabels] = useState('Q1, Q2, Q3, Q4');
  const [dataValues, setDataValues] = useState('120, 250, 180, 300');
  
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const getChartUrl = () => {
    const labelArray = labels.split(',').map(s => s.trim()).filter(Boolean);
    const dataArray = dataValues.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    
    const config = {
      type: chartType,
      data: {
        labels: labelArray,
        datasets: [{
          label: 'Data',
          data: dataArray,
          backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'],
        }]
      },
      options: {
        plugins: { legend: { display: chartType === 'pie' || chartType === 'doughnut' } }
      }
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
  };

  const handleAddChart = () => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;

    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      x: 340,
      y: 160,
      width: 600,
      height: 400,
      src: getChartUrl(),
      zIndex: 100,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] text-black overflow-hidden relative">
      <div className="shrink-0 flex flex-col border-b border-black/[0.06] bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0">
              <BarChart3 size={19} className="text-emerald-500" strokeWidth={1.75} />
            </div>
            <div className="pt-0.5">
              <h2 className="text-[16px] font-semibold text-neutral-900 tracking-tight leading-tight">Charts</h2>
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.14em] mt-1 leading-snug">
                Powered by QuickChart
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
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-neutral-700">Chart Type</label>
            <div className="grid grid-cols-2 gap-2">
              {['bar', 'line', 'pie', 'doughnut'].map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`py-2 px-3 text-[12px] font-semibold rounded-lg capitalize border transition-all ${
                    chartType === type 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                      : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-bold text-neutral-700">Labels (comma separated)</label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="w-full h-11 bg-white border border-black/[0.08] rounded-xl px-4 text-[13px] font-medium text-neutral-900 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-bold text-neutral-700">Data (comma separated)</label>
            <input
              type="text"
              value={dataValues}
              onChange={(e) => setDataValues(e.target.value)}
              className="w-full h-11 bg-white border border-black/[0.08] rounded-xl px-4 text-[13px] font-medium text-neutral-900 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
          </div>

          <div className="pt-2">
            <div className="bg-white border border-black/[0.05] rounded-2xl p-4 flex flex-col items-center gap-4 shadow-sm">
              <div className="w-full h-32 bg-neutral-50 border border-neutral-100 rounded-xl overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getChartUrl()} alt="Chart Preview" className="w-full h-full object-contain" />
              </div>
              <button
                onClick={handleAddChart}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200"
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
