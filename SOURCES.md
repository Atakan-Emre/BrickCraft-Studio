# Model ve geometri kaynakları

## Ferrari F40
- Özgün model: https://library.ldraw.org/omr/sets/1187
- Dosya: https://library.ldraw.org/library/omr/10248-1.mpd
- Yazar: Magnus Forsberg [MagFors]
- Lisans: Creative Commons Attribution 2.0, https://creativecommons.org/licenses/by/2.0/
- Özgün dosya `public/models/sources/car.mpd` içinde değiştirilmeden korunur.
- Değişiklik: alt model matrislerinin fiziksel parçalara açılması, JSON ve bağımsız geometri paketleri.
- Kaynakta çıkartmalar eksiktir. Dosyada 1.157 fiziksel öğe, 260 parça/renk çeşidi vardır.

## Eyfel Kulesi
- Özgün model: https://library.ldraw.org/omr/sets/81
- Dosya: https://library.ldraw.org/library/omr/21019-1.mpd
- Yazar: Damien Roux [Darats]; esnek aks geometrisi Orion Pobursky [OrionP]
- Lisans: Creative Commons Attribution 2.0, https://creativecommons.org/licenses/by/2.0/
- Özgün dosya `public/models/sources/eiffel.mpd` içinde değiştirilmeden korunur.
- Değişiklik: alt model matrislerinin fiziksel parçalara açılması, JSON ve bağımsız geometri paketleri.
- 320 fiziksel öğe, 52 parça/renk çeşidi. Esnek aks tek bir özel öğe olarak korunur.

## Carriage House
- Proje: https://github.com/mjhorvath/Mike-LDraw-Models
- Dosya: https://raw.githubusercontent.com/mjhorvath/Mike-LDraw-Models/master/source/ldr_carriage_house_newer.mpd
- Yazar: Michael Horvath
- Model lisansı: Creative Commons Attribution-ShareAlike 4.0, https://creativecommons.org/licenses/by-sa/4.0/
- Özgün dosya ve lisans: `public/models/sources/house.mpd`, `house-LICENSE.txt`.
- Değişiklik: alt grupların matrislerle açılması, 23 ışık/kamera yardımcısının görünümden ve envanterden çıkarılması. 1.698 fiziksel öğe, 343 parça/renk çeşidi.
- Bu modelden türetilmiş `house.json` ve modele özel sanatsal varlıklar aynı CC BY-SA 4.0 lisansıyla sağlanır. Uygulama kodu model lisansına dahil değildir.
- Han Solo karbonit baskısı, özgün dosyanın geometrik desen alternatifiyle çizilir; küçük baskı ayrıntıları farklı olabilir.

## Sakura Bonsai / Cherry Blossoms
- Özgün model: https://library.ldraw.org/omr/sets/1383
- Dosya: https://library.ldraw.org/library/omr/10281-1_Cherry-Blossoms.mpd
- Yazar: Orion Pobursky [OrionP]. Lisans: CC BY 2.0, https://creativecommons.org/licenses/by/2.0/
- 751 fiziksel öğe, 87 parça/renk çeşidi. Sakura varyantı; kutudaki alternatif yaprak envanterini içermez.
- Özgün MPD `public/models/sources/bonsai.mpd` içinde değiştirilmeden korunur.

## NASA Space Shuttle Discovery
- Özgün model: https://library.ldraw.org/omr/sets/1443
- Dosya: https://library.ldraw.org/library/omr/10283-1.mpd
- Yazar: Orion Pobursky [OrionP]. Lisans: CC BY 2.0, https://creativecommons.org/licenses/by/2.0/
- 2.318 fiziksel öğe, 516 parça/renk çeşidi. Hubble teleskobu açık konumda gösterilir.
- Kaynak, teleskobun mekik bağlantı braketi ile katlı güneş paneli borularını içermez. TEXMAP görselleri kaynak MPD içine gömülü değildir; bazı etiket resimleri görünmez.
- Özgün MPD `public/models/sources/shuttle.mpd` içinde değiştirilmeden korunur.

## Çiçek Buketi / Flower Bouquet
- Özgün model: https://library.ldraw.org/omr/sets/1382
- Dosya: https://library.ldraw.org/library/omr/10280-1.mpd
- Yazar: Orion Pobursky [OrionP]. Lisans: CC BY 2.0, https://creativecommons.org/licenses/by/2.0/
- 750 fiziksel öğe, 79 parça/renk çeşidi.
- Özgün MPD `public/models/sources/bouquet.mpd` içinde değiştirilmeden korunur.

Yeni modellerin alt grupları, özgün dönüşüm matrisleri korunarak fiziksel öğelere açıldı. Kaynak yazar ve lisans bilgileri tüm bağımsız geometri paketlerinde korunur. `public/models/previews/` içindeki görseller bu modellerden Three.js ile üretilmiştir; ilgili model lisansları ve atıfları geçerlidir. `house.png` CC BY-SA 4.0 altında sağlanır.

## LDraw parça kütüphanesi
- https://www.ldraw.org/
- Arşiv: https://library.ldraw.org/library/updates/complete.zip
- Yazarlar ve parça başına CC BY 2.0 / CC BY 4.0 bildirimleri, paketlenen her DAT dosyasının başlığında korunur.
- `public/ldraw/CAreadme.txt`, `CAlicense.txt`, `CAlicense4.txt` ve `LDConfig.ldr` dağıtıma dahildir.

## Görüntüleme
- Three.js LDrawLoader: https://threejs.org/docs/pages/LDrawLoader.html
- Three.js TransformControls: https://threejs.org/docs/pages/TransformControls.html
- Arayüz simgeleri: Phosphor Icons. Yazı tipi: Inter.

Bu çalışma LEGO Group tarafından desteklenmez veya onaylanmaz. LDraw model yazarlarının atıfları uygulamadaki kaynak penceresinden de erişilebilir.
