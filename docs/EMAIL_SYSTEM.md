# Dokumentasi Sistem Email (Resend Integration)

Sistem ini menggunakan **Resend API** melalui Supabase Edge Functions untuk mengirim email transaksional dan notifikasi.

## 1. Arsitektur

- **Edge Function**: `supabase/functions/send-email`
  - Menangani komunikasi dengan Resend API.
  - Melakukan templating sederhana.
  - Mencatat log pengiriman ke database.
- **Database**: Tabel `public.email_logs`
  - Menyimpan riwayat semua email yang dikirim (sukses/gagal).
- **Service**: `services/emailService.ts`
  - Wrapper TypeScript untuk memanggil fungsi dari frontend.

## 2. Konfigurasi

Sebelum menggunakan, Anda harus mengatur API Key di Supabase Dashboard:

1. Dapatkan API Key dari [Resend Dashboard](https://resend.com/api-keys).
2. Verifikasi domain Anda di Resend.
3. Buka **Supabase Dashboard** > **Edge Functions** > **send-email** > **Secrets**.
4. Tambahkan secret baru:
   - Name: `RESEND_API_KEY`
   - Value: `re_123456...` (Key Anda)

## 3. Cara Penggunaan

### Dari Frontend (React)

```typescript
import { sendEmail, sendWelcomeEmail } from './services/emailService';

// Contoh 1: Kirim Welcome Email
await sendWelcomeEmail('user@example.com', 'Budi');

// Contoh 2: Email Custom
await sendEmail({
  to: 'client@company.com',
  subject: 'Laporan Bulanan',
  type: 'custom',
  html: '<h1>Laporan</h1><p>Berikut adalah data bulan ini...</p>'
});
```

### Dari Backend (Edge Functions lain)

```typescript
// Anda bisa memanggil function via fetch jika diperlukan, 
// tapi lebih baik import logika shared jika memungkinkan.
// Saat ini, pola yang disarankan adalah memanggil API Resend langsung di function tersebut 
// ATAU invoke function 'send-email' via Supabase client.
```

## 4. Templating

Template didefinisikan di `supabase/functions/send-email/index.ts` dalam fungsi `getTemplate`.
Tipe yang didukung saat ini:
- `welcome` (Data: `name`, `actionUrl`)
- `notification` (Data: `message`)
- `custom` (Menggunakan HTML mentah)

## 5. Monitoring & Logs

Semua aktivitas email dicatat di tabel `email_logs`.
Anda dapat melihatnya via Supabase Table Editor atau membuat halaman Admin Log.

Query SQL untuk melihat error:
```sql
select * from email_logs where status = 'failed' order by created_at desc;
```

## 6. Batasan (Quota)

- **Resend Free Tier**: 3000 email/bulan, 100 email/hari.
- **Supabase Edge Function**: 500K invokasi/bulan (Free Tier).

Pastikan untuk memantau penggunaan di Dashboard masing-masing.
