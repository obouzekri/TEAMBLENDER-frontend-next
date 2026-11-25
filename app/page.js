"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import LandingCmsAuditPanel from '@/components/Landing/LandingCmsAuditPanel';
import LandingHero from '@/components/Landing/LandingHero';
import LandingImpactBand from '@/components/Landing/LandingImpactBand';
import LandingPlatformOffer from '@/components/Landing/LandingPlatformOffer';
import LandingAudience from '@/components/Landing/LandingAudience';
import LandingChallengesShowcase from '@/components/Landing/LandingChallengesShowcase';
import LandingSessionOutcomes from '@/components/Landing/LandingSessionOutcomes';
import LandingFlowSteps from '@/components/Landing/LandingFlowSteps';
import LandingFinalCta from '@/components/Landing/LandingFinalCta';
import LandingFaq from '@/components/Landing/LandingFaq';
import LandingPreviewModal from '@/components/Landing/LandingPreviewModal';
import LandingStickyCta from '@/components/Landing/LandingStickyCta';
import { resolveFlowStepIcon } from '@/components/Landing/landingIconResolvers';
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
import { HOME_FAQ_BY_LOCALE } from '@/lib/teamBuildingContent';
import useLandingCtaTracking from '@/lib/landing/useLandingCtaTracking';
import useStickyCtaVisibility from '@/lib/landing/useStickyCtaVisibility';
import useBodyScrollLock from '@/lib/useBodyScrollLock';


// Landing copy is static for every locale; add a locale here to drive it from the CMS again.
const CMS_LANDING_LOCALES = new Set();

