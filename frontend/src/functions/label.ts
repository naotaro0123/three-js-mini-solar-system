import { addDays, format } from 'date-fns';

export const formatCurrentIndexDate = (index: number): string => {
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const date = addDays(startDate, index);

  return format(date, 'yyyy年M月d日');
};

export const createCurrentIndexLabel = (index: number): HTMLDivElement => {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.top = '10px';
  div.style.left = '10px';
  div.style.padding = '2px 8px';
  div.style.borderRadius = '4px';
  div.style.backgroundColor = 'white';
  div.style.color = 'black';
  div.innerText = formatCurrentIndexDate(index);
  return div;
};
