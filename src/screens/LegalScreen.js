// LegalScreen — yasal metin ekranı (Gizlilik Politikası / Kullanım Koşulları).
// route.params.kind: 'privacy' | 'terms'. Şimdilik kısa placeholder metin.

import { ScrollView, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../context/ThemeContext';

const LEGAL_DATE = '1 Ağustos 2026';
const DEV_NAME = 'İrem Yıldız';
const SUPPORT_EMAIL = 'dev.irem@icloud.com';

const DOCS = {
  privacy: {
    title: 'Gizlilik Politikası',
    intro: `Vayb ("uygulama"), ${DEV_NAME} tarafından sunulur. Bu metin, uygulamayı kullanırken hangi verileri işlediğimizi açıklar. Sürüm 1.0 · ${LEGAL_DATE}`,
    sections: [
      ['Sen sağlarsın', 'Hesap: e-posta adresi (giriş ve kurtarma için) ve şifre. Şifre Firebase Authentication ile yönetilir; düz metin şifreni görmez/saklamayız. E-posta diğer kullanıcılara gösterilmez. Profil: kullanıcı adı, görünen ad, biyografi, profil fotoğrafı, gizli/açık tercihi. İçerik: fotoğraflar, not metni ve isteğe bağlı konum etiketi. Etkileşimler: parıltı, kısa tepkiler, kaydettiklerin, takip ilişkileri. Mesajlar: birebir sohbet içerikleri. Moderasyon: engelleme ve şikayet kayıtların. Yasal onay: koşulları kabul zamanın ve sürümü.'],
      ['Konum', 'Konum etiketi senin YAZDIĞIN metindir. Uygulama cihazının GPS/konum servisini KULLANMAZ, konum izni istemez.'],
      ['Otomatik/teknik', 'Zaman damgaları, uygulama içi bildirim kayıtları. Altyapımız (Firebase) hizmeti çalıştırırken bağlantı/teknik veriler (ör. IP) işleyebilir; sunucu işlevleri kullanıcı adıyla girişte ve konum önerisinde gerekli veriyi geçici işler.'],
      ['Neden işleriz', 'Hesabını oluşturmak/güvence altına almak, paylaşımlarını göstermek, mesajlaşmayı sağlamak, kötüye kullanımı önlemek (engelleme/şikayet), konum önerisi sunmak ve uygulamayı çalıştırmak için.'],
      ['Üçüncü taraflar', 'Google Firebase (Authentication, Firestore, Storage, Cloud Functions): barındırma altyapısı. Google Places: konum etiketi yazarken yazdığın metin öneri için Google’a gönderilir. Verilerini SATMAYIZ. Bazı sunucu işlevlerimiz ABD’de çalışır; ilgili veriler işlenirken yurt dışına aktarılabilir.'],
      ['Saklama ve silme', 'Hesabını uygulama içinden silebilirsin (Ayarlar → Hesabı sil): giriş bilgileri, profil, gönderiler, yüklediğin fotoğraflar ve etkileşim/engel kayıtları kaldırılır. Not: birebir mesaj geçmişi karşı taraftaki kopyada kalabilir. Şikayet kayıtları güvenlik amacıyla makul süre saklanabilir.'],
      ['İzinler', 'Fotoğraf paylaşmak için galeri ve isteğe bağlı çekim için kamera izni isteriz; yalnızca senin seçtiğin kareler için. Konum izni istemeyiz.'],
      ['Çocuklar', `Uygulama küçük yaştaki kullanıcılar için tasarlanmamıştır. Uygunsuz bir hesabı ${SUPPORT_EMAIL} ile bildir.`],
      ['Haklar ve iletişim', `Verilerine erişmek, düzeltmek (Profili düzenle) veya silmek (Hesabı sil) için uygulamayı kullanabilir ya da ${SUPPORT_EMAIL} ile iletişime geçebilirsin.`],
      ['Değişiklikler', 'Bu politikayı güncelleyebiliriz; önemli değişikliklerde uygulama içinde bilgilendiririz ve sürüm numarasını güncelleriz.'],
    ],
  },
  terms: {
    title: 'Kullanım Koşulları',
    intro: `Vayb’i kullanarak bu koşulları kabul edersin. Sürüm 1.0 · ${LEGAL_DATE}`,
    sections: [
      ['Kabul ve uygunluk', 'Kabul etmiyorsan uygulamayı kullanma. Hesap açmak için geçerli yaşta ve ehliyette olduğunu beyan edersin.'],
      ['Topluluk kuralları (sıfır tolerans)', 'Vayb "kendini değil gördüğün güzel anı paylaş" fikrine dayanır. Yasak: taciz, zorbalık, nefret söylemi, tehdit; spam; uygunsuz/müstehcen veya yasa dışı içerik; başkasının haklarını ihlal eden içerik; çocukların istismarına ilişkin her tür içerik. Uygunsuz içeriğe sıfır tolerans uygulanır.'],
      ['İçeriğin', 'Paylaştığın içerikten sen sorumlusun ve paylaşmak için gerekli haklara sahip olduğunu beyan edersin. Bize yalnızca hizmeti sunmak amacıyla sınırlı, telifsiz bir kullanım izni verirsin; içeriğin sana aittir.'],
      ['Moderasyon', 'Kullanıcıları/gönderileri şikayet edebilir, kullanıcıları engelleyebilirsin. Kuralları ihlal eden içerik ve hesaplar kaldırılabilir, kısıtlanabilir veya askıya alınabilir.'],
      ['Hesap güvenliği', 'Hesabının ve şifrenin güvenliğinden sen sorumlusun. Hesabını dilediğin zaman silebilirsin.'],
      ['Kabul edilmeyen kullanım', 'Sahte etkileşim/sayaç manipülasyonu, otomatik erişim, başkası adına işlem veya güvenlik önlemlerini atlatma yasaktır.'],
      ['Üçüncü taraf hizmetleri', 'Uygulama Google Firebase ve Google Places gibi hizmetlere dayanır; bu hizmetlerin kendi koşulları geçerli olabilir.'],
      ['Sorumluluk ve fesih', `Hizmet "olduğu gibi" sunulur. Yasaların izin verdiği ölçüde ${DEV_NAME} dolaylı zararlardan sorumlu tutulamaz. Bu koşulları ihlal eden hesapların erişimini sonlandırabiliriz.`],
      ['Değişiklikler ve iletişim', `Koşulları güncelleyebiliriz; önemli değişiklikleri uygulama içinde duyururuz. Sorular için: ${SUPPORT_EMAIL}`],
    ],
  },
};

export default function LegalScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const kind = route?.params?.kind === 'terms' ? 'terms' : 'privacy';
  const doc = DOCS[kind];

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          {doc.title}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, lineHeight: 21, marginTop: spacing.sm, marginBottom: spacing.xl }}>
          {doc.intro}
        </Text>
        {doc.sections.map(([heading, body]) => (
          <View key={heading} style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary, marginBottom: spacing.xs }}>
              {heading}
            </Text>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, lineHeight: 21 }}>
              {body}
            </Text>
          </View>
        ))}
        <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: spacing.md }}>
          Son güncelleme: {LEGAL_DATE} · Sürüm 1.0
        </Text>
      </ScrollView>
    </Screen>
  );
}
