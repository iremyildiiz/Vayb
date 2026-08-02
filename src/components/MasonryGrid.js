// MasonryGrid — Pinterest tarzı iki sütunlu, değişken yükseklikli ızgara.
// Ekstra kütüphane yok: en-boy oranlarını (post'ta kayıtlıysa oradan, yoksa
// Image.getSize ile) çözüp iki sütunu kümülatif yüksekliğe göre elle dengeliyoruz.

import { memo, useState, useEffect } from 'react';
import { View, Image, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Çözülen oranlar oturumda önbelleklensin (id → aspectRatio = w/h).
const aspectCache = new Map();
const DEFAULT_AR = 0.8; // 4:5 — oran bilinene kadar

const Tile = memo(function Tile({ post, aspectRatio, columnWidth, gap, radius, colors, onPressPost }) {
  return (
    <Pressable
      onPress={() => onPressPost?.(post)}
      style={{ width: columnWidth, marginBottom: gap }}
    >
      <Image
        source={{ uri: post.imageURL, cache: 'force-cache' }}
        style={{ width: columnWidth, aspectRatio, borderRadius: radius.input, backgroundColor: colors.border }}
        resizeMode="cover"
        fadeDuration={0}
      />
    </Pressable>
  );
});

export default function MasonryGrid({ posts, columnWidth, gap = 12, onPressPost }) {
  const { theme } = useTheme();
  const { colors, radius } = theme;

  const [, forceRender] = useState(0);

  useEffect(() => {
    let alive = true;
    posts.forEach((p) => {
      if (aspectCache.has(p.id)) return;
      if (p.imageWidth && p.imageHeight) {
        aspectCache.set(p.id, p.imageWidth / p.imageHeight);
      } else if (p.imageURL) {
        aspectCache.set(p.id, DEFAULT_AR); // çözülene kadar
        Image.getSize(
          p.imageURL,
          (w, h) => { if (alive && h) { aspectCache.set(p.id, w / h); forceRender((n) => n + 1); } },
          () => {},
        );
      }
    });
    return () => { alive = false; };
  }, [posts]);

  // İki sütuna, kısa olan sütuna ekleyerek dağıt.
  const cols = [[], []];
  const heights = [0, 0];
  posts.forEach((p) => {
    const ar = aspectCache.get(p.id) || DEFAULT_AR;
    const h = 1 / ar; // birim genişlik için göreli yükseklik
    const c = heights[0] <= heights[1] ? 0 : 1;
    cols[c].push(p);
    heights[c] += h;
  });

  return (
    <View style={{ flexDirection: 'row', gap }}>
      {cols.map((col, i) => (
        <View key={i} style={{ flex: 1 }}>
          {col.map((post) => (
            <Tile
              key={post.id}
              post={post}
              aspectRatio={aspectCache.get(post.id) || DEFAULT_AR}
              columnWidth={columnWidth}
              gap={gap}
              radius={radius}
              colors={colors}
              onPressPost={onPressPost}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
