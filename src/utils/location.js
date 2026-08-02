// location.js — konum etiketi yardımcıları.
// Aynı mekânı gruplamak için isimden kararlı bir anahtar üretir (Instagram tarzı
// konum sayfası bu anahtarla sorgular). Kısa isim + Türkçe normalizasyon.

export function shortPlace(name = '') {
  return String(name).split(',')[0].trim();
}

export function locationKey(name = '') {
  return shortPlace(name)
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
