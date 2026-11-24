export default function App() {
  const modules = [
    {
      title: 'DIN Rayı ve Pano Yerleşimi',
      description: 'Sigorta, kaçak akım rölesi, kontaktör ve klemens yerleşimi için çalışma alanı.',
      status: 'Hazırlanıyor',
    },
    {
      title: 'Yük ve Kablo Kesiti Hesabı',
      description: 'Toplam güç, akım, gerilim düşümü ve uygun sigorta seçimi hesaplamaları.',
      status: 'Planlandı',
    },
    {
      title: 'Malzeme Listesi (BOM)',
      description: 'Panoda kullanılan tüm elemanların otomatik listelenmesi ve dışa aktarımı.',
      status: 'Planlandı',
    },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="badge">v0.1.0 • Başlangıç İskeleti</div>
        <h1>Elektrik Pano Tasarım</h1>
        <p className="subtitle">
          React + TypeScript + Vite ile oluşturulmuş elektrik pano tasarım çalışma ortamı.
        </p>
      </header>

      <main className="card-grid">
        {modules.map((item) => (
          <section className="card" key={item.title}>
            <span className="status-tag">{item.status}</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
