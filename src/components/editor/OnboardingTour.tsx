'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { ChevronRight, X, Sparkles, Layout, Layers, Download, Play, Volume2, VolumeX } from 'lucide-react';

const TOUR_STEPS = [
  {
    targetId: 'tour-gallery',
    title: 'Slide Gallery',
    description: 'Manage all your slides here. You can add, reorder, duplicate, or delete slides. Click any slide to jump to it instantly.',
    icon: Layout,
    position: 'right' as const,
  },
  {
    targetId: 'tour-toolbar',
    title: 'Creative Tools',
    description: 'Add text, images, rectangles, circles, triangles, stars, lines, and arrows to your slides. You can also click the Upload button or paste an image directly from your clipboard!',
    icon: Sparkles,
    position: 'bottom' as const,
  },
  {
    targetId: 'tour-canvas',
    title: 'Creative Canvas',
    description: 'This is your main editing area. Click any element to select it, then drag to move or pull the handles to resize. Press Delete to remove a selected element.',
    icon: Layout,
    position: 'top' as const,
  },
  {
    targetId: 'tour-panel-tabs',
    title: 'Feature Panels',
    description: 'Switch between AI Generation, Layers, Design Themes, and Speaker Notes using these tabs.',
    icon: Layers,
    position: 'bottom' as const,
  },
  {
    targetId: 'tour-generate',
    title: 'AI Generation',
    description:
      'Describe your topic in “Your vision”, pick how many slides you want, then tap Generate. The AI streams your deck in real time and can add cinematic backgrounds. Credits and costs are shown in the panel before you run.',
    icon: Play,
    position: 'left' as const,
  },
  {
    targetId: 'tour-layers',
    title: 'Layers & Properties',
    description: 'Select any element in the layers list to edit its text, color, opacity, bold, italic, animation effects, and exact position. You can also duplicate, lock, hide, or delete elements here.',
    icon: Layers,
    position: 'left' as const,
  },
  {
    targetId: 'tour-actions',
    title: 'Collaborate & Present',
    description: 'Share your project with teammates or launch a full-screen cinematic presentation mode directly from the editor.',
    icon: Play,
    position: 'bottom' as const,
  },
  {
    targetId: 'tour-export',
    title: 'Export to PowerPoint',
    description: 'Export your finished presentation as a fully editable PPTX file with matching backgrounds, fonts, and entrance animations that play in PowerPoint.',
    icon: Download,
    position: 'bottom' as const,
  },
];

