import { addDays, format } from 'date-fns';

export const formatCurrentIndexDate = (index: number): string => {
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const date = addDays(startDate, index);

  return format(date, 'yyyy年MM月dd日');
};

export const createCurrentIndexLabel = (
  index: number,
  zoomDistance: string,
): HTMLDivElement => {
  const div = document.createElement('div');
  div.className = 'current-index-label';
  div.setAttribute('aria-live', 'polite');

  const dateChip = document.createElement('div');
  dateChip.className = 'current-index-label__chip current-index-label__chip--date';

  const dateCaption = document.createElement('span');
  dateCaption.className = 'current-index-label__caption';
  dateCaption.textContent = '現在日付';

  const value = document.createElement('span');
  value.className = 'current-index-label__value';
  value.textContent = formatCurrentIndexDate(index);

  dateChip.append(dateCaption, value);

  const zoomChip = document.createElement('div');
  zoomChip.className = 'current-index-label__chip current-index-label__chip--zoom';

  const zoomCaption = document.createElement('span');
  zoomCaption.className = 'current-index-label__caption';
  zoomCaption.textContent = 'ズーム距離';

  const zoom = document.createElement('span');
  zoom.className = 'current-index-label__zoom';
  zoom.textContent = `Zoom ${zoomDistance}`;

  zoomChip.append(zoomCaption, zoom);
  div.append(dateChip, zoomChip);
  return div;
};

export const updateCurrentIndexLabel = (label: HTMLDivElement, index: number): void => {
  const value = label.querySelector('.current-index-label__value');
  if (!value) return;

  value.textContent = formatCurrentIndexDate(index);
};

export const updateCurrentIndexZoomLabel = (
  label: HTMLDivElement,
  zoomDistance: string,
): void => {
  const zoom = label.querySelector('.current-index-label__zoom');
  if (!zoom) return;

  zoom.textContent = `Zoom ${zoomDistance}`;
};
