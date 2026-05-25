import { OrbsteraIcon, type OrbsteraIconProps } from '../Icon';

export function IconLock(props: OrbsteraIconProps) {
  return (
    <OrbsteraIcon viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M8 10V8.5a4 4 0 118 0V10h1.5c.8 0 1.5.7 1.5 1.5v9c0 .8-.7 1.5-1.5 1.5h-11c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H8zm2-1.5a2 2 0 114 0V10h-4V8.5z"
      />
    </OrbsteraIcon>
  );
}
