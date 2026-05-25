/** Streamline Material Rounded Line (free) — offline, do not fetch at runtime */
import { OrbsteraIcon, type OrbsteraIconProps } from '../Icon';

export function IconLayoutTemplate(props: OrbsteraIconProps) {
  return (
    <OrbsteraIcon viewBox="0 0 24 24" {...props}>
<path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m21 22.5 -18 0c-0.82843 0 -1.5 -0.6716 -1.5 -1.5l0 -18c0 -0.82843 0.67157 -1.5 1.5 -1.5l18 0c0.8284 0 1.5 0.67158 1.5 1.5l0 18c0 0.8284 -0.6716 1.5 -1.5 1.5" strokeWidth={props.strokeWidth || 1.5}></path>
  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m1.5 11.9961 21 0" strokeWidth={props.strokeWidth || 1.5}></path>
  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m8.5 22.5 0 -10.5039" strokeWidth={props.strokeWidth || 1.5}></path>
  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m15.5 22.5 0 -10.5039" strokeWidth={props.strokeWidth || 1.5}></path>
    </OrbsteraIcon>
  );
}
