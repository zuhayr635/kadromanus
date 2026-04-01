import { createLicense } from './server/license-manager.ts';

async function main() {
  try {
    console.log('Test lisansı oluşturuluyor...');
    const result = await createLicense(
      'pro',
      'Test Yayıncı',
      'test@kadrokur.com',
      30, // 30 gün
      2,  // max 2 oturum
      500 // max 500 oyuncu
    );

    if (result.success) {
      console.log('\n✅ Lisans başarıyla oluşturuldu!');
      console.log('Lisans Anahtarı:', result.licenseKey);
      console.log('Paket: Pro');
      console.log('Süre: 30 gün');
      console.log('Max Oturum: 2');
      console.log('Max Oyuncu: 500');
    } else {
      console.log('❌ Hata:', result.message);
    }
  } catch (error) {
    console.error('Hata:', error);
  }
}

main();
