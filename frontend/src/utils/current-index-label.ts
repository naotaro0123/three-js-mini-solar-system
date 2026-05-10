import { addDays, format } from 'date-fns';

export const formatCurrentIndexDate = (index: number): string => {
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const date = addDays(startDate, index);

  return format(date, 'yyyy年M月d日');
};

export const createCurrentIndexLabel = (index: number): HTMLDivElement => {
  const div = document.createElement('div');
  div.className = 'current-index-label';
  div.textContent = formatCurrentIndexDate(index);
  return div;
};
