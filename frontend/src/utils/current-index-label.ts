import { addDays, format } from 'date-fns';

export const formatCurrentIndexDate = (index: number): string => {
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const date = addDays(startDate, index);

  return format(date, 'yyyy年MM月dd日');
};

export const createCurrentIndexLabel = (index: number): HTMLDivElement => {
  const div = document.createElement('div');
  div.className = 'current-index-label';
  div.setAttribute('aria-live', 'polite');

  const caption = document.createElement('span');
  caption.className = 'current-index-label__caption';
  caption.textContent = '現在日付';

  const value = document.createElement('span');
  value.className = 'current-index-label__value';
  value.textContent = formatCurrentIndexDate(index);

  div.append(caption, value);
  return div;
};

export const updateCurrentIndexLabel = (label: HTMLDivElement, index: number): void => {
  const value = label.querySelector('.current-index-label__value');
  if (!value) return;

  value.textContent = formatCurrentIndexDate(index);
};