export default function HomePage() {
  const { locale, t, withLocalePath } = useI18n();
  const defaultBlocks = useMemo(() => getLocaleDefaultBlocks(locale), [locale]);
  const landingStatic = useMemo(() => getLandingStatic(locale), [locale]);
  const [dynamicBlocks, setDynamicBlocks] = useState({});
  const cmsContentBlocks = useMemo(
    () => (CMS_LANDING_LOCALES.has(locale) ? dynamicBlocks : {}),
    [dynamicBlocks, locale]
  );
  const [landingLoaded, setLandingLoaded] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const heroSentinelRef = useRef(null);
  const isLandingCmsStrict = process.env.NEXT_PUBLIC_LANDING_CMS_STRICT === 'true';

  useEffect(() => {
    let cancelled = false;
    async function loadLandingContent() {
      if (!CMS_LANDING_LOCALES.has(locale)) {
        setLandingLoaded(true);
        return;
      }

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
    ], cmsContentBlocks, defaultBlocks),
    [cmsContentBlocks, defaultBlocks]
  );

  const impactSection = useMemo(
    () => buildSectionBlocks(['impact_1', 'impact_2', 'impact_3'], cmsContentBlocks, defaultBlocks),
    [cmsContentBlocks, defaultBlocks]
  );

  const flowSection = useMemo(
    () => buildSectionBlocks(['flow_header', 'flow_step_1', 'flow_step_2', 'flow_step_3'], cmsContentBlocks, defaultBlocks),
    [cmsContentBlocks, defaultBlocks]
  );

  const finalCtaSection = useMemo(
    () => buildSectionBlocks(['final_cta', 'final_cta_secondary'], cmsContentBlocks, defaultBlocks),
    [cmsContentBlocks, defaultBlocks]
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
    ], cmsContentBlocks, defaultBlocks),
    [cmsContentBlocks, defaultBlocks]
  );

  const testimonialsSection = useMemo(
    () => buildSectionBlocks([
      'testimonials_header',
      'testimonial_1',
      'testimonial_2',
      'testimonial_3',
    ], cmsContentBlocks, defaultBlocks),
    [cmsContentBlocks, defaultBlocks]
  );

  const heroCtaPrimary = heroSection.blocks.hero_cta_primary || {};
  const heroImageB = heroSection.blocks.hero_image_b || {};
  const flowHeader = flowSection.blocks.flow_header || {};
  const finalCta = finalCtaSection.blocks.final_cta || {};
  const finalCtaSecondary = finalCtaSection.blocks.final_cta_secondary || {};
  const partnersHeader = partnersSection.blocks.partners_header || {};
  const heroTitle = t('landing.heroTitle');
  const heroDescription = t('landing.heroDescription');
  const heroPrimaryLabel = landingStatic.fallback.heroPrimaryLabel;
  const heroPrimaryHref = withLocalePath(safeHref(heroCtaPrimary.cta_href, '/signup'));
  const finalPrimaryLabel = hasCmsValue(finalCta.cta_label) ? finalCta.cta_label : landingStatic.fallback.finalPrimaryLabel;
  const finalPrimaryHref = withLocalePath(safeHref(finalCta.cta_href, '/signup'));
  const finalSecondaryLabel = hasCmsValue(finalCtaSecondary.cta_label) ? finalCtaSecondary.cta_label : landingStatic.fallback.finalSecondaryLabel;
  const finalSecondaryHref = withLocalePath(safeHref(finalCtaSecondary.cta_href, '/contact'));

  const { handlePrimaryCtaClick, handleDemoCtaClick, handleFinalSecondaryCtaClick } = useLandingCtaTracking({
    landingStatic,
    heroCtaPrimary,
    finalCtaSecondary,
  });

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

  const cmsAudit = useMemo(() => buildLandingCmsAudit(cmsContentBlocks), [cmsContentBlocks]);
  const PLATFORM_OFFER_ITEMS = landingStatic.platformOfferItems;
  const PLATFORM_BENEFITS_ITEMS = landingStatic.platformBenefitsItems;
  const postSessionOutcomes = {
    eyebrow: landingStatic.fallback.outcomesEyebrow,
    title: landingStatic.fallback.outcomesTitle,
    description: landingStatic.fallback.outcomesDescription,
    privacyNote: landingStatic.fallback.outcomesPrivacyNote,
    privacyHref: withLocalePath('/confidentialite'),
    privacyLinkLabel: landingStatic.fallback.outcomesPrivacyLinkLabel,
    items: landingStatic.postSessionOutcomes || [],
  };
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
      <main className="landing-v2 landing-v2--premium">
        {CMS_LANDING_LOCALES.has(locale) ? <LandingCmsAuditPanel locale={locale} isStrict={isLandingCmsStrict} loaded={landingLoaded} cmsAudit={cmsAudit} /> : null}

        <LandingHero
          locale={locale}
          structuredHeroTitle={structuredHeroTitle}
          heroDescription={heroDescription}
          heroEyebrow={landingStatic.fallback.heroEyebrow}
          heroMicrocopy={landingStatic.fallback.heroMicrocopy}
          heroPrimaryHref={heroPrimaryHref}
          onPrimaryCtaClick={handlePrimaryCtaClick}
          heroPrimaryLabel={heroPrimaryLabel}
          heroDemoHref={withLocalePath('/demo')}
          heroDemoLabel={landingStatic.fallback.heroDemoLabel}
          onDemoCtaClick={handleDemoCtaClick}
          heroImageB={heroImageB}
          fallback={landingStatic.fallback}
          onOpenPreview={() => setIsPreviewExpanded(true)}
        />

        <div ref={heroSentinelRef} className="landing-hero-sentinel" aria-hidden="true" />

        <LandingImpactBand locale={locale} impactItems={impactItems} />

        <LandingPlatformOffer
          fallback={landingStatic.fallback}
          platformBenefitsItems={PLATFORM_BENEFITS_ITEMS}
        />

        <LandingAudience fallback={landingStatic.fallback} />

        <LandingChallengesShowcase locale={locale} challengeExamples={challengeExamples} />

        <LandingFlowSteps locale={locale} flowHeader={flowHeader} flowStepsWithIcons={flowStepsWithIcons} />
        <LandingSessionOutcomes locale={locale} outcomesSection={postSessionOutcomes} />

        <LandingFaq
          locale={locale}
          faq={HOME_FAQ_BY_LOCALE[locale]}
          eyebrow={landingStatic.fallback.faqEyebrow}
          intro={landingStatic.fallback.faqIntro}
        />

        <LandingFinalCta
          locale={locale}
          finalCta={finalCta}
          fallback={landingStatic.fallback}
          finalPrimaryHref={finalPrimaryHref}
          finalPrimaryLabel={finalPrimaryLabel}
          finalSecondaryHref={finalSecondaryHref}
          finalSecondaryLabel={finalSecondaryLabel}
          onSecondaryCtaClick={handleFinalSecondaryCtaClick}
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
