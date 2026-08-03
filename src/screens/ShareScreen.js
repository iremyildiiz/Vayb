// ShareScreen — Instagram tarzı, galeri-öncelikli iki adımlı paylaşım akışı.
// Üst: büyük önizleme (+ anlık çekim için kamera). Orta: cihaz galerisinden kendi
// çizdiğimiz 3'lü ızgara (expo-media-library, sistem seçici DEĞİL). İkinci adım:
// minimal not + opsiyonel konum chip'i + gün batımı gradyanlı "Paylaş".

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';
import Screen from '../components/Screen';
import GradientButton from '../components/GradientButton';
import { useTheme } from '../context/ThemeContext';
import { createPost } from '../services/posts';
import { functions } from '../services/firebase';

const PAGE = 60;
const CROP_OPTIONS = [
  { key: 'free', label: 'Serbest', icon: 'crop-outline', aspect: null },
  { key: 'square', label: '1:1', icon: 'square-outline', aspect: [1, 1] },
  { key: 'portrait', label: '4:5', icon: 'phone-portrait-outline', aspect: [4, 5] },
  { key: 'pin', label: '2:3', icon: 'image-outline', aspect: [2, 3] },
  { key: 'classic', label: '4:3', icon: 'camera-outline', aspect: [4, 3] },
  { key: 'wide', label: '16:9', icon: 'tablet-landscape-outline', aspect: [16, 9] },
  { key: 'story', label: '9:16', icon: 'phone-portrait-outline', aspect: [9, 16] },
];

const LOCATION_SUGGESTIONS = [
  { name: 'Kapadokya, Nevşehir', aliases: ['cappadocia', 'kapadokya', 'nevsehir ca', 'nevşehir ca', 'goreme', 'göreme', 'urgup', 'ürgüp'] },
  { name: 'Göreme, Nevşehir', aliases: ['goreme', 'göreme', 'nevsehir goreme', 'nevşehir göreme'] },
  { name: 'Ürgüp, Nevşehir', aliases: ['urgup', 'ürgüp', 'nevsehir urgup', 'nevşehir ürgüp'] },
  { name: 'Uçhisar, Nevşehir', aliases: ['uchisar', 'uçhisar', 'nevsehir uchisar', 'nevşehir uçhisar'] },
  { name: 'Avanos, Nevşehir', aliases: ['avanos', 'nevsehir avanos', 'nevşehir avanos'] },
  { name: 'Kadıköy, İstanbul', aliases: ['kadikoy', 'kadıköy', 'istanbul kadikoy', 'istanbul kadıköy'] },
  { name: 'Karaköy, İstanbul', aliases: ['karakoy', 'karaköy', 'istanbul karakoy', 'istanbul karaköy'] },
  { name: 'Beşiktaş, İstanbul', aliases: ['besiktas', 'beşiktaş', 'istanbul besiktas', 'istanbul beşiktaş'] },
  { name: 'Alaçatı, İzmir', aliases: ['alacati', 'alaçatı', 'izmir alacati', 'izmir alaçatı'] },
  { name: 'Kaş, Antalya', aliases: ['kas', 'kaş', 'antalya kas', 'antalya kaş'] },
  { name: 'Cunda, Balıkesir', aliases: ['cunda', 'balikesir cunda', 'balıkesir cunda'] },
];

const normalizeLocationQuery = (value = '') =>
  value
    .toLocaleLowerCase('tr-TR')
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();

const getLocationSuggestions = (query) => {
  const normalized = normalizeLocationQuery(query);
  if (normalized.length < 2) return [];
  return LOCATION_SUGGESTIONS
    .filter((item) => {
      const haystack = [item.name, ...item.aliases].map(normalizeLocationQuery).join(' ');
      return haystack.includes(normalized) || normalized.split(' ').every((part) => haystack.includes(part));
    })
    .slice(0, 4);
};

// ph:// → file:// çözümlerini önbellekte tut (aynı kareyi iki kez çözme).
const localUriCache = new Map();

