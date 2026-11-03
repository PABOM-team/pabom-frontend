import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Figma 디자인 시스템 icon (Icon/Outline, 24px · 선 2px). 색은 currentColor */
const Icon = ({ children, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none" aria-hidden {...props}>
    {children}
  </svg>
);

export const ArchiveIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M5 8H19M5 8C3.89543 8 3 7.10457 3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6C21 7.10457 20.1046 8 19 8M5 8L5 18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V8M10 12H14"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M10 5L3 12L10 19M3 12L21 12"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ArrowRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M14 19L21 12L14 5M21 12L3 12"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const BanIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M18.364 18.364C21.8787 14.8492 21.8787 9.15076 18.364 5.63604C14.8492 2.12132 9.15076 2.12132 5.63604 5.63604M18.364 18.364C14.8492 21.8787 9.15076 21.8787 5.63604 18.364C2.12132 14.8492 2.12132 9.15076 5.63604 5.63604M18.364 18.364L5.63604 5.63604"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M15 17H20L18.5951 15.5951C18.2141 15.2141 18 14.6973 18 14.1585V11C18 8.38757 16.3304 6.16509 14 5.34142V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V5.34142C7.66962 6.16509 6 8.38757 6 11V14.1585C6 14.6973 5.78595 15.2141 5.40493 15.5951L4 17H9M15 17V18C15 19.6569 13.6569 21 12 21C10.3431 21 9 19.6569 9 18V17M15 17H9"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const CameraIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M13.9296 4H10.0704C9.40166 4 8.7772 4.3342 8.40627 4.8906L7.59373 6.1094C7.2228 6.6658 6.59834 7 5.92963 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7H18.0704C17.4017 7 16.7772 6.6658 16.4063 6.1094L15.5937 4.8906C15.2228 4.3342 14.5983 4 13.9296 4ZM15 13C15 14.6569 13.6569 16 12 16C10.3431 16 9 14.6569 9 13C9 11.3431 10.3431 10 12 10C13.6569 10 15 11.3431 15 13Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const CheckCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M5 13L9 17L19 7"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M19 9L12 16L5 9"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M15 19L8 12L15 5"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M9 5L16 12L9 19"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ChevronUpIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M5 15L12 8L19 15"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ClipboardListIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01"
      strokeWidth={2}
      strokeLinecap="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const CogIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M7.75219 5.38285C8.74926 5.99037 10.0492 5.45193 10.3246 4.31731C10.751 2.5609 13.249 2.5609 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38285C17.7913 4.44239 19.5576 6.2087 18.6172 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6172 16.2478C19.5576 17.7913 17.7913 19.5576 16.2478 18.6172C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6172C6.2087 19.5576 4.44239 17.7913 5.38285 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99037 8.74926 5.38285 7.75218C4.44239 6.2087 6.2087 4.44239 7.75219 5.38285ZM15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const DotsHorizontalIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M5 12H5.01M12 12H12.01M19 12H19.01M6 12C6 12.5523 5.55228 13 5 13C4.44772 13 4 12.5523 4 12C4 11.4477 4.44772 11 5 11C5.55228 11 6 11.4477 6 12ZM13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12ZM20 12C20 12.5523 19.5523 13 19 13C18.4477 13 18 12.5523 18 12C18 11.4477 18.4477 11 19 11C19.5523 11 20 11.4477 20 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const DotsVerticalIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M12 5L12 5.01M12 12L12 12.01M12 19L12 19.01M12 6C11.4477 6 11 5.55228 11 5C11 4.44772 11.4477 4 12 4C12.5523 4 13 4.44772 13 5C13 5.55228 12.5523 6 12 6ZM12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12C13 12.5523 12.5523 13 12 13ZM12 20C11.4477 20 11 19.5523 11 19C11 18.4477 11.4477 18 12 18C12.5523 18 13 18.4477 13 19C13 19.5523 12.5523 20 12 20Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16M8 12L12 16L16 12M12 16L12 4"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const DuplicateIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ExclamationCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ExclamationIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ExternalLinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M20 10V4H14M20 4L10 14"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const EyeOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M13.8749 18.8246C13.2677 18.9398 12.6411 19 12.0005 19C7.52281 19 3.73251 16.0571 2.45825 12C2.80515 10.8955 3.33851 9.87361 4.02143 8.97118M9.87868 9.87868C10.4216 9.33579 11.1716 9 12 9C13.6569 9 15 10.3431 15 12C15 12.8284 14.6642 13.5784 14.1213 14.1213M6.58916 6.58916L9.87868 9.87868L14.1213 14.1213L17.4112 17.4112M3 3L6.58916 6.58916M6.58916 6.58916C8.14898 5.58354 10.0066 5 12.0004 5C16.4781 5 20.2684 7.94291 21.5426 12C20.8357 14.2507 19.3545 16.1585 17.4112 17.4112M17.4112 17.4112L21 21"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const EyeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12ZM2.45825 12C3.73253 7.94288 7.52281 5 12.0004 5C16.4781 5 20.2684 7.94291 21.5426 12C20.2684 16.0571 16.4781 19 12.0005 19C7.52281 19 3.73251 16.0571 2.45825 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const FilterIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M10 21V14.4142C10 14.149 9.89464 13.8946 9.70711 13.7071L3.29289 7.29289C3.10536 7.10536 3 6.851 3 6.58579V4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V6.58579C21 6.851 20.8946 7.10536 20.7071 7.29289L14.2929 13.7071C14.1054 13.8946 14 14.149 14 14.4142V17L10 21Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const HeartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M4.31802 12.682C2.56066 10.9246 2.56066 8.07538 4.31802 6.31802C6.07538 4.56066 8.92462 4.56066 10.682 6.31802L12.0001 7.63609L13.318 6.31802C15.0754 4.56066 17.9246 4.56066 19.682 6.31802C21.4393 8.07538 21.4393 10.9246 19.682 12.682L12.0001 20.364L4.31802 12.682Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const InformationCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const LinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M13.8284 10.1716C12.2663 8.60948 9.73367 8.60948 8.17157 10.1716L4.17157 14.1716C2.60948 15.7337 2.60948 18.2663 4.17157 19.8284C5.73367 21.3905 8.26633 21.3905 9.82843 19.8284L10.93 18.7269M10.1716 13.8284C11.7337 15.3905 14.2663 15.3905 15.8284 13.8284L19.8284 9.82843C21.3905 8.26633 21.3905 5.73367 19.8284 4.17157C18.2663 2.60948 15.7337 2.60948 14.1716 4.17157L13.072 5.27118"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const LockClosedIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z"
      strokeWidth={2}
      strokeLinecap="round"
      stroke="currentColor"
    />
  </Icon>
);

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M11 8L7 12L11 16M7 12L21 12M16 16V17C16 18.6569 14.6569 20 13 20H6C4.34315 20 3 18.6569 3 17V7C3 5.34315 4.34315 4 6 4H13C14.6569 4 16 5.34315 16 7V8"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M4 6H20M4 12H20M4 18H20"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const MinusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M18 12H6"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const PencilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M20.2678 3.73223L20.9749 3.02513V3.02513L20.2678 3.73223ZM6.50006 21.0355V22.0355C6.76527 22.0355 7.01963 21.9301 7.20716 21.7426L6.50006 21.0355ZM3.00006 21.0355H2.00006C2.00006 21.5878 2.44777 22.0355 3.00006 22.0355V21.0355ZM3.00006 17.4644L2.29295 16.7573C2.10541 16.9448 2.00006 17.1992 2.00006 17.4644H3.00006ZM16.7322 3.73223L17.4393 4.43934C18.0251 3.85355 18.9749 3.85355 19.5607 4.43934L20.2678 3.73223L20.9749 3.02513C19.608 1.65829 17.392 1.65829 16.0251 3.02513L16.7322 3.73223ZM20.2678 3.73223L19.5607 4.43934C20.1464 5.02513 20.1464 5.97487 19.5607 6.56066L20.2678 7.26777L20.9749 7.97487C22.3417 6.60804 22.3417 4.39196 20.9749 3.02513L20.2678 3.73223ZM20.2678 7.26777L19.5607 6.56066L5.79295 20.3284L6.50006 21.0355L7.20716 21.7426L20.9749 7.97487L20.2678 7.26777ZM6.50006 21.0355V20.0355H3.00006V21.0355V22.0355H6.50006V21.0355ZM16.7322 3.73223L16.0251 3.02513L2.29295 16.7573L3.00006 17.4644L3.70716 18.1715L17.4393 4.43934L16.7322 3.73223ZM3.00006 17.4644H2.00006V21.0355H3.00006H4.00006V17.4644H3.00006ZM15.2322 5.23223L14.5251 5.93934L18.0607 9.47487L18.7678 8.76777L19.4749 8.06066L15.9393 4.52513L15.2322 5.23223Z"
      fill="currentColor"
    />
  </Icon>
);

