import { useState, useMemo, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, Printer, ArrowLeft, ShieldCheck, Scale, FileText, Cookie } from 'lucide-react';
import {
  legalDocumentsData,
  LEGAL_METADATA,
  type LegalTabKey,
  type LegalChapter,
} from './legalDocumentsData';

interface LegalCenterPageProps {
  defaultTab?: LegalTabKey;
}

const TAB_CONFIG: Array<{ key: LegalTabKey; label: string; icon: typeof FileText }> = [
  { key: 'terms', label: 'Términos y Condiciones', icon: FileText },
  { key: 'privacy', label: 'Tratamiento de Datos', icon: ShieldCheck },
  { key: 'cookies', label: 'Cookies', icon: Cookie },
  { key: 'consumer', label: 'Estatuto del Consumidor', icon: Scale },
];

export function LegalCenterPage({ defaultTab = 'terms' }: LegalCenterPageProps) {
  const [activeTab, setActiveTab] = useState<LegalTabKey>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapterId, setActiveChapterId] = useState<string>('');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const activeDoc = legalDocumentsData[activeTab];

  // Filtrado de capítulos y cláusulas
  const filteredChapters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeDoc.chapters;

    return activeDoc.chapters
      .map((chapter) => {
        const matchesChapterMeta =
          chapter.title.toLowerCase().includes(q) ||
          chapter.num.toLowerCase().includes(q) ||
          chapter.summary.toLowerCase().includes(q);

        const matchingSubclauses = chapter.subclauses.filter(
          (sub) =>
            sub.title.toLowerCase().includes(q) ||
            sub.code.toLowerCase().includes(q) ||
            sub.text.toLowerCase().includes(q),
        );

        if (matchesChapterMeta) {
          return chapter;
        }

        if (matchingSubclauses.length > 0) {
          return {
            ...chapter,
            subclauses: matchingSubclauses,
          };
        }

        return null;
      })
      .filter((ch): ch is LegalChapter => ch !== null);
  }, [activeDoc, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const handleTabChange = (key: LegalTabKey) => {
    setActiveTab(key);
    setSearchQuery('');
    setActiveChapterId('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted/40 text-foreground transition-colors duration-200 antialiased">
      {/* ── Barra Superior Delicada de Marca (Print Hidden) ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] pointer-events-none no-print">
        <div className="h-full w-full bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400" />
      </div>

      {/* ── Cabecera Exclusiva para Impresión (@media print) ── */}
      <div className="hidden print:block print:border-b print:border-black print:pb-4 print:mb-6">
        <h1 className="text-xl font-bold">
          zentric. — Documentación Legal y Contractual Oficial
        </h1>
        <p className="text-xs text-zinc-600">
          {LEGAL_METADATA.legalEntity} · {LEGAL_METADATA.nit} · {LEGAL_METADATA.commercialRegistry}
        </p>
        <p className="text-xs text-zinc-500">
          Versión {LEGAL_METADATA.contractVersion} · {LEGAL_METADATA.jurisdiction} · Ley 527 de 1999,
          Ley 1480 de 2011 y Ley 1581 de 2012
        </p>
      </div>

      {/* ── Sub-Header de Navegación del Centro Legal ── */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 backdrop-blur-md no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/buyer"
              className="flex items-center gap-1 text-lg font-bold tracking-tight text-foreground"
              aria-label="Zentric Marketplace"
            >
              <span>zentric</span>
              <span className="text-teal-600 dark:text-teal-400 font-black">.</span>
            </Link>
            <span className="hidden md:inline-block h-4 w-px bg-border" />
            <span className="hidden md:inline-block text-xs font-semibold text-foreground-muted">
              Centro Legal y Normativo
            </span>
          </div>

          {/* Selector de pestañas de navegación */}
          <nav
            className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1"
            aria-label="Documentos legales"
          >
            {TAB_CONFIG.map(({ key, label }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabChange(key)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-surface-muted text-teal-700 dark:text-teal-400 font-semibold shadow-2xs'
                      : 'text-foreground-muted hover:bg-surface-muted/60 font-medium'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Acciones: Imprimir y Volver */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface-muted text-xs font-medium text-foreground transition-colors"
              title="Imprimir PDF"
            >
              <Printer className="size-3.5 text-foreground-muted" />
              <span className="hidden md:inline">Imprimir PDF</span>
            </button>

            <Link
              to="/buyer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline pl-1"
            >
              <ArrowLeft className="size-3" />
              <span>Volver</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Contenedor Principal: Layout Lateral Sticky + Documento ── */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 print:w-full print:max-w-full print:p-0">
        {/* Barra Lateral: Buscador + Índice TOC + Metadatos */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-20 lg:self-start space-y-4 no-print">
          {/* Buscador reactivo */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar capítulo o término…"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none transition-colors"
            />
          </div>

          {/* Índice de Capítulos (Sticky TOC) */}
          <div className="rounded-xl border border-border/80 bg-surface p-3.5 shadow-2xs">
            <div className="pb-2 mb-2 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Capítulos del contrato
              </span>
              <span
                data-testid="active-doc-badge"
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-foreground-muted font-semibold"
              >
                {activeDoc.badge}
              </span>
            </div>

            <nav
              className="space-y-1 text-xs max-h-[calc(100vh-220px)] overflow-y-auto pr-1 no-scrollbar"
              aria-label="Índice de capítulos"
            >
              {filteredChapters.map((chapter) => {
                const isSelected = activeChapterId === chapter.id;
                return (
                  <a
                    key={chapter.id}
                    href={`#${chapter.id}`}
                    onClick={() => setActiveChapterId(chapter.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-surface-muted text-foreground font-semibold'
                        : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted/60'
                    }`}
                  >
                    <span className="truncate pr-2">{chapter.title}</span>
                    <span className="font-mono text-[10px] opacity-60 shrink-0">
                      {chapter.num.replace('Capítulo ', 'C.')}
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Ficha Técnica de Auditoría Normativa */}
          <div className="rounded-xl border border-border/80 bg-surface/60 p-3.5 text-xs text-foreground-muted space-y-1.5">
            <div className="flex justify-between items-center">
              <span>Versión contractual:</span>
              <span className="font-mono font-semibold text-foreground">
                {LEGAL_METADATA.contractVersion}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Última revisión:</span>
              <span className="font-medium text-foreground">{LEGAL_METADATA.lastRevision}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Jurisdicción:</span>
              <span className="font-medium text-foreground">{LEGAL_METADATA.jurisdiction}</span>
            </div>
          </div>
        </aside>

        {/* Contenido Central del Documento Legal */}
        <section className="flex-1 min-w-0 space-y-6">
          <header className="border-b border-border/80 pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {activeDoc.title}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-foreground-muted leading-relaxed">
              {activeDoc.desc}
            </p>
          </header>

          {/* Lista de Capítulos Renderizados */}
          <div className="space-y-8">
            {filteredChapters.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                <Search className="size-8 mx-auto text-foreground-subtle" />
                <h3 className="text-sm font-semibold text-foreground">
                  No se encontraron cláusulas o capítulos
                </h3>
                <p className="text-xs text-foreground-muted">
                  No hay coincidencias para &quot;{searchQuery}&quot; en {activeDoc.title}. Prueba con
                  otro término.
                </p>
              </div>
            ) : (
              filteredChapters.map((chapter, index) => (
                <article
                  key={chapter.id}
                  id={chapter.id}
                  className={`scroll-mt-20 space-y-4 print:break-inside-avoid print:pt-4 print:border-t print:border-zinc-300 ${
                    index > 0 ? 'pt-8 border-t border-border/80' : ''
                  }`}
                >
                  {/* Encabezado del Capítulo */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-surface-muted text-foreground-muted">
                        {chapter.num}
                      </span>
                      <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                        {chapter.title}
                      </h2>
                    </div>

                    {/* Resumen Normativo en Lenguaje Claro (Plain Language Callout) */}
                    <div className="rounded-r-md border-l-2 border-border bg-surface-muted/50 p-3 space-y-1 print:bg-zinc-100 print:border-zinc-500">
                      <span className="text-xs font-semibold text-foreground">
                        Resumen normativo del capítulo:
                      </span>
                      <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed font-normal">
                        {chapter.summary}
                      </p>
                    </div>
                  </div>

                  {/* Sub-Cláusulas Legales Detalladas */}
                  <div className="space-y-4 pl-1 sm:pl-3">
                    {chapter.subclauses.map((sub) => (
                      <div key={sub.code} className="space-y-1.5 text-sm sm:text-[15px] leading-relaxed">
                        <h3 className="font-bold text-sm sm:text-base text-foreground flex items-baseline gap-2">
                          <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                            {sub.code}.
                          </span>
                          <span>{sub.title}</span>
                        </h3>
                        <div
                          className="text-foreground-muted pl-4 border-l-2 border-border font-normal text-xs sm:text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: sub.text }}
                        />
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {/* ── Pie Legal Institucional (Print Hidden) ── */}
      <footer className="mt-auto border-t border-border/80 bg-surface py-5 px-4 text-xs text-foreground-muted no-print transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {LEGAL_METADATA.legalEntity} · {LEGAL_METADATA.nit} · {LEGAL_METADATA.commercialRegistry}
            </span>
          </div>
          <div>
            <span>
              Regulado por la legislación comercial colombiana (Ley 527 de 1999, Ley 1480 de 2011 y
              Ley 1581 de 2012)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
