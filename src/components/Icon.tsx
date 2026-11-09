// Egyetlen ikoncsalád az egész appban (lucide, 1.75 vonalvastagság).
// Emoji SOHA nem ikon — a habits.icon oszlop is ezekre a kulcsokra hivatkozik.
import {
  Activity, ArrowLeft, BedDouble, Check, ChevronLeft, ChevronRight, Circle,
  CircleAlert, Download, Droplet, Dumbbell, Flame, Footprints, Heart, House,
  ChartLine, Minus, Moon, Pause, Pencil, Pill, Plus, RotateCcw, Settings,
  Shield, Smartphone, Sparkles, Play, Trash2, TriangleAlert, Trophy, X, Timer,
  Scale, ListChecks, LogOut, Ban,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  'arrow-left': ArrowLeft,
  ban: Ban,
  'bed-double': BedDouble,
  check: Check,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  circle: Circle,
  'circle-alert': CircleAlert,
  download: Download,
  droplet: Droplet,
  dumbbell: Dumbbell,
  flame: Flame,
  footprints: Footprints,
  heart: Heart,
  house: House,
  'list-checks': ListChecks,
  'log-out': LogOut,
  minus: Minus,
  moon: Moon,
  pause: Pause,
  pencil: Pencil,
  pill: Pill,
  play: Play,
  plus: Plus,
  'rotate-ccw': RotateCcw,
  scale: Scale,
  settings: Settings,
  shield: Shield,
  smartphone: Smartphone,
  sparkles: Sparkles,
  timer: Timer,
  'trending-up': ChartLine,
  trash: Trash2,
  'triangle-alert': TriangleAlert,
  trophy: Trophy,
  x: X,
}

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: string
  size?: number
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  const Cmp = ICONS[name] ?? Circle
  return <Cmp size={size} strokeWidth={1.75} aria-hidden {...rest} />
}

export const ICON_NAMES = Object.keys(ICONS)
