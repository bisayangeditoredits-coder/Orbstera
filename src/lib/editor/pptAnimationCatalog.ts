import type { AnimationEntrance } from '@/types';

/** PowerPoint-style labels for editor UI; values stay `AnimationEntrance` for Present + export. */
export const PPT_STYLE_ENTRANCE_OPTIONS: { value: AnimationEntrance | string; label: string }[] = [
  { value: 'none', label: 'None (Appear)' },
  { value: 'fadeIn', label: 'Fade' },
  { value: 'fadeSlideUp', label: 'Fly In — From Bottom' },
  { value: 'fadeSlideLeft', label: 'Fly In — From Left' },
  { value: 'slideRight', label: 'Fly In — From Right' },
  { value: 'verticalRise', label: 'Float In' },
  { value: 'floatGentle', label: 'Float In (gentle)' },
  { value: 'zoomIn', label: 'Zoom' },
  { value: 'elasticScale', label: 'Grow & Turn (spring)' },
  { value: 'scaleSoft', label: 'Zoom — Soft' },
  { value: 'cinematicImageZoom', label: 'Zoom — Cinematic' },
  { value: 'reveal', label: 'Wipe' },
  { value: 'horizontalReveal', label: 'Wipe — Horizontal' },
  { value: 'blurIn', label: 'Fade — Blur' },
  { value: 'glassBlur', label: 'Fade — Glass blur' },
  { value: 'flipIn', label: 'Flip' },
  { value: 'bounceIn', label: 'Bounce' },
  { value: 'parallaxDrift', label: 'Fly In — Parallax' },
  { value: 'depthRise', label: 'Rise — Depth' },
  { value: 'morphBlend', label: 'Morph blend' },
  { value: 'glitch', label: 'Glitch' },
  { value: 'typewriterWords', label: 'Appear By Word' },
  { value: 'staggerLines', label: 'Appear By Line' },
  // Animate.css Third-Party Presets
  { value: 'animate__bounceIn', label: '3rd Party: Bounce In' },
  { value: 'animate__bounceInDown', label: '3rd Party: Bounce In Down' },
  { value: 'animate__fadeInDown', label: '3rd Party: Fade In Down' },
  { value: 'animate__flipInX', label: '3rd Party: Flip In X' },
  { value: 'animate__lightSpeedInRight', label: '3rd Party: Light Speed' },
  { value: 'animate__rollIn', label: '3rd Party: Roll In' },
  { value: 'animate__jackInTheBox', label: '3rd Party: Jack In The Box' },
  { value: 'animate__zoomInUp', label: '3rd Party: Zoom In Up' },
];

export const PPT_ANIMATION_HINT =
  'Timing matches Present mode. Exported PPTX uses the closest PowerPoint entrance preset.';
