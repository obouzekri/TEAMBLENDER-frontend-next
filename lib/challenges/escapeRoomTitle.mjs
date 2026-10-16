export function resolveEscapeRoomTitle(configuredTitle, fallbackTitle) {
  const title = String(configuredTitle || '').trim();
  const normalized = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isOriginalTitle = normalized === 'salle secrete' || normalized === 'secret room';
  return title && !isOriginalTitle ? title : fallbackTitle;
}