export const PhotographIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M4 16L8.58579 11.4142C9.36683 10.6332 10.6332 10.6332 11.4142 11.4142L16 16M14 14L15.5858 12.4142C16.3668 11.6332 17.6332 11.6332 18.4142 12.4142L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const PlusCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M12 9V12M12 12V15M12 12H15M12 12H9M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M12 4V12M12 12V20M12 12H20M12 12L4 12"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const QrcodeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M13 4C13 3.44772 12.5523 3 12 3C11.4477 3 11 3.44772 11 4H12H13ZM11 5C11 5.55228 11.4477 6 12 6C12.5523 6 13 5.55228 13 5H12H11ZM18 15C17.4477 15 17 15.4477 17 16C17 16.5523 17.4477 17 18 17V16V15ZM20 17C20.5523 17 21 16.5523 21 16C21 15.4477 20.5523 15 20 15V16V17ZM12 16V15C11.4477 15 11 15.4477 11 16H12ZM14 17C14.5523 17 15 16.5523 15 16C15 15.4477 14.5523 15 14 15V16V17ZM11 20C11 20.5523 11.4477 21 12 21C12.5523 21 13 20.5523 13 20H12H11ZM13 9C13 8.44772 12.5523 8 12 8C11.4477 8 11 8.44772 11 9H12H13ZM12 12H11C11 12.5523 11.4477 13 12 13V12ZM16 19C15.4477 19 15 19.4477 15 20C15 20.5523 15.4477 21 16 21V20V19ZM20 21C20.5523 21 21 20.5523 21 20C21 19.4477 20.5523 19 20 19V20V21ZM4 11C3.44772 11 3 11.4477 3 12C3 12.5523 3.44772 13 4 13V12V11ZM8 13C8.55228 13 9 12.5523 9 12C9 11.4477 8.55228 11 8 11V12V13ZM12.01 13C12.5623 13 13.01 12.5523 13.01 12C13.01 11.4477 12.5623 11 12.01 11V12V13ZM16.01 13C16.5623 13 17.01 12.5523 17.01 12C17.01 11.4477 16.5623 11 16.01 11V12V13ZM20 11C19.4477 11 19 11.4477 19 12C19 12.5523 19.4477 13 20 13V12V11ZM20.01 13C20.5623 13 21.01 12.5523 21.01 12C21.01 11.4477 20.5623 11 20.01 11V12V13ZM5 4V5H7V4V3H5V4ZM8 5H7V7H8H9V5H8ZM7 8V7H5V8V9H7V8ZM4 7H5V5H4H3V7H4ZM5 8V7H4H3C3 8.10457 3.89543 9 5 9V8ZM8 7H7V8V9C8.10457 9 9 8.10457 9 7H8ZM7 4V5H8H9C9 3.89543 8.10457 3 7 3V4ZM5 4V3C3.89543 3 3 3.89543 3 5H4H5V4ZM17 4V5H19V4V3H17V4ZM20 5H19V7H20H21V5H20ZM19 8V7H17V8V9H19V8ZM16 7H17V5H16H15V7H16ZM17 8V7H16H15C15 8.10457 15.8954 9 17 9V8ZM20 7H19V8V9C20.1046 9 21 8.10457 21 7H20ZM19 4V5H20H21C21 3.89543 20.1046 3 19 3V4ZM17 4V3C15.8954 3 15 3.89543 15 5H16H17V4ZM5 16V17H7V16V15H5V16ZM8 17H7V19H8H9V17H8ZM7 20V19H5V20V21H7V20ZM4 19H5V17H4H3V19H4ZM5 20V19H4H3C3 20.1046 3.89543 21 5 21V20ZM8 19H7V20V21C8.10457 21 9 20.1046 9 19H8ZM7 16V17H8H9C9 15.8954 8.10457 15 7 15V16ZM5 16V15C3.89543 15 3 15.8954 3 17H4H5V16ZM12 4H11V5H12H13V4H12ZM18 16V17H20V16V15H18V16ZM12 16V17H14V16V15H12V16ZM12 16H11V20H12H13V16H12ZM12 9H11V12H12H13V9H12ZM16 20V21H20V20V19H16V20ZM4 12V13H8V12V11H4V12ZM12 12V13H12.01V12V11H12V12ZM20 12V13H20.01V12V11H20V12ZM12 12V13H16.01V12V11H12V12Z"
      fill="currentColor"
    />
  </Icon>
);

