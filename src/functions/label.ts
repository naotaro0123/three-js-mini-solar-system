export const formatCurrentIndexDate = (index: number): string => {
  const currentYear = new Date().getFullYear();
  const date = new Date(currentYear, 0, 1);
  date.setDate(date.getDate() + index);

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
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
