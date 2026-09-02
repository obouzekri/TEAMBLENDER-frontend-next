"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Briefcase,
  ClipboardList,
  Gauge,
  GraduationCap,
  Handshake,
  Layers,
  MessageCircle,
  PlayCircle,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import LandingCmsAuditPanel from '@/components/Landing/LandingCmsAuditPanel';
import LandingHero from '@/components/Landing/LandingHero';
import LandingImpactBand from '@/components/Landing/LandingImpactBand';
import LandingSocialProof from '@/components/Landing/LandingSocialProof';
import LandingPlatformOffer from '@/components/Landing/LandingPlatformOffer';
import LandingChallengesShowcase from '@/components/Landing/LandingChallengesShowcase';
import LandingBenefitsOrbit from '@/components/Landing/LandingBenefitsOrbit';
import LandingTrustedCompanies from '@/components/Landing/LandingTrustedCompanies';
import LandingTestimonials from '@/components/Landing/LandingTestimonials';
import LandingFlowSteps from '@/components/Landing/LandingFlowSteps';
import LandingFinalCta from '@/components/Landing/LandingFinalCta';
import LandingPreviewModal from '@/components/Landing/LandingPreviewModal';
import LandingStickyCta from '@/components/Landing/LandingStickyCta';
import { resolveHeroTrustIcon, resolveUseCaseIcon, resolveFlowStepIcon } from '@/components/Landing/landingIconResolvers';
import { getApiUrl } from '@/lib/config';
import useI18n from '@/lib/i18n/useI18n';
import {
  getLocaleDefaultBlocks,
  getLandingStatic,
  hasCmsValue,
  buildLandingCmsAudit,
  mapByKey,
  buildSectionBlocks,
  safeHref,
  getChallengeExamples,
} from '@/lib/landing/landingContent';
import useLandingCtaTracking from '@/lib/landing/useLandingCtaTracking';
import useStickyCtaVisibility from '@/lib/landing/useStickyCtaVisibility';
import useBodyScrollLock from '@/lib/useBodyScrollLock';


const TRUST_TAG_ICON_BY_KEYWORD = [
  { keywords: ['rh', 'talent'], Icon: Briefcase },
  { keywords: ['manager'], Icon: Users },
  { keywords: ['facilitation', 'facilitateur'], Icon: Handshake },
  { keywords: ['onboarding'], Icon: Rocket },
  { keywords: ['formation'], Icon: GraduationCap },
  { keywords: ['coaching'], Icon: Activity },
];

const TRUST_PROOF_METRICS = [
  {
    value: '+150 équipes accompagnées',
    label: 'Grands groupes, startups, PME et équipes RH',
    detail: 'Déploiements en contexte réel avec des équipes hybrides.',
  },
  {
    value: '3× plus rapide',
    label: 'Créez une session en quelques minutes',
    detail: 'Préparation simple, animation guidée, restitution immédiate.',
  },
  {
    value: 'Hybride par nature',
    label: 'Challenges pour équipes sur site, à distance ou multi-sites',
    detail: 'Une expérience fluide quel que soit le format d’organisation.',
  },
];

const METRIC_ICON_SET = [Building2, Gauge, Layers];
const FLOW_ICON_SET = [Target, PlayCircle, BarChart3];

const TRUST_LOGO_PLACEHOLDERS = ['NovaTech', 'Helios Groupe', 'Axis Retail', 'BluePeak Conseil', 'Mosaic Industries'];

const PLATFORM_STATEMENT = {
  title: 'TeamBlender est la plateforme pour organiser des expériences de team building hybrides.',
  description:
    'Pensée pour les managers et les équipes RH, elle permet de déployer des expériences simples à organiser, engageantes pour les équipes et utiles au quotidien.',
};

const PLATFORM_OFFER_ITEMS = [
  { icon: Rocket, label: 'Créer une session en quelques clics' },
  { icon: Users, label: 'Inviter et assigner vos équipes' },
  { icon: Target, label: 'Lancer des défis collaboratifs engageants' },
  { icon: PlayCircle, label: 'Animer en temps réel' },
  { icon: Gauge, label: 'Suivre la progression en live' },
  { icon: BarChart3, label: 'Exploiter les résultats post-session' },
];

