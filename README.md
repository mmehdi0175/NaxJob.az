# NaxJob.az

Azərbaycan iş elanları platforması — işəgötürənlər vakansiya yerləşdirir, namizədlər CV yaradıb müraciət edir.

## Texnologiyalar

| Kateqoriya | Texnologiya |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Test | Vitest + Testing Library + jsdom |
| Lint | ESLint 9 + typescript-eslint |

## Tələblər

- **Node.js 18+** (tövsiyə olunan: 20 LTS)
- **npm** (layihə `package-lock.json` istifadə edir)

## Quraşdırma

```bash
# 1. Paketləri quraşdır
npm install

# 2. Mühit dəyişənlərini hazırla
cp .env.example .env
# .env faylına öz Supabase URL və anon key dəyərlərini daxil et
```

### Mühit dəyişənləri

Layihə işləmək üçün aşağıdakı dəyişənlər tələb olunur (`.env` faylında):

| Dəyişən | Təsviri |
|---|---|
| `VITE_SUPABASE_URL` | Supabase layihənin URL-i (məs: `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon açarı (public key) |

Bu dəyərləri Supabase dashboard → Settings → API bölməsindən əldə edə bilərsiniz.

## Əmrlər

```bash
npm run dev          # Lokal dev server (http://localhost:5173)
npm run build        # Production build (dist/ qovluğuna)
npm run preview      # Build olunmuş layihəni preview et
npm run typecheck    # TypeScript tip yoxlaması
npm run lint         # ESLint yoxlaması
npm run test         # Testləri bir dəfə işə sal
npm run test:watch   # Testləri watch rejimində işə sal
npm run test:coverage # Test coverage hesabatı
```

## Layihə strukturu

```
project/
├── src/
│   ├── App.tsx                  # Marşrutlaşdırma (router)
│   ├── main.tsx                 # Giriş nöqtəsi
│   ├── index.css                # Tailwind + qlobal stillər
│   ├── components/              # Paylaşılan komponentlər
│   ├── context/                 # React context-lər (Auth)
│   ├── hooks/                   # Custom hook-lar
│   ├── lib/                     # Konfiqurasiya, utils, i18n, supabase client
│   ├── pages/                   # Səhifə komponentləri
│   │   ├── Homepage.tsx         # Əsas səhifə (vahid interfeys)
│   │   ├── admin/               # Admin panel səhifələri
│   │   ├── auth/                # Giriş və qeydiyyat səhifələri
│   │   ├── candidate/           # Namizəd kabineti səhifələri
│   │   └── employer/            # İşəgötürən paneli səhifələri
│   ├── types/                   # TypeScript tipləri
│   └── test/                    # Test konfiqurasiyası
├── supabase/
│   ├── config.toml              # Supabase Edge Function konfiqurasiyası
│   ├── functions/               # Edge Functions (Deno)
│   └── migrations/              # Verilənlər bazası miqrasiyaları (SQL)
├── public/                      # Statik fayllar
├── .env.example                 # Mühit dəyişənləri nümunəsi
├── package.json
├── tsconfig.json                # TypeScript konfiqurasiyası
├── vite.config.ts               # Vite konfiqurasiyası
├── tailwind.config.js           # Tailwind CSS konfiqurasiyası
├── eslint.config.js             # ESLint konfiqurasiyası
└── _redirects                   # SPA redirect qaydası (Netlify/Bolt deploy üçün)
```

## Backend (Supabase)

Layihə Supabase-dən istifadə edir:

- **PostgreSQL** — 16 miqrasiya faylı `supabase/migrations/` qovluğunda
- **Auth** — email/parol autentifikasiyası
- **Storage** — CV faylları üçün `cvs` bucket
- **Edge Functions** — `auth-verification` (email doğrulama)

### Miqrasiyalar

Bütün SQL miqrasiyaları `supabase/migrations/` qovluğunda saxlanılır. Supabase dashboard-da SQL Editor vasitəsilə və ya Supabase CLI ilə tətbiq oluna bilər.

### Edge Functions

`supabase/functions/auth-verification/` — email doğrulama kodu göndərir və yoxlayır.

## Xarici xidmətlər

Layihə tam funksional işləmək üçün aktiv Supabase layihəsi tələb edir. Supabase olmadan yalnız frontend hissə görsənər, lakin məlumat yüklənməyəcək.

## VS Code üçün tövsiyələr

Layihəni VS Code-da açdıqdan sonra `.vscode/extensions.json` faylında tövsiyə olunan extension-ləri quraşdırın:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Next

## Deployment

Layihə Bolt.new mühitində deploy olunur. `_redirects` faylı bütün marşrutları `index.html`-ə yönləndirir (SPA rejimi).
