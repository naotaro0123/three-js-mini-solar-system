export const currentIndexLabelSuffix = '365日目';

export const createCurrentIndexLabel = (index: number): HTMLDivElement => {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.top = '10px';
  div.style.left = '10px';
  div.style.padding = '2px 8px';
  div.style.borderRadius = '4px';
  div.style.backgroundColor = 'white';
  div.style.color = 'black';
  div.innerText = `${index}/${currentIndexLabelSuffix}`;
  return div;
};
