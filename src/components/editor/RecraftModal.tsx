import { useState } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Sparkles, Loader2, Image as ImageIcon, Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export function RecraftModal() {
  const activeTool = usePresentationStore((s) => s.editor.activeTool);
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  const addElement = usePresentationStore((s) => s.addElement);
  const selectElement = usePresentationStore((s) => s.selectElement);
  const presentation = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  
  const selectedElementId = usePresentationStore((s) => s.editor.selectedElementId);
  const slide = presentation?.slides[currentSlideIndex];
  const selectedElement = slide?.elements?.find(e => e.id === selectedElementId);
  
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<'vector' | 'raster'>('vector');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = activeTool === 'recraft';

  const handleClose = () => {
    setEditorState({ activeTool: 'select' });
    setPrompt('');
    setError(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const slide = presentation?.slides[currentSlideIndex];
    if (!slide) return;

    setLoading(true);
    setError(null);

    try {
      const isRestyle = activeTool === 'recraft' && !!selectedElement && selectedElement.type === 'image';
      
      const payload = isRestyle ? {
        prompt,
        style,
        mode: 'restyle',
        imageUrl: selectedElement.src
      } : {
        prompt,
        style,
        mode: 'generate'
      };

      const res = await fetch('/api/generate-image/recraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to generate');
      }

      if (data.url) {
        if (isRestyle && selectedElement) {
          usePresentationStore.getState().updateElement(slide.id, selectedElement.id, { src: data.url });
        } else {
          const imgEl = {
            id: `el-image-${currentSlideIndex}-${Date.now()}`,
            type: 'image' as const,
            x: 100,
            y: 100,
            width: 400,
            height: 400,
            opacity: 1,
            visible: true,
            locked: false,
            zIndex: (slide.elements?.length || 0) + 1,
            src: data.url,
          };
          addElement(slide.id, imgEl);
          selectElement(imgEl.id);
        }
        handleClose();
      }
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <div className="flex flex-col gap-5">
        <h2 className="text-xl font-bold">Recraft AI Graphics</h2>
        <p className="text-sm text-slate-500">
          Generate high-quality SVG illustrations and realistic graphics instantly.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g. A futuristic city skyline, cyberpunk style, minimal..."
            className="w-full min-h-[100px] bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Format & Style
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setStyle('vector')}
              className={`flex flex-col gap-1 items-start p-3 rounded-lg border transition-all ${
                style === 'vector' 
                  ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Paintbrush size={16} className={style === 'vector' ? 'text-indigo-600' : 'text-slate-400'} />
                <span className="font-semibold text-sm text-slate-900">Vector SVG</span>
              </div>
              <span className="text-xs text-slate-500 text-left">Crisp graphics, scalable (10 credits)</span>
            </button>

            <button
              onClick={() => setStyle('raster')}
              className={`flex flex-col gap-1 items-start p-3 rounded-lg border transition-all ${
                style === 'raster' 
                  ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className={style === 'raster' ? 'text-indigo-600' : 'text-slate-400'} />
                <span className="font-semibold text-sm text-slate-900">Realistic 3D</span>
              </div>
              <span className="text-xs text-slate-500 text-left">Photorealistic, standard (3 credits)</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 gap-3 mt-4">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!prompt.trim() || loading} className="gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate Image
          </Button>
        </div>
      </div>
    </Modal>
  );
}
