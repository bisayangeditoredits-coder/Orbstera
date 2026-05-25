import { OrbsteraIcon, type OrbsteraIconProps } from '../Icon';

export function IconStrikethrough(props: OrbsteraIconProps) {
  return (
    <OrbsteraIcon viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M5 11.5h14v2H5v-2zm2.2-4.5c0-1.8 1.6-3 4-3 2.2 0 3.6.9 4.2 2.3l-2 .8c-.4-1-1.2-1.5-2.2-1.5-1.3 0-2 .7-2 1.6H7.2zm9.6 9c0 1.9-1.7 3.1-4.3 3.1-2.3 0-3.8-1-4.3-2.4l2-.9c.3 1 1.2 1.6 2.3 1.6 1.4 0 2.2-.7 2.2-1.7v.3z" />
    </OrbsteraIcon>
  );
}
