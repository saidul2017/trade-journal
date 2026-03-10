# 📊 Trading Journal Pro

Aplikasi **Trading Journal Pro** adalah jurnal trading berbasis web yang dirancang untuk membantu trader forex dan crypto mencatat, menganalisis, dan mengevaluasi setiap trade secara terstruktur dan disiplin.

---

## ✨ Fitur Utama

- **📋 Trade Log** — Catat setiap trade lengkap dengan entry, SL, TP, lot, pair, strategi, sesi, dan emosi
- **📈 Dashboard Analytics** — Pantau performa dengan KPI lengkap:
  - Win Rate, Total P/L, Average Risk, Profit Factor
  - Compliance Rate, Expectancy, Max Drawdown
  - 6 chart interaktif: Equity Curve, Distribusi Emosi, Performa Strategi, Risk vs R-Multiple, Hari Terbaik, Sesi Terbaik
- **✅ Checklist Pre-Trade** — 18 item checklist wajib sebelum entry (Teknikal, Risiko, Market, Psikologi, Administratif)
- **💾 Export / Import**:
  - Export ke **JSON** untuk backup data lengkap
  - Export ke **CSV** untuk analisis di spreadsheet
  - Import dari file JSON

---

## 🖥️ Screenshot

> *(Tambahkan screenshot aplikasi di sini)*

---

## 🚀 Cara Penggunaan

### Secara Lokal

1. Clone repositori ini:
   ```bash
   git clone https://github.com/saidul2017/trade-journal.git
   ```
2. Buka file `index.html` di browser Anda (tidak perlu server)

### Via GitHub Pages

Akses langsung di:  
👉 `https://saidul2017.github.io/trade-journal/`

---

## 🛠️ Tech Stack

- **HTML5** — Struktur halaman
- **CSS3** — Styling dengan CSS Variables, dark theme, animasi
- **Vanilla JavaScript (ES6+)** — Logika aplikasi tanpa framework
- **[Chart.js](https://www.chartjs.org/)** — Library chart interaktif
- **localStorage** — Penyimpanan data di browser (tidak perlu server/database)
- **GitHub Actions** — CI/CD untuk deploy ke GitHub Pages

---

## 📁 Struktur File

```
trade-journal/
├── index.html          # Halaman utama aplikasi
├── style.css           # Semua styling CSS
├── app.js              # Semua logika JavaScript
├── .github/
│   └── workflows/
│       └── static.yml  # GitHub Actions workflow untuk GitHub Pages
├── .gitignore
├── LICENSE
└── README.md
```

---

## 📝 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).