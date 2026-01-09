# Panduan Integrasi DOKU Payment Gateway

Integrasi ini menggunakan **Supabase Edge Functions** untuk menangani pembuatan link pembayaran DOKU secara aman (menghasilkan Signature di server-side).

## 1. Persiapan

Pastikan Anda telah memiliki akun DOKU Sandbox:
- Login ke [DOKU Sandbox Back Office](https://bo-sandbox.doku.com/)
- Ambil **Client ID** dan **Secret Key** dari menu Integration > API Keys.

Pastikan project Anda menggunakan Supabase dan Anda telah menginstal [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started).

## 2. Deploy Edge Function

Kode backend untuk integrasi ini berada di `supabase/functions/doku-payment/index.ts`.

Jalankan perintah berikut di terminal untuk men-deploy fungsi ini ke project Supabase Anda:

```bash
# Login ke Supabase (jika belum)
npx supabase login

# Deploy fungsi "doku-payment"
npx supabase functions deploy doku-payment
```

## 3. Konfigurasi Environment Variables

Agar fungsi dapat berjalan, Anda perlu mendaftarkan kredensial DOKU Anda sebagai *secrets* di Supabase.

Jalankan perintah ini (ganti nilai dengan kredensial asli Anda):

```bash
npx supabase secrets set DOKU_CLIENT_ID="MCH-XXXX-XXXX" DOKU_SECRET_KEY="SK-XXXX-XXXX"
```

## 4. Konfigurasi Callback (PENTING)

Saat ini, integrasi frontend hanya melakukan **Redirect ke halaman pembayaran**.
Untuk **menambahkan Token secara otomatis** setelah pembayaran sukses, Anda perlu menangani **Notification Callback** dari DOKU.

1.  Buat fungsi baru atau modifikasi `doku-payment` untuk menerima POST request dari DOKU (Notification).
2.  Verifikasi Signature dari notifikasi tersebut.
3.  Update database (`user_tokens`) berdasarkan `order_id` yang dibayar.
4.  Set URL callback ini di Dashboard DOKU.

## 5. Testing

1.  Buka aplikasi (Localhost atau Production).
2.  Klik tombol "Top Up Token".
3.  Pilih paket dan klik Beli.
4.  Anda akan diarahkan ke halaman pembayaran DOKU Simulator.
5.  Lakukan simulasi pembayaran.

Link dokumentasi resmi: [DOKU Developers](https://developers.doku.com/docs/checkout-api/overview)