export function OnboardingTour() {
  const { onboarding, nextOnboardingStep, skipOnboarding, setActivePanel, setPanelOpen } = usePresentationStore();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  
  const currentStep = TOUR_STEPS[onboarding.step];
  const isLastStep = onboarding.step === TOUR_STEPS.length - 1;
  const maskId = `orbstera-spotlight-${onboarding.step}`;

  useEffect(() => {
    if (!onboarding.isActive || !currentStep) return;

    // --- Automatic Panel Switching ---
    if (currentStep.targetId === 'tour-generate') {
      setActivePanel('generate');
      setPanelOpen(true);
    } else if (currentStep.targetId === 'tour-layers') {
      setActivePanel('layers');
      setPanelOpen(true);
    } else if (currentStep.targetId === 'tour-panel-tabs') {
      setPanelOpen(true);
    }

    let speechTimeout: ReturnType<typeof setTimeout>;

    // --- Optional TTS (off by default; user opts in) ---
    const speakStep = () => {
      window.speechSynthesis.cancel();
      if (!voiceOn) return;

      const welcomePrefix = onboarding.step === 0 ? 'Hello! Welcome to Orbstera. ' : '';
      const text = `${welcomePrefix}${currentStep.title}. ${currentStep.description}`;

      const utterance = new SpeechSynthesisUtterance(text);
      const allVoices = window.speechSynthesis.getVoices();
      const enVoices  = allVoices.filter(v => v.lang.startsWith('en'));

      // Score each English voice — higher = better quality male AI persona
      const score = (v: SpeechSynthesisVoice): number => {
        let s = 0;
        const n = v.name.toLowerCase();
        // Tier 1: Neural/Natural online voices (best quality)
        if (n.includes('natural'))   s += 40;
        if (n.includes('neural'))    s += 40;
        if (n.includes('online'))    s += 30;
        // Tier 2: Preferred providers
        if (n.includes('microsoft')) s += 15;
        if (n.includes('google'))    s += 12;
        // Tier 3: Known great male voices by name
        if (n.includes('guy'))           s += 20;
        if (n.includes('christopher'))   s += 20;
        if (n.includes('ryan'))          s += 20;
        if (n.includes('david'))         s += 15;
        if (n.includes('daniel'))        s += 15;
        if (n.includes('arthur'))        s += 10;
        if (n.includes('uk english male')) s += 25;
        if (n.includes('us english'))      s += 10;
        // Penalise known female voices strongly
        if (n.includes('aria') || n.includes('jenny') || n.includes('siri') ||
            n.includes('samantha') || n.includes('female') || n.includes('zira') ||
            n.includes('hazel') || n.includes('susan') || n.includes('victoria') ||
            n.includes('karen') || n.includes('tessa') || n.includes('moira')) s -= 60;
        return s;
      };

      const best = [...enVoices].sort((a, b) => score(b) - score(a))[0];
      if (best) {
        utterance.voice = best;
        utterance.lang  = best.lang;
      } else {
        utterance.lang = 'en-US';
      }

      utterance.rate   = 1.05;  // Energetic, confident pacing
      utterance.pitch  = 0.95;  // Slightly deeper for masculine AI feel
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    };

    // Handle asynchronous voices loading
    if (voiceOn) {
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = speakStep;
      } else {
        speechTimeout = setTimeout(speakStep, 600);
      }
    }

    const updateCoords = () => {
      const element = document.getElementById(currentStep.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    const observer = new MutationObserver(updateCoords);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (speechTimeout) clearTimeout(speechTimeout);
      window.speechSynthesis.cancel();
      window.removeEventListener('resize', updateCoords);
      observer.disconnect();
    };
  }, [onboarding.isActive, onboarding.step, currentStep, voiceOn, setActivePanel, setPanelOpen]);

  const handleFinish = () => {
    skipOnboarding();
    setActivePanel('generate');
    setPanelOpen(true);
  };

  if (!onboarding.isActive || !coords || !currentStep) return null;

  const holePad = 10;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dimmed overlay + spotlight cutout (click does not dismiss — use Skip or ✕) */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.rect
              initial={false}
              animate={{
                x: coords.left - holePad,
                y: coords.top - holePad,
                width: coords.width + holePad * 2,
                height: coords.height + holePad * 2,
                rx: 14,
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15,23,42,0.72)"
          mask={`url(#${maskId})`}
          className="pointer-events-auto"
        />
        <motion.rect
          initial={false}
          animate={{
            x: coords.left - holePad,
            y: coords.top - holePad,
            width: coords.width + holePad * 2,
            height: coords.height + holePad * 2,
            rx: 14,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          fill="none"
          stroke="rgba(59,130,246,0.95)"
          strokeWidth={3}
          className="pointer-events-none drop-shadow-[0_0_20px_rgba(59,130,246,0.45)]"
        />
      </svg>

      {/* Content Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          // Position relative to spotlight with viewport clamping
          top: currentStep.position === 'bottom' ? Math.min(window.innerHeight - 300, coords.top + coords.height + 24) : 
               currentStep.position === 'top' ? Math.max(80, coords.top + 40) : 
               coords.top + (coords.height / 2) - 100,
          left: currentStep.position === 'right' ? Math.min(window.innerWidth - 340, coords.left + coords.width + 24) :
                currentStep.position === 'left' ? Math.max(20, coords.left - 340) :
                Math.max(20, Math.min(window.innerWidth - 340, coords.left + (coords.width / 2) - 160)),
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="absolute w-[320px] bg-white rounded-3xl shadow-2xl p-6 pointer-events-auto border border-black/[0.05]"
      >
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setVoiceOn((v) => !v);
              window.speechSynthesis.cancel();
            }}
            className="p-2 rounded-xl text-black/35 hover:text-primary hover:bg-primary/5 transition-colors"
            title={voiceOn ? 'Turn off voice narration' : 'Play voice narration'}
            aria-pressed={voiceOn}
          >
            {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            type="button"
            onClick={handleFinish}
            className="p-2 rounded-xl text-black/25 hover:text-black transition-colors"
            aria-label="Close tour"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 relative">
          {/* AI Guide Robot mascot (Relocated to the right) */}
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              rotate: [2, -2, 2]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-16 -right-16 w-36 h-36 pointer-events-none drop-shadow-2xl z-50"
          >
             {/* @ts-ignore */}
             <lottie-player
               src="/robo (2).json"
               background="transparent"
               speed="1.1"
               style={{ width: '100%', height: '100%' }}
               loop
               autoplay
             />
          </motion.div>

          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary relative z-10">
            <currentStep.icon size={24} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-black leading-tight mb-1">
              {currentStep.title}
            </h3>
            <p className="text-sm text-black/50 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5 flex-wrap">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === onboarding.step ? 'w-4 bg-primary' : 'w-1.5 bg-black/10'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleFinish}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 underline-offset-2 hover:underline shrink-0"
              >
                Skip tour
              </button>
            </div>
            <button
              type="button"
              onClick={isLastStep ? handleFinish : nextOnboardingStep}
              className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all"
            >
              <span>{isLastStep ? 'Done' : 'Next'}</span>
              {!isLastStep && <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {/* Triangle pointer */}
        <div 
          className={`absolute w-4 h-4 bg-white rotate-45 border-t border-l border-black/[0.03] ${
            currentStep.position === 'bottom' ? '-top-2 left-1/2 -translate-x-1/2' :
            currentStep.position === 'top' ? '-bottom-2 left-1/2 -translate-x-1/2' :
            currentStep.position === 'right' ? '-left-2 top-1/2 -translate-y-1/2' :
            '-right-2 top-1/2 -translate-y-1/2 border-t-0 border-l-0 border-b border-r'
          }`}
        />
      </motion.div>
    </div>
  );
}
