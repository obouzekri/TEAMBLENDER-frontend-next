"use client";

import { Pencil } from 'lucide-react';

// Onglet « Profil » de la page Compte : rendu seul, état et actions restent dans page.js.
export default function AccountProfilePanel({
  activeTab,
  avatarPickerOpen,
  guard,
  handleSaveProfile,
  isProfileDirty,
  me,
  profileForm,
  profileIdentityInitials,
  resolvedAvatarUrl,
  savingProfile,
  setAvatarPickerOpen,
  setProfileForm,
  t,
}) {
  return (
    <section id="account-profile" role="tabpanel" aria-labelledby="account-tab-profile" tabIndex={0} className={`account-saas-card account-panel ${activeTab === 'profile' ? 'is-active' : ''}`} hidden={activeTab !== 'profile'}>
      <header className="account-saas-card__header">
        <h2 className="account-saas-card__title">{t('account.profileTitle')}</h2>
        <p className="account-saas-card__subtitle">{t('account.profileSubtitle')}</p>
      </header>
      <div className="account-saas-card__body account-profile-layout account-panel-body--balanced">
        <aside className="account-identity-card" aria-label={t('account.changeAvatar')}>
          <div className="account-identity-avatar-wrap">
            {resolvedAvatarUrl ? (
              <img src={resolvedAvatarUrl} alt="Avatar sélectionné" className="account-identity-avatar-photo" />
            ) : (
              <span className="account-identity-avatar" aria-hidden="true">{profileIdentityInitials}</span>
            )}
            <button
              type="button"
              className="account-identity-avatar-edit"
              aria-label={t('account.changeAvatar')}
              title="JPG, PNG. Max 2MB"
              aria-haspopup="dialog"
              aria-expanded={avatarPickerOpen}
              onClick={() => setAvatarPickerOpen(true)}
            >
              <Pencil size={13} aria-hidden="true" />
            </button>
          </div>
          <span className="account-form-hint">{t('account.changeAvatar')}</span>
        </aside>

        <form className="account-profile-form" onSubmit={handleSaveProfile}>
          <section className="account-profile-group" aria-labelledby="profile-personal-information-title">
            <h3 id="profile-personal-information-title" className="account-profile-group__title">{t('account.personalInformation')}</h3>
            <div className="account-form-grid">
              <div className="account-form-field">
                <label className="account-form-label" htmlFor="account-first-name">
                  {t('account.firstName')}
                </label>
                <input id="account-first-name" className="account-form-input account-form-input--disabled" type="text" value={profileForm.first_name} disabled readOnly />
              </div>
              <div className="account-form-field">
                <label className="account-form-label" htmlFor="account-last-name">
                  {t('account.lastName')}
                </label>
                <input id="account-last-name" className="account-form-input account-form-input--disabled" type="text" value={profileForm.last_name} disabled readOnly />
              </div>
              <div className="account-form-field account-form-field--full">
                <label className="account-form-label" htmlFor="account-email">{t('account.email')}</label>
                <input id="account-email" className="account-form-input account-form-input--disabled" type="email" value={String(me?.email || guard.user?.email || '').trim()} disabled readOnly />
                <p className="account-form-hint">{t('account.emailChangeUnavailable')}</p>
              </div>
            </div>
          </section>

          <section className="account-profile-group" aria-labelledby="profile-professional-details-title">
            <h3 id="profile-professional-details-title" className="account-profile-group__title">{t('account.professionalInformation')}</h3>
            <div className="account-form-grid">
              <div className="account-form-field account-form-field--full">
                <label className="account-form-label" htmlFor="account-job-title">{t('account.jobTitle')} <span className="account-field-optional">{t('account.optional')}</span></label>
                <input
                  id="account-job-title"
                  className="account-form-input"
                  type="text"
                  value={profileForm.job_title}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, job_title: e.target.value }))}
                  placeholder={t('account.jobTitlePlaceholder')}
                />
              </div>
              <div className="account-form-field account-form-field--full">
                <label className="account-form-label" htmlFor="account-department">{t('account.department')} <span className="account-field-optional">{t('account.optional')}</span></label>
                <input
                  id="account-department"
                  className="account-form-input"
                  type="text"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder={t('account.departmentPlaceholder')}
                />
              </div>
            </div>
          </section>

          <div className="account-profile-form-actions">
            <button type="submit" className="btn-primary account-save-profile-btn" disabled={savingProfile || !isProfileDirty}>
              {savingProfile ? t('account.savingProfile') : t('account.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