export const QuestionMarkCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M8.22766 9C8.77678 7.83481 10.2584 7 12.0001 7C14.2092 7 16.0001 8.34315 16.0001 10C16.0001 11.3994 14.7224 12.5751 12.9943 12.9066C12.4519 13.0106 12.0001 13.4477 12.0001 14M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const RefreshIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M4 4V9H4.58152M19.9381 11C19.446 7.05369 16.0796 4 12 4C8.64262 4 5.76829 6.06817 4.58152 9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.2317 17.9318 15.3574 20 12 20C7.92038 20 4.55399 16.9463 4.06189 13M19.4185 15H15"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const ShareIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M8.68387 13.3419C8.88616 12.9381 9 12.4824 9 12C9 11.5176 8.88616 11.0619 8.68387 10.6581M8.68387 13.3419C8.19134 14.3251 7.17449 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.17449 9 8.19134 9.67492 8.68387 10.6581M8.68387 13.3419L15.3161 16.6581M8.68387 10.6581L15.3161 7.34193M15.3161 7.34193C15.8087 8.32508 16.8255 9 18 9C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6C15 6.48237 15.1138 6.93815 15.3161 7.34193ZM15.3161 16.6581C15.1138 17.0619 15 17.5176 15 18C15 19.6569 16.3431 21 18 21C19.6569 21 21 19.6569 21 18C21 16.3431 19.6569 15 18 15C16.8255 15 15.8087 15.6749 15.3161 16.6581Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const SparklesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M5 3V7M3 5H7M6 17V21M4 19H8M13 3L15.2857 9.85714L21 12L15.2857 14.1429L13 21L10.7143 14.1429L5 12L10.7143 9.85714L13 3Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const StarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M8.57911 8.29149L3.66461 8.29168C2.69592 8.29172 2.29317 9.53127 3.07683 10.1007L7.05263 12.9895C7.40309 13.2441 7.54974 13.6955 7.41589 14.1075L5.8974 18.7815C5.5981 19.7028 6.65252 20.4689 7.43622 19.8995L11.4122 17.011C11.7627 16.7564 12.2373 16.7564 12.5878 17.011L16.5638 19.8995C17.3475 20.4689 18.4019 19.7028 18.1026 18.7815L16.5841 14.1075C16.4503 13.6955 16.5969 13.2441 16.9474 12.9895L20.9232 10.1007C21.7068 9.53127 21.3041 8.29172 20.3354 8.29168L15.4209 8.29149C14.9877 8.29148 14.6038 8.01254 14.4699 7.60055L12.951 2.92664C12.6517 2.00538 11.3483 2.00537 11.049 2.92664L9.53011 7.60055C9.39623 8.01254 9.01231 8.29148 8.57911 8.29149Z"
      strokeWidth={2}
      stroke="currentColor"
    />
  </Icon>
);

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M19 7H15M19 7H20M5 7H4M5 7H9M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M15 7H9"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7ZM5 21C5 17.134 8.13401 14 12 14C15.866 14 19 17.134 19 21H5Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const XCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M10 14L12 12M12 12L14 10M12 12L10 10M12 12L14 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);

export const XIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M6 18L12 12M12 12L18 6M12 12L6 6M12 12L18 18"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </Icon>
);
