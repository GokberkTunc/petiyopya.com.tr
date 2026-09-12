# Petiyopya - Eskişehir Yerel Evcil Hayvan Mağazası (Pet Shop)

Petiyopya için özel olarak tasarlanmış; online sepet/satış karmaşası yerine **tamamen Google aramalarında öne çıkmaya, Eskişehir'deki yerel müşteriyi fiziki mağazaya çekmeye ve doğrudan iletişime (Arama / WhatsApp / Yol Tarifi)** odaklanan modern, ultra hızlı ve hafif vitrin web sitesi.

---

## 🚀 Özellikler & Odak Noktaları

- **Sıfır Build & Anında Yükleme:** Cloudflare Pages üzerinde derleme beklemeden doğrudan kök dizindeki (`index.html`) statik varlıklarla ışık hızında çalışır.
- **Yerel SEO & Schema.org:** Google botları ve Haritalar için `schema.org/PetStore` tipinde eksiksiz JSON-LD yapılandırılmış verisi, coğrafi koordinatlar (`TR-26`, Eskişehir) ve Open Graph sosyal paylaşım kartları.
- **Canlı Çalışma Durumu Rozeti:** Ziyaretçinin o anki gün ve saatine göre otomatik hesaplanan *"Şu Anda Açık (20:00'a kadar)"* veya *"Yarın 09:00'da Açılıyor"* akıllı bildirim rozeti.
- **Mobil Odaklı İletişim:** Mobilde sayfa boyunca parmak ucunda kalan sabit alt bar:
  - 📞 **Hemen Ara** (`tel:`)
  - 🗺️ **Yol Tarifi Al** (Google Haritalar navigasyon linki)
  - 💬 **WhatsApp** (Tek tıkla hazır stok sorgulama mesajı)
- **Sosyal Kanıt & Google Yorumları:** 5.0 Google İşletme puanı rozeti, doğrulanmış müşteri yorumları ve doğrudan işletme profiline yönlendiren değerlendirme butonu.
- **Canlı Görsel Düzenleyici (In-Line WYSIWYG):** URL sonuna `#admin` ekleyerek veya `Ctrl + Shift + E` tuşlayarak sayfayı Word/FrontPage gibi doğrudan düzenleyebilir, tek tıkla GitHub API üzerinden Cloudflare Pages'e canlı commit gönderebilirsiniz.

---

## ✏️ Gelişmiş Canlı Görsel Düzenleyici (In-Line WYSIWYG Suite)

Site sahibi olarak herhangi bir kod editörü veya teknik bilgiye ihtiyaç duymadan sitenizi tarayıcıdan görsel olarak baştan sona yönetebilirsiniz:

1. **Aktivasyon:** Sitenizi açıp adres çubuğunun sonuna `#admin` ekleyin (örn: `petiyopya.com.tr/#admin`) veya klavyenizden **`Ctrl + Shift + E`** kısayoluna basın.
2. **Kimlik Doğrulama:** İlk girişte açılan pencereye `repo` yetkisine sahip GitHub Personal Access Token (PAT) bilginizi girin. Token güvenli bir şekilde yalnızca sizin tarayıcınızın `localStorage` alanında saklanır, kaynak kodda veya sunucuda tutulmaz.
3. **Zengin Metin Biçimlendirme (Floating Bubble Toolbar):**
   - Herhangi bir metni seçtiğinizde hemen üzerinde mini biçimlendirme çubuğu belirir.
   - **B** Kalın, *I* İtalik, <u>U</u> Altı Çizili, <s>S</s> Üstü Çizili
   - **6 Özel Renk:** Petiyopya Amber Sarısı, Zümrüt Yeşili, Sıcak Kiremit, Marka Moru, Koyu Gri, Beyaz.
   - **🔗 Bağlantı:** Seçilen metne kolayca web URL'si veya `tel:` linki bağlama/kaldırma.
   - **🧹 Temizle:** Seçilen metindeki biçimlendirmeyi sıfırlama.
4. **Kart Yönetimi (Çoğaltma & Silme):**
   - Kategori kartları, Google müşteri yorumları ve SSS (akordeon) kutucuklarının üzerine geldiğinizde sağ üst köşede `➕ Kopyala` ve `🗑️ Sil` butonları belirir.
   - Tek tıkla yeni ürün/kategori ekleyebilir veya mevcut olanı çoğaltıp metinlerini düzenleyebilirsiniz.
5. **Görsel Değiştirici:**
   - Resimlerin üzerine geldiğinizde sol üstte `📷 Resmi Değiştir` butonu belirir. Yeni görsel yolu/URL'si ve SEO alt etiketini hızlıca tanımlayabilirsiniz.
6. **↩️ Geri Al / ↪️ İleri Al:** Yapılan değişiklikleri adım adım geri veya ileri alma imkanı.
7. **👁️ Müşteri Önizleme Modu:** Tek tıkla düzenleme çizgilerini gizleyip sitenizi normal bir ziyaretçinin deneyimlediği gibi (tüm buton ve bağlantılarıyla) test edebilirsiniz.
8. **💾 Canlıya Kaydetme:** Sağ altta açılan çubuktan **"💾 Canlıya Kaydet"** butonuna basın. Sayfa DOM'u tüm düzenleyici elementlerinden ve geçici sınıflardan arındırılır, UTF-8 Base64 formatında GitHub API'ye commit atılır ve Cloudflare Pages yaklaşık 20 saniye içinde sitenizi tüm dünyada canlıya alır.

---

## 🛠️ İletişim Bilgilerini Güncelleme (`STORE_CONFIG`)

Sayfanın en başında yer alan `STORE_CONFIG` nesnesi sayesinde telefon, WhatsApp, adres ve Google Haritalar bağlantılarını tek bir yerden kolayca değiştirebilirsiniz:

```javascript
const STORE_CONFIG = {
  name: "Petiyopya",
  city: "Eskişehir",
  phone: "+905550002626",              // Arama için tel: formatı
  phoneDisplay: "0 (555) 000 26 26",    // Ekranda görünen numara
  whatsapp: "905550002626",            // wa.me formatı (başında + olmadan)
  whatsappMessage: "Merhaba Petiyopya! ...",
  email: "petiyopya@gmail.com",
  address: "Bahçelievler Mah. Prof. Dr. Orhan Oğuz Cad. 59/A Tepebaşı/Eskişehir",
  mapsDirectUrl: "https://www.google.com/maps/search/?api=1&query=Bah%C3%A7elievler+Mah.+Prof.+Dr.+Orhan+O%C4%9Fuz+Cad.+59%2FA+Tepeba%C5%9F%C4%B1+Eski%C5%9Fehir",
  mapsReviewUrl: "https://maps.google.com/?q=Bah%C3%A7elievler+Mah.+Prof.+Dr.+Orhan+O%C4%9Fuz+Cad.+59%2FA+Tepeba%C5%9F%C4%B1+Eski%C5%9Fehir"
};
```

---

## ☁️ Cloudflare Pages Dağıtımı

1. GitHub deponuzu Cloudflare Pages hesabınıza bağlayın.
2. Ayarları aşağıdaki gibi yapılandırın:
   - **Framework preset:** `None`
   - **Build command:** *(Boş bırakın)*
   - **Build output directory:** `/` veya `.`
3. Dağıtımı başlatın. `main` dalına yapılan her push işlemi anında yayına yansıyacaktır.

---

© Petiyopya Petshop. Eskişehir, Türkiye.
