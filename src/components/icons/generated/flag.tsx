/** Streamline Material Rounded Line (free) — offline, do not fetch at runtime */
import { OrbsteraIcon, type OrbsteraIconProps } from '../Icon';

export function IconFlag(props: OrbsteraIconProps) {
  return (
    <OrbsteraIcon viewBox="0 0 24 24" {...props}>
<path fill="currentColor" d="M16 0H0v16h4v-4h12l-6 -6 6 -6Z" strokeWidth={props.strokeWidth || 1.5}></path>
    </OrbsteraIcon>
  );
}