// --- Izgara öğesi (memo — seçim değişince tüm ızgara yeniden çizilmesin) ---
const GridItem = memo(function GridItem({ asset, size, selected, accent, surface, onPress }) {
  const cached = asset.uri?.startsWith('file') ? asset.uri : localUriCache.get(asset.id);
  const [displayUri, setDisplayUri] = useState(cached || null);

  useEffect(() => {
    let alive = true;
    if (displayUri) return;
    (async () => {
      try {
        // iCloud indirme YOK; sadece yereldeki dosya yolunu al (hızlı).
        const info = await MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: false });
        const f = info.localUri && info.localUri.startsWith('file') ? info.localUri : null;
        if (f) localUriCache.set(asset.id, f);
        if (alive && f) setDisplayUri(f);
      } catch (e) {
        /* çözülemeyen kareyi boş göster */
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id]);

  return (
    <Pressable onPress={() => onPress(asset)} style={{ width: size, height: size, padding: 1 }}>
      {displayUri ? (
        <Image source={{ uri: displayUri }} style={{ flex: 1, borderRadius: 3 }} />
      ) : (
        <View style={{ flex: 1, borderRadius: 3, backgroundColor: surface }} />
      )}
      {selected ? (
        <View
          style={{
            position: 'absolute',
            top: 1,
            left: 1,
            right: 1,
            bottom: 1,
            borderRadius: 3,
            borderWidth: 2.5,
            borderColor: accent,
            backgroundColor: 'rgba(255,126,75,0.18)',
            alignItems: 'flex-end',
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color={accent} style={{ margin: 4 }} />
        </View>
      ) : null}
    </Pressable>
  );
});

export default function ShareScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius } = theme;
  const { width: screenW, height: screenH } = useWindowDimensions();

  const previewH = Math.round(screenH * 0.4);
  const itemSize = Math.floor(screenW / 3);

  const [perm, requestPerm] = MediaLibrary.usePermissions();
  const [assets, setAssets] = useState([]);
  const [endCursor, setEndCursor] = useState(null);
  const [hasNext, setHasNext] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null); // null = Tüm Fotoğraflar
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false);

  const [selected, setSelected] = useState(null); // { id, uri, width, height, localUri, raw }
  const [caption, setCaption] = useState('');
  const [locationName, setLocationName] = useState('');
  const [showLoc, setShowLoc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropKey, setCropKey] = useState('free');
  const [step, setStep] = useState('select');
  const [locationPicked, setLocationPicked] = useState(false);
  const [locSuggestions, setLocSuggestions] = useState([]);
  const placesSession = useRef(Math.random().toString(36).slice(2) + Date.now().toString(36));

  // Konum yazarken Google Places (New) önerilerini backend callable'dan al (debounce).
  useEffect(() => {
    if (locationPicked) { setLocSuggestions([]); return undefined; }
    const q = locationName.trim();
    if (q.length < 2) { setLocSuggestions([]); return undefined; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const call = httpsCallable(functions, 'placesAutocomplete');
        const res = await call({ input: q, sessionToken: placesSession.current });
        const list = (res?.data?.suggestions || []).map((s) => ({ name: s.text, secondary: s.secondary, placeId: s.placeId }));
        if (alive) setLocSuggestions(list);
      } catch (e) {
        console.warn('[places] autocomplete hata:', e?.code, e?.message, e?.details);
        if (alive) setLocSuggestions([]);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [locationName, locationPicked]);

  const setPickedImage = (asset, idPrefix = 'pick') => {
    setSelected({
      id: `${idPrefix}-${Date.now()}`,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      localUri: asset.uri,
      raw: null,
    });
    setCropKey('free');
  };

  // İlk sayfa (izin verilince)
  useEffect(() => {
    if (perm?.granted) loadAssets(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perm?.granted, selectedAlbum]);

  // Galeri albümlerini yükle (Son Eklenenler, Ekran Görüntüleri, özel albümler...).
  useEffect(() => {
    if (!perm?.granted) return;
    MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true })
      .then((list) => setAlbums((list || []).filter((a) => (a.assetCount || 0) > 0)))
      .catch(() => {});
  }, [perm?.granted]);

  const loadAssets = useCallback(
    async (reset = false) => {
      if (loadingMore) return;
      if (!reset && !hasNext) return;
      setLoadingMore(true);
      try {
        const res = await MediaLibrary.getAssetsAsync({
          first: PAGE,
          after: reset ? undefined : endCursor,
          mediaType: ['photo'],
          sortBy: [['creationTime', false]], // en yeni önce
          ...(selectedAlbum ? { album: selectedAlbum.id } : {}), // seçili albüm (yoksa tümü)
        });
        setAssets((prev) => (reset ? res.assets : [...prev, ...res.assets]));
        setEndCursor(res.endCursor);
        setHasNext(res.hasNextPage);
        // ilk kare otomatik seçili gelsin (davetkâr önizleme)
        if (reset && res.assets.length && !selected) selectAsset(res.assets[0]);
      } catch (e) {
        // sessiz geç
      } finally {
        setLoadingMore(false);
      }
    },
    [endCursor, hasNext, loadingMore, selected, selectedAlbum],
  );

  // Bir kareyi seç: önizlemeyi hemen göster, yükleme için localUri'yi çöz.
  const selectAsset = useCallback(async (asset) => {
    const isFile = asset.uri?.startsWith('file');
    setSelected({
      id: asset.id,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      localUri: isFile ? asset.uri : null,
      raw: asset,
    });
    setCropKey('free');
    if (!isFile) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        // Yalnızca gerçek dosya yolunu (file://) sakla; ph:// yüklemeye gitmesin.
        const fileUri = info.localUri && info.localUri.startsWith('file') ? info.localUri : null;
        setSelected((s) => (s && s.id === asset.id ? { ...s, localUri: fileUri } : s));
      } catch (e) {
        /* localUri paylaşımda tekrar denenecek */
      }
    }
  }, []);

  // Anlık çekim (kamera)
  const takePhoto = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      Alert.alert('Kamera izni gerekli', 'Anlık çekim için Ayarlar’dan Vayb’e kamera erişimi ver.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets?.length) {
      setPickedImage(res.assets[0], 'cam');
    }
  };

  const reset = () => {
    setSelected(null);
    setCaption('');
    setLocationName('');
    setShowLoc(false);
    setCropKey('free');
    setStep('select');
    setLocationPicked(false);
    if (perm?.granted) loadAssets(true);
  };

  // Native kırpıcı: seçili foto için Apple kesme editörü (kaydır + yakınlaştır + oran).
  const openCrop = useCallback(async (option) => {
    if (!selected) return;
    try {
      let path = selected.localUri;
      if ((!path || !path.startsWith('file')) && selected.raw) {
        const info = await MediaLibrary.getAssetInfoAsync(selected.raw);
        path = info.localUri;
      }
      if (!path || !path.startsWith('file')) {
        Alert.alert('Fotoğraf hazırlanamadı', 'Fotoğraf iCloud’da olabilir; indirilmesini bekleyip tekrar dene.');
        return;
      }
      const opts = {
        path,
        cropping: true,
        freeStyleCropEnabled: !option.aspect, // Serbest: serbest kes; oranlı: kilitli
        mediaType: 'photo',
        compressImageQuality: 0.92,
        cropperToolbarTitle: 'Kırp',
        cropperActiveWidgetColor: '#FF7A5C',
        cropperChooseColor: '#FF7A5C',
      };
      if (option.aspect) {
        const [aw, ah] = option.aspect;
        const s = 1440 / Math.max(aw, ah);
        opts.width = Math.round(aw * s);
        opts.height = Math.round(ah * s);
      }
      const img = await ImageCropPicker.openCropper(opts);
      // react-native-image-crop-picker iOS'ta 'file://' önekSİZ mutlak yol dönebilir
      // (/private/var/...). Hem <Image> hem upload (XHR/blob) 'file://' ister → normalize.
      const croppedUri = img.path.startsWith('file') ? img.path : `file://${img.path}`;
      setSelected((prev) => (prev ? {
        ...prev,
        uri: croppedUri,
        localUri: croppedUri,
        width: img.width,
        height: img.height,
        raw: null, // artık kırpılmış dosya
      } : prev));
      setCropKey(option.key);
    } catch (e) {
      if (e?.code !== 'E_PICKER_CANCELLED') {
        console.warn('[crop] kırpılamadı:', e?.code || e?.message);
      }
    }
  }, [selected]);

  const handleShare = async () => {
    if (!selected || uploading) return;
    setUploading(true);
    try {
      let uploadUri = selected.localUri;
      // Henüz file:// yolumuz yoksa şimdi çöz (ph:// fetch'e gitmemeli).
      if ((!uploadUri || !uploadUri.startsWith('file')) && selected.raw) {
        const info = await MediaLibrary.getAssetInfoAsync(selected.raw);
        uploadUri = info.localUri;
      }
      if (!uploadUri || !uploadUri.startsWith('file')) {
        throw new Error('Fotoğraf hazırlanamadı. (Fotoğraf iCloud’da olabilir — indirilmesini bekleyip tekrar dene.)');
      }
      // Görsel kırpıldıysa selected.width/height kırpılmış boyuttur; yoksa orijinal.
      await createPost({ uri: uploadUri, caption, locationName, width: selected.width, height: selected.height });
      // Paylaşım sonrası profile yönlendir (yeni an orada görünür).
      reset();
      navigation.navigate('Main', { screen: 'Profile' });
    } catch (e) {
      // Gerçek sebebi çıkar: StorageError'ın sunucu yanıtı
      const serverResponse =
        e?.customData?.serverResponse || e?.serverResponse || e?.customData_?.serverResponse || '';
      console.warn('=== PAYLAŞIM HATASI ===');
      console.warn('code:', e?.code);
      console.warn('message:', e?.message);
      console.warn('serverResponse:', serverResponse);
      console.warn('status:', e?.status_ ?? e?.customData?.httpErrorCode?.status ?? '');
      const detay = serverResponse ? '\n\nSunucu yanıtı:\n' + String(serverResponse).slice(0, 400) : '';
      Alert.alert('Paylaşılamadı', firebaseHata(e) + detay);
    } finally {
      setUploading(false);
    }
  };

  // ---------- İzin yoksa ----------
  const renderPermission = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
      <Ionicons name="images-outline" size={40} color={colors.textMuted} />
      <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' }}>
        Galerini burada göster
      </Text>
      <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, textAlign: 'center' }}>
        Karelerini uygulama içinde seçebilmen için galeri erişimi gerekiyor.
      </Text>
      <View style={{ width: 220 }}>
        <GradientButton label="Galeriye eriş" onPress={requestPerm} />
      </View>
    </View>
  );

  const activeCrop = CROP_OPTIONS.find((o) => o.key === cropKey) || CROP_OPTIONS[0];
  const selectedRatio = selected?.width && selected?.height ? selected.width / selected.height : 4 / 5;
  const previewRatio = activeCrop.aspect ? activeCrop.aspect[0] / activeCrop.aspect[1] : selectedRatio;
  const frameHByWidth = screenW / previewRatio;
  const previewFrame =
    frameHByWidth <= previewH
      ? { width: screenW, height: frameHByWidth }
      : { width: previewH * previewRatio, height: previewH };
  const detailMaxW = Math.min(screenW - spacing.xl * 2, 420);
  const detailMaxH = screenH * 0.42;
  const detailFrameHByWidth = detailMaxW / previewRatio;
  const detailPreviewFrame =
    detailFrameHByWidth <= detailMaxH
      ? { width: detailMaxW, height: detailFrameHByWidth }
      : { width: detailMaxH * previewRatio, height: detailMaxH };
  const locationSuggestions = locationPicked ? [] : locSuggestions;

  if (step === 'details') {
    return (
      <Screen padded={false}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              height: 54,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: colors.bg,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
            }}
          >
            <Pressable
              onPress={() => setStep('select')}
              style={{ width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
              Anını tamamla
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xl,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              {selected?.localUri ? (
                <View style={{ ...detailPreviewFrame, backgroundColor: colors.border, overflow: 'hidden', borderRadius: radius.input }}>
                  <Image source={{ uri: selected.localUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ) : (
                <View style={{ ...detailPreviewFrame, backgroundColor: colors.surface, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              )}
            </View>

            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Bir şeyler yaz..."
              placeholderTextColor={colors.textMuted}
              maxLength={300}
              multiline
              style={{
                minHeight: 92,
                textAlignVertical: 'top',
                fontFamily: typography.fontBody,
                fontSize: typography.size.body,
                color: colors.textPrimary,
                paddingVertical: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            />

            {showLoc || locationName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.lg }}>
                <Ionicons name="location-outline" size={17} color={colors.accent} />
                <TextInput
                  value={locationName}
                  onChangeText={(text) => {
                    setLocationName(text);
                    setLocationPicked(false);
                  }}
                  placeholder="Neredesin?"
                  placeholderTextColor={colors.textMuted}
                  autoFocus={showLoc && !locationName}
                  style={{
                    flex: 1,
                    marginLeft: spacing.xs,
                    fontFamily: typography.fontBody,
                    fontSize: typography.size.footnote,
                    color: colors.textPrimary,
                    paddingVertical: spacing.sm,
                  }}
                />
                <Pressable onPress={() => { setLocationName(''); setShowLoc(false); setLocationPicked(false); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowLoc(true)}
                style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: spacing.md, marginBottom: spacing.lg }}
                hitSlop={8}
              >
                <Ionicons name="location-outline" size={17} color={colors.textMuted} />
                <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginLeft: 5 }}>
                  Konum ekle
                </Text>
              </Pressable>
            )}

            {locationSuggestions.length ? (
              <View style={{ marginTop: -spacing.sm, marginBottom: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
                {locationSuggestions.map((item) => (
                  <Pressable
                    key={item.placeId || item.name}
                    onPress={() => {
                      setLocationName(item.name);
                      setLocationPicked(true);
                      setShowLoc(true);
                      setLocSuggestions([]);
                      placesSession.current = Math.random().toString(36).slice(2) + Date.now().toString(36);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}
                    hitSlop={4}
                  >
                    <Ionicons name="navigate-outline" size={15} color={colors.textMuted} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text numberOfLines={1} style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textPrimary }}>
                        {item.name}
                      </Text>
                      {item.secondary ? (
                        <Text numberOfLines={1} style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: 1 }}>
                          {item.secondary}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <GradientButton
              label={uploading ? 'Yükleniyor…' : 'Paylaş'}
              onPress={handleShare}
              loading={uploading}
              disabled={!selected}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  // ---------- Ana ekran ----------
  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* --- Üst: büyük önizleme --- */}
        <View style={{ height: previewH, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          {selected && selected.localUri ? (
            // Büyük önizlemede yalnızca file:// göster (ph:// bu ekranda hata veriyor).
            <View style={{ ...previewFrame, backgroundColor: colors.border, overflow: 'hidden' }}>
              <Image source={{ uri: selected.localUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : selected ? (
            // localUri çözülene kadar kısa bir bekleme
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={44} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, marginTop: spacing.sm }}>
                Paylaşmak için bir kare seç
              </Text>
            </View>
          )}

          {/* anlık çekim butonu (sağ üst) */}
          <Pressable
            onPress={takePhoto}
            style={{
              position: 'absolute',
              top: spacing.md,
              right: spacing.md,
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={8}
          >
            <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
          </Pressable>

          {/* kırparak seçim — sistem crop editörü */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}
            style={{
              position: 'absolute',
              left: spacing.md,
              right: spacing.md,
              bottom: spacing.md,
            }}
          >
            {CROP_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => openCrop(option)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: cropKey === option.key ? 'rgba(255,122,92,0.92)' : 'rgba(0,0,0,0.38)',
                  borderWidth: 1,
                  borderColor: cropKey === option.key ? 'rgba(255,255,255,0.45)' : 'transparent',
                  borderRadius: radius.pill,
                  paddingVertical: 7,
                  paddingHorizontal: spacing.md,
                }}
                hitSlop={6}
              >
                <Ionicons name={option.icon} size={15} color="#FFFFFF" />
                <Text style={{ marginLeft: 5, fontFamily: typography.fontBodyMedium, fontSize: typography.size.caption, color: '#FFFFFF' }}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* --- Orta: galeri ızgarası --- */}
        <View style={{ flex: 1 }}>
          {!perm ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : !perm.granted ? (
            renderPermission()
          ) : (
            <>
            <Pressable
              onPress={() => setAlbumPickerOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
              hitSlop={6}
            >
              <Ionicons name="albums-outline" size={15} color={colors.textMuted} />
              <Text style={{ marginLeft: 6, fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textPrimary }}>
                {selectedAlbum ? selectedAlbum.title : 'Tüm Fotoğraflar'}
              </Text>
              <Ionicons name="chevron-down" size={15} color={colors.textMuted} style={{ marginLeft: 4 }} />
            </Pressable>
            <FlatList
              data={assets}
              keyExtractor={(item) => item.id}
              numColumns={3}
              extraData={selected?.id}
              initialNumToRender={PAGE}
              windowSize={7}
              removeClippedSubviews
              onEndReachedThreshold={0.6}
              onEndReached={() => loadAssets(false)}
              renderItem={({ item }) => (
                <GridItem
                  asset={item}
                  size={itemSize}
                  selected={selected?.id === item.id}
                  accent={colors.accent}
                  surface={colors.surface}
                  onPress={selectAsset}
                />
              )}
              ListFooterComponent={
                loadingMore && assets.length ? (
                  <View style={{ paddingVertical: spacing.lg }}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                ) : null
              }
            />
            </>
          )}
        </View>

        {/* --- Alt: ilerle --- */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
          }}
        >
          <GradientButton
            label="İlerle"
            onPress={() => setStep('details')}
            disabled={!selected}
          />
        </View>

        {/* Albüm seçme sayfası */}
        <Modal visible={albumPickerOpen} transparent animationType="slide" onRequestClose={() => setAlbumPickerOpen(false)}>
          <Pressable onPress={() => setAlbumPickerOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
            <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.input, borderTopRightRadius: radius.input, paddingTop: spacing.md, paddingBottom: spacing.xl, maxHeight: '70%' }}>
              <View style={{ width: 36, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md }} />
              <Text style={{ fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary, paddingHorizontal: spacing.xl, marginBottom: spacing.sm }}>
                Albüm seç
              </Text>
              <ScrollView>
                {[{ id: null, title: 'Tüm Fotoğraflar', assetCount: 0 }, ...albums].map((al) => {
                  const active = (al.id || null) === (selectedAlbum?.id || null);
                  return (
                    <Pressable
                      key={al.id || 'all'}
                      onPress={() => { setSelectedAlbum(al.id ? al : null); setAlbumPickerOpen(false); }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl }}
                    >
                      <Ionicons name={al.id ? 'folder-outline' : 'images-outline'} size={18} color={active ? colors.accent : colors.textMuted} />
                      <Text style={{ flex: 1, marginLeft: spacing.md, fontFamily: typography.fontBody, fontSize: typography.size.body, color: active ? colors.accent : colors.textPrimary }}>
                        {al.title}{al.assetCount ? `  ·  ${al.assetCount}` : ''}
                      </Text>
                      {active ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// Storage/Firestore hatalarını kısa Türkçe mesaja çevir.
function firebaseHata(e) {
  const code = e?.code || '';
  if (code.includes('unauthorized') || code.includes('permission-denied'))
    return 'İzin reddedildi. Firebase Storage kurallarını kontrol et.\n\n(kod: ' + code + ')';
  if (code.includes('storage/unknown') || code.includes('retry-limit'))
    return 'Yükleme başarısız. Firebase Storage açık mı, internet var mı?\n\n(kod: ' + code + ')';
  if (code.includes('storage/no-default-bucket') || code.includes('bucket'))
    return 'Storage kovası bulunamadı — Firebase’de Storage’ı açman gerekiyor.\n\n(kod: ' + code + ')';
  if (code.includes('network')) return 'Ağ hatası. Bağlantını kontrol et.\n\n(kod: ' + code + ')';
  return (e?.message || 'Bir şeyler ters gitti.') + (code ? '\n\n(kod: ' + code + ')' : '');
}
