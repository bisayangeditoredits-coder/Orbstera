/** Streamline Material Rounded Line (free) — offline, do not fetch at runtime */
import { OrbsteraIcon, type OrbsteraIconProps } from '../Icon';

export function IconLink(props: OrbsteraIconProps) {
  return (
    <OrbsteraIcon viewBox="0 0 24 24" {...props}>
<path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m2.5 4.502 -0.917 0.92a2.12 2.12 0 0 0 0.002 2.997v0a2.12 2.12 0 0 0 2.999 0l0.917 -0.917" strokeWidth={props.strokeWidth || 1.5}></path>
  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m7.5 5.502 0.914 -0.912c0.83 -0.828 0.83 -2.172 0.002 -3.001v0a2.121 2.121 0 0 0 -2.999 -0.002l-0.916 0.915" strokeWidth={props.strokeWidth || 1.5}></path>
  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m3.5 6.502 3 -3" strokeWidth={props.strokeWidth || 1.5}></path>
    </OrbsteraIcon>
  );
}