const PLATFORM_VALUES_ITEMS = [
  { icon: CheckCircle2, label: 'Déploiement rapide sans friction' },
  { icon: Sparkles, label: 'Expérience fluide pour tous les participants' },
  { icon: Layers, label: 'Formats standardisés et réutilisables' },
  { icon: Shield, label: 'Gouvernance claire des sessions et résultats' },
  { icon: Building2, label: 'Passage à l’échelle multi-équipes' },
];

const PLATFORM_BENEFITS_ITEMS = [
  { icon: Handshake, label: 'Cohésion renforcée dans les équipes hybrides' },
  { icon: MessageCircle, label: 'Meilleure communication et collaboration' },
  { icon: ClipboardList, label: 'Gain de temps pour RH et managers' },
  { icon: GraduationCap, label: 'Accélération de l’onboarding' },
  { icon: Sparkles, label: 'Expérience employeur modernisée' },
];

const USE_CASES = [
  'Programmes de cohésion managériale',
  'Onboarding collaborateurs',
  'Alignement multi-sites',
  'Événements RH',
];

function resolveTrustTagIcon(label) {
  const normalized = String(label || '').trim().toLowerCase();
  const matched = TRUST_TAG_ICON_BY_KEYWORD.find((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)));
  return matched?.Icon || ShieldCheck;
}

function TrustTag({ title, isActive = false }) {
  const Icon = resolveTrustTagIcon(title);

  return (
    <button
      type="button"
      title={`${title} utilise TeamBlender pour un objectif concret.`}
      className={`group inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 ease-out ${
        isActive
          ? 'bg-indigo-100/85 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-200'
          : 'bg-slate-50/90 hover:-translate-y-0.5 hover:bg-indigo-50/85 hover:text-slate-900 hover:shadow-sm hover:shadow-indigo-500/10'
      }`}
      aria-label={`Segment ${title}`}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-indigo-600 shadow-sm transition-colors duration-300 group-hover:bg-white">
        <Icon className="h-4 w-4" />
      </span>
      <span>{title}</span>
    </button>
  );
}

