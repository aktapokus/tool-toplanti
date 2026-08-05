# Toplantı Notları — Kullanım Kılavuzu

Toplantı Notları, konuştuğunuz bir toplantıyı kaydedip kimin ne zaman
konuştuğunu ayırt ederek Türkçe bir tutanak/özet çıkaran bir asistandır.

## İlk kurulum

Tool kurulurken bir HuggingFace erişim token'ı istenir (konuşmacı ayrımı
için gerekli). Girmediyseniz, ekranın üstündeki **"⚙ Bağlantı Ayarları"**
bölümünden sonradan da girebilirsiniz — detaylı adımlar için README.md'ye
bakın.

## Kayıt alma

**1.** **"● Kaydı Başlat"**a basın — tarayıcı mikrofon izni isteyecek,
izin verin. Toplantı bitince **"■ Kaydı Durdur"**a basın.

**2.** Toplantıyı başka bir cihazla (telefon, Teams/Zoom kaydı gibi) zaten
kaydettiyseniz, **"veya"** yazısının yanındaki dosya seçme kutusundan o ses
dosyasını (mp3/wav/m4a gibi) yükleyebilirsiniz.

**3.** Kayıt/yükleme bitince ses arka planda işlenir — bu birkaç dakika
sürebilir (uzun toplantılarda daha uzun), sabırlı olun. Sayfa bu sırada
başka bir işlem için kullanılabilir.

## Transkripti düzenleme

İşlem bitince ekranda "Konuşmacı 1", "Konuşmacı 2" gibi etiketlerle
ayrılmış tam transkript görünür. İsterseniz her konuşmacının adını gerçek
ismiyle değiştirebilirsiniz (sadece bu ekranda görünür, kalıcı bir kayıt
değildir).

## Not oluşturma

**"📝 Not Oluştur"**a basınca notun kaydedileceği klasörü seçmeniz istenir.
Ardından yapay zeka, transkripti okuyup bir özet + gündem maddeleri +
alınan kararlar + aksiyon maddeleri çıkarır. Beğenirseniz **"✓ Kaydet"**e
basarak seçtiğiniz klasöre bir not dosyası (Markdown, herhangi bir metin
düzenleyicide açılabilir) olarak kaydedin.

## Geri alma

Kaydettikten hemen sonra beliren **"↩ Geri Al"** butonu, az önce
oluşturduğunuz not dosyasını siler. Sayfayı kapatıp tekrar açarsanız bu
buton görünmeyebilir — aynı oturum içinde kullanmanız önerilir.

## Sık sorulan sorular

**Ses kaydım nerede saklanıyor?**
Hiçbir yerde kalıcı olarak saklanmıyor — sadece işlenirken geçici olarak
tutulur, transkript çıkarılır çıkarılmaz otomatik silinir. Kalıcı olarak
saklanan tek şey, kaydetmeyi onayladığınız not dosyasıdır.

**Aynı kişi farklı toplantılarda farklı numarayla ("Konuşmacı 2" yerine
"Konuşmacı 1" gibi) çıkabilir mi?**
Evet — konuşmacı numaraları sadece o toplantı için geçerlidir, farklı
toplantılar arasında kimlik hatırlanmaz (bu, gelecekte eklenebilecek bir
özellik).
