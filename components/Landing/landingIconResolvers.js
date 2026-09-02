import {
  BarChart3,
  Briefcase,
  Building2,
  Gauge,
  GraduationCap,
  Handshake,
  Layers,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

const METRIC_ICON_SET = [Building2, Gauge, Layers];
const FLOW_ICON_SET = [Target, PlayCircle, BarChart3];

export function resolveHeroTrustIcon(title, index = 0) {
  const low = String(title || '').toLowerCase();
  if (/rapid|vite|quick|faster|speed|temps|setup/.test(low)) return Gauge;
  if (/live|sync|synchron|temps reel|real time|challenge/.test(low)) return PlayCircle;
  if (/result|insight|mesur|impact|outcome/.test(low)) return BarChart3;
  if (/hybrid|distance|remote|multi/.test(low)) return Layers;
  return METRIC_ICON_SET[index % METRIC_ICON_SET.length] || ShieldCheck;
}

export function resolveUseCaseIcon(label, index = 0) {
  const low = String(label || '').toLowerCase();
  if (/onboarding|integration|learn|formation/.test(low)) return GraduationCap;
  if (/rh|hr|talent|people/.test(low)) return Briefcase;
  if (/multi|site/.test(low)) return Building2;
  if (/cohes|cohesion|team/.test(low)) return Handshake;
  if (/manager/.test(low)) return Users;
  return FLOW_ICON_SET[index % FLOW_ICON_SET.length] || Target;
}

export function resolveMetricIcon(index = 0) {
  return METRIC_ICON_SET[index % METRIC_ICON_SET.length] || Sparkles;
}

export function resolveFlowStepIcon(index = 0) {
  return FLOW_ICON_SET[index % FLOW_ICON_SET.length] || PlayCircle;
}