export default function HomePage() {
  const { locale, t, withLocalePath } = useI18n();
  const defaultBlocks = useMemo(() => getLocaleDefaultBlocks(locale), [locale]);
  const landingStatic = useMemo(() => getLandingStatic(locale), [locale]);
  const [dynamicBlocks, setDynamicBlocks] = useState({});
  const [landingLoaded, setLandingLoaded] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const heroSentinelRef = useRef(null);
  const isLandingCmsStrict = process.env.NEXT_PUBLIC_LANDING_CMS_STRICT === 'true';

  useEffect(() => {
    let cancelled = false;
    async function loadLandingContent() {
      try {
        const res = await fetch(getApiUrl(`/landing-content?locale=${encodeURIComponent(locale)}`));
        const payload = await res.json().catch(() => []);
        if (!res.ok) return;
        if (!cancelled) {
          setDynamicBlocks(mapByKey(payload));
        }
      } catch {
        // Keep defaults when API is unavailable.
      } finally {
        if (!cancelled) {
          setLandingLoaded(true);
        }
      }
    }

    loadLandingContent();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const heroSection = useMemo(
    () => buildSectionBlocks([
      'hero_main',
      'hero_kicker',
      'hero_cta_primary',
      'hero_cta_secondary',
      'hero_trust_1',
      'hero_trust_2',
      'hero_trust_3',
      'hero_image_a',
      'hero_image_b',
    ], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const impactSection = useMemo(
    () => buildSectionBlocks(['impact_1', 'impact_2', 'impact_3'], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const flowSection = useMemo(
    () => buildSectionBlocks(['flow_header', 'flow_step_1', 'flow_step_2', 'flow_step_3'], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const finalCtaSection = useMemo(
    () => buildSectionBlocks(['final_cta', 'final_cta_secondary'], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const partnersSection = useMemo(
    () => buildSectionBlocks([
      'partners_header',
      'partner_1',
      'partner_2',
      'partner_3',
      'partner_4',
      'partner_5',
      'partner_6',
    ], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const testimonialsSection = useMemo(
    () => buildSectionBlocks([
      'testimonials_header',
      'testimonial_1',
      'testimonial_2',
      'testimonial_3',
    ], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const heroMain = heroSection.blocks.hero_main || {};
  const heroKicker = heroSection.blocks.hero_kicker || {};
  const heroCtaPrimary = heroSection.blocks.hero_cta_primary || {};
  const heroCtaSecondary = heroSection.blocks.hero_cta_secondary || {};
  const heroImageB = heroSection.blocks.hero_image_b || {};
  const flowHeader = flowSection.blocks.flow_header || {};
  const finalCta = finalCtaSection.blocks.final_cta || {};
  const finalCtaSecondary = finalCtaSection.blocks.final_cta_secondary || {};
  const partnersHeader = partnersSection.blocks.partners_header || {};
  const testimonialsHeader = testimonialsSection.blocks.testimonials_header || {};
  const heroTitle = t('landing.heroTitle');
  const heroDescription = t('landing.heroDescription');
  const heroPrimaryLabel = landingStatic.fallback.heroPrimaryLabel;
  const heroPrimaryHref = withLocalePath(safeHref(heroCtaPrimary.cta_href, '/signup'));
  const heroSecondaryLabel = hasCmsValue(heroCtaSecondary.cta_label) ? heroCtaSecondary.cta_label : landingStatic.fallback.heroSecondaryLabel;
  const heroSecondaryHref = withLocalePath(safeHref(heroCtaSecondary.cta_href, '/pricing'));
  const finalPrimaryLabel = hasCmsValue(finalCta.cta_label) ? finalCta.cta_label : landingStatic.fallback.finalPrimaryLabel;
  const finalPrimaryHref = withLocalePath(safeHref(finalCta.cta_href, '/signup'));
  const finalSecondaryLabel = hasCmsValue(finalCtaSecondary.cta_label) ? finalCtaSecondary.cta_label : landingStatic.fallback.finalSecondaryLabel;
  const finalSecondaryHref = withLocalePath(safeHref(finalCtaSecondary.cta_href, '/contact'));

  const { handlePrimaryCtaClick, handleHeroSecondaryCtaClick, handleFinalSecondaryCtaClick } = useLandingCtaTracking({
    landingStatic,
    heroCtaPrimary,
    heroCtaSecondary,
    finalCtaSecondary,
  });

  const heroTrustItems = locale === 'en'
    ? ['Zero installation', 'Real-time participation', 'Customizable experiences']
    : ['Zéro installation', 'Participation en temps réel', 'Expériences personnalisables'];

  const heroTrustBadges = useMemo(
    () => heroTrustItems.slice(0, 3).map((title, index) => ({
      title,
      Icon: resolveHeroTrustIcon(title, index),
    })),
    [heroTrustItems]
  );

  const structuredHeroTitle = heroTitle;

  const impactItems = useMemo(
    () => ['impact_1', 'impact_2', 'impact_3'].map((key) => {
      const item = impactSection.blocks[key] || {};
      return {
        value: item.title || '',
        description: item.description || '',
      };
    }).filter((item) => item.value || item.description),
    [impactSection]
  );

  const flowSteps = useMemo(
    () => ['flow_step_1', 'flow_step_2', 'flow_step_3'].map((key) => {
      const item = flowSection.blocks[key] || {};
      return {
        index: item.badge_text || '',
        title: item.title || '',
        description: item.description || '',
      };
    }),
    [flowSection]
  );

  const partnerItems = useMemo(
    () => ['partner_1', 'partner_2', 'partner_3', 'partner_4', 'partner_5', 'partner_6'].map((key) => {
      const item = partnersSection.blocks[key] || {};
      return {
        title: item.title || '',
      };
    }).filter((item) => item.title),
    [partnersSection]
  );

  const testimonialItems = useMemo(
    () => ['testimonial_1', 'testimonial_2', 'testimonial_3'].map((key) => {
      const item = testimonialsSection.blocks[key] || {};
      const initials = String(item.title || '')
        .split(' ')
        .map((part) => String(part || '').trim().slice(0, 1).toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join('');
      return {
        title: item.title || '',
        subtitle: item.subtitle || '',
        description: item.description || '',
        initials: initials || 'TB',
      };
    }).filter((item) => item.title || item.description),
    [testimonialsSection]
  );

  const cmsAudit = useMemo(() => buildLandingCmsAudit(dynamicBlocks), [dynamicBlocks]);
  const TRUST_PROOF_METRICS = landingStatic.trustProofMetrics;
  const PLATFORM_OFFER_ITEMS = landingStatic.platformOfferItems;
  const PLATFORM_BENEFITS_ITEMS = landingStatic.platformBenefitsItems;
  const USE_CASES = landingStatic.useCases;
  const TRUSTED_COMPANIES = landingStatic.trustedCompanies;
  const useCaseChips = useMemo(
    () => USE_CASES.map((label, index) => ({
      label,
      Icon: resolveUseCaseIcon(label, index),
    })),
    [USE_CASES]
  );
  const flowStepsWithIcons = useMemo(
    () => flowSteps.map((step, index) => ({
      ...step,
      Icon: resolveFlowStepIcon(index),
    })),
    [flowSteps]
  );
  const challengeExamples = getChallengeExamples(locale);

  useEffect(() => {
    if (!isLandingCmsStrict || !landingLoaded) return;
    if (cmsAudit.missingKeys.length === 0 && cmsAudit.missingFields.length === 0) return;

    const fieldSummary = cmsAudit.missingFields
      .map((entry) => `${entry.key}: ${entry.fields.join(', ')}`)
      .join(' | ');

    console.warn(
      '[Landing CMS strict mode] Incomplete coverage detected.',
      {
        missingKeys: cmsAudit.missingKeys,
        missingFields: cmsAudit.missingFields,
        fieldSummary,
      }
    );
  }, [isLandingCmsStrict, landingLoaded, cmsAudit]);

  const showStickyCta = useStickyCtaVisibility(heroSentinelRef);

  useBodyScrollLock(isPreviewExpanded);

  useEffect(() => {
    if (!isPreviewExpanded) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsPreviewExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPreviewExpanded]);

  return (
    <>
      <TopNav />
      <main className="landing-v2">
        <LandingCmsAuditPanel locale={locale} isStrict={isLandingCmsStrict} loaded={landingLoaded} cmsAudit={cmsAudit} />

        <LandingHero
          locale={locale}
          t={t}
          heroKicker={heroKicker}
          heroMain={heroMain}
          structuredHeroTitle={structuredHeroTitle}
          heroDescription={heroDescription}
          heroPrimaryHref={heroPrimaryHref}
          onPrimaryCtaClick={handlePrimaryCtaClick}
          heroPrimaryLabel={heroPrimaryLabel}
          heroSecondaryHref={heroSecondaryHref}
          onHeroSecondaryCtaClick={handleHeroSecondaryCtaClick}
          heroSecondaryLabel={heroSecondaryLabel}
          heroTrustBadges={heroTrustBadges}
          heroImageB={heroImageB}
          fallback={landingStatic.fallback}
          onOpenPreview={() => setIsPreviewExpanded(true)}
        />

        <div ref={heroSentinelRef} className="landing-hero-sentinel" aria-hidden="true" />

        <LandingImpactBand locale={locale} impactItems={impactItems} />

        <LandingSocialProof
          locale={locale}
          partnersHeader={partnersHeader}
          useCaseChips={useCaseChips}
          trustProofMetrics={TRUST_PROOF_METRICS}
        />

        <LandingPlatformOffer fallback={landingStatic.fallback} platformOfferItems={PLATFORM_OFFER_ITEMS} />

        <LandingChallengesShowcase locale={locale} challengeExamples={challengeExamples} />

        <LandingBenefitsOrbit locale={locale} fallback={landingStatic.fallback} platformBenefitsItems={PLATFORM_BENEFITS_ITEMS} />

        <LandingTrustedCompanies locale={locale} trustedCompanies={TRUSTED_COMPANIES} />

        <LandingTestimonials locale={locale} testimonialsHeader={testimonialsHeader} testimonialItems={testimonialItems} />

        <LandingFlowSteps locale={locale} flowHeader={flowHeader} flowStepsWithIcons={flowStepsWithIcons} />

        <LandingFinalCta
          locale={locale}
          finalCta={finalCta}
          fallback={landingStatic.fallback}
          finalPrimaryHref={finalPrimaryHref}
          finalPrimaryLabel={finalPrimaryLabel}
        />

        <LandingPreviewModal
          locale={locale}
          isOpen={isPreviewExpanded}
          onClose={() => setIsPreviewExpanded(false)}
          fallback={landingStatic.fallback}
        />

        <LandingStickyCta
          locale={locale}
          isVisible={showStickyCta}
          heroPrimaryHref={heroPrimaryHref}
          onPrimaryCtaClick={handlePrimaryCtaClick}
        />
      </main>
      <Footer />
    </>
  );
}
