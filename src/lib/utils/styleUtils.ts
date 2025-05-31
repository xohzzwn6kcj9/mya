import { textColors } from '../config/displayOptions';

export function getRandomIndex(max: number): number {
  return Math.floor(Math.random() * max);
}

export function getContrastColor(backgroundColor: string): string {
  // 배경색의 밝기를 계산
  const rgb = backgroundColor.match(/\d+/g);
  if (!rgb) return textColors[0];
  
  const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
  
  // 밝은 배경에는 어두운 색상, 어두운 배경에는 밝은 색상 선택
  const darkColors = textColors.filter(color => {
    const colorRgb = color.match(/\d+/g);
    if (!colorRgb) return false;
    const colorBrightness = (parseInt(colorRgb[0]) * 299 + parseInt(colorRgb[1]) * 587 + parseInt(colorRgb[2]) * 114) / 1000;
    return colorBrightness < 128;
  });
  
  const lightColors = textColors.filter(color => {
    const colorRgb = color.match(/\d+/g);
    if (!colorRgb) return false;
    const colorBrightness = (parseInt(colorRgb[0]) * 299 + parseInt(colorRgb[1]) * 587 + parseInt(colorRgb[2]) * 114) / 1000;
    return colorBrightness >= 128;
  });

  return brightness >= 128 ? 
    darkColors[getRandomIndex(darkColors.length)] : 
    lightColors[getRandomIndex(lightColors.length)];
} 