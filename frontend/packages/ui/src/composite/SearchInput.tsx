import * as React from 'react';
import { cn } from '../lib/cn';
import { Search, X, Clock, TrendingUp, type LucideIcon } from 'lucide-react';

export interface SearchSuggestion {
  id: string;
  label: string;
  type: 'history' | 'suggestion' | 'category' | 'divider-history' | 'divider-suggestions' | 'divider-trending';
  icon?: LucideIcon;
  count?: number;
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  showRecentSearches?: boolean;
  maxRecentSearches?: number;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const STORAGE_KEY = 'zentric_buyer_search_history';
const MAX_HISTORY = 8;

function getStoredHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToHistory(query: string): void {
  if (typeof window === 'undefined') return;
  if (!query.trim()) return;
  try {
    const history = getStoredHistory();
    const filtered = history.filter((q) => q.toLowerCase() !== query.toLowerCase());
    const updated = [query.trim(), ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Buscar por nombre o especificación técnica...',
  suggestions = [],
  recentSearches = [],
  showRecentSearches = true,
  maxRecentSearches = 5,
  className,
  disabled = false,
  autoFocus = false,
  'aria-label': ariaLabel = 'Buscar productos',
  'aria-describedby': ariaDescribedBy,
}: SearchInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Merge recent searches from props and localStorage
  const mergedRecentSearches = React.useMemo(() => {
    const stored = getStoredHistory();
    const combined = [...new Set([...recentSearches, ...stored])];
    return combined.slice(0, maxRecentSearches);
  }, [recentSearches, maxRecentSearches]);

  // Build all dropdown items
  const dropdownItems = React.useMemo((): SearchSuggestion[] => {
    const items: SearchSuggestion[] = [];

    // Recent searches
    if (showRecentSearches && mergedRecentSearches.length > 0) {
      items.push({
        id: 'divider-history',
        label: 'Búsquedas recientes',
        type: 'history',
      });
      mergedRecentSearches.forEach((search, index) => {
        items.push({
          id: `history-${index}`,
          label: search,
          type: 'history',
          icon: Clock,
        });
      });
    }

    // Suggestions from props (e.g., product names, categories)
    if (suggestions.length > 0) {
      if (items.length > 0) {
        items.push({
          id: 'divider-suggestions',
          label: 'Sugerencias',
          type: 'suggestion',
        });
      }
      suggestions.forEach((suggestion, index) => {
        items.push({
          id: `suggestion-${index}`,
          label: suggestion.label,
          type: 'suggestion',
          icon: suggestion.icon,
          count: suggestion.count,
        });
      });
    }

    // Trending categories (if no specific suggestions)
    if (items.length === 0 && !value.trim()) {
      items.push({
        id: 'divider-trending',
        label: 'Categorías populares',
        type: 'category',
      });
      const trending = [
        { label: 'Laptops y Computadoras', icon: TrendingUp },
        { label: 'Teclados Mecánicos', icon: TrendingUp },
        { label: 'Monitores Gaming', icon: TrendingUp },
        { label: 'Licencias Cloud', icon: TrendingUp },
      ];
      trending.forEach((t, index) => {
        items.push({
          id: `trending-${index}`,
          label: t.label,
          type: 'category',
          icon: t.icon,
        });
      });
    }

    return items;
  }, [mergedRecentSearches, suggestions, showRecentSearches, value]);

  // Handle keyboard navigation
  React.useEffect(() => {
    function handleKeyDown(e: React.KeyboardEvent) {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = Math.min(selectedIndex + 1, dropdownItems.length - 1);
          setSelectedIndex(nextIndex);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = Math.max(selectedIndex - 1, -1);
          setSelectedIndex(prevIndex);
          break;
        }
        case 'Enter': {
          if (selectedIndex >= 0 && dropdownItems[selectedIndex]) {
            e.preventDefault();
            handleSelectItem(dropdownItems[selectedIndex]);
          } else if (value.trim() && onSearch) {
            onSearch(value.trim());
            saveToHistory(value.trim());
            setShowDropdown(false);
          }
          break;
        }
        case 'Escape':
          setShowDropdown(false);
          inputRef.current?.blur();
          break;
        case 'Tab':
          setShowDropdown(false);
          break;
      }
    }

    if (isFocused) {
      inputRef.current?.addEventListener('keydown', handleKeyDown as unknown as EventListener);
    }
    return () => {
      inputRef.current?.removeEventListener('keydown', handleKeyDown as unknown as EventListener);
    };
  }, [isFocused, selectedIndex, dropdownItems, value, onSearch]);

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
          setShowDropdown(false);
        }
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleSelectItem = (item: SearchSuggestion) => {
    if (item.type === 'divider-history' || item.type === 'divider-suggestions' || item.type === 'divider-trending') {
      return;
    }
    onChange(item.label);
    if (onSearch) {
      onSearch(item.label);
    }
    saveToHistory(item.label);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowDropdown(true);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (mergedRecentSearches.length > 0 || suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Delay to allow click on dropdown items
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
    setShowDropdown(false);
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearHistory();
    setShowDropdown(true); // Keep dropdown open to show empty state
  };

  const filteredItems = dropdownItems.filter(
    (item) =>
      item.type !== 'divider-history' &&
      item.type !== 'divider-suggestions' &&
      item.type !== 'divider-trending'
  );

  const hasSelectableItems = filteredItems.length > 0;
  const isSelectedItem = (index: number) => selectedIndex === index && hasSelectableItems;

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <Search
          className={cn(
            'absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 pointer-events-none transition-colors',
            isFocused ? 'text-brand' : 'text-foreground-muted'
          )}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={() => {}}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-expanded={showDropdown && hasSelectableItems}
          aria-autocomplete="list"
          aria-controls={hasSelectableItems ? 'search-dropdown' : undefined}
          aria-activedescendant={
            selectedIndex >= 0 && dropdownItems[selectedIndex]
              ? dropdownItems[selectedIndex].id
              : undefined
          }
          className={cn(
            'w-full rounded-lg border border-border bg-background/80 py-2.5 pl-11 pr-32 text-sm text-foreground placeholder:text-foreground-muted',
            'transition-all duration-150 ease-out-expo',
            'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'hover:border-border/80',
            isFocused && 'shadow-[0_0_0_3px_var(--brand)/0.15] ring-1 ring-brand'
          )}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (value.trim() && onSearch) {
              onSearch(value.trim());
              saveToHistory(value.trim());
              setShowDropdown(false);
            } else if (!value.trim()) {
              setShowDropdown(!showDropdown);
              inputRef.current?.focus();
            }
          }}
          disabled={disabled || !value.trim()}
          className={cn(
            'absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-semibold text-background transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            value.trim() ? 'bg-brand hover:bg-brand-strong' : 'bg-surface-muted text-foreground-muted hover:bg-surface'
          )}
          aria-label={value.trim() ? 'Buscar' : 'Abrir sugerencias'}
        >
          {value.trim() ? 'Buscar' : 'Ver'}
        </button>
      </div>

      {/* Dropdown con sugerencias e historial */}
      {showDropdown && hasSelectableItems && (
        <div
          ref={dropdownRef}
          id="search-dropdown"
          role="listbox"
          className="absolute z-50 mt-1.5 w-full max-h-96 rounded-xl border border-border bg-surface shadow-xl overflow-hidden scrollbar-thin"
        >
          {dropdownItems.map((item, index) => {
            const isDivider =
              item.type === 'divider-history' ||
              item.type === 'divider-suggestions' ||
              item.type === 'divider-trending';
            const isSelected = isSelectedItem(index);

            if (isDivider) {
              return (
                <div
                  key={item.id}
                  className="px-3 py-1.5 text-[11px] font-semibold text-foreground-muted uppercase tracking-wider bg-surface-muted border-b border-border-subtle"
                  role="separator"
                >
                  {item.label}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                id={item.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectItem(item);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors',
                  'hover:bg-brand/5 hover:text-brand',
                  isSelected && 'bg-brand/10 text-brand outline-none'
                )}
              >
                {item.icon && (
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      item.type === 'history' ? 'text-foreground-muted' : 'text-brand'
                    )}
                    aria-hidden="true"
                  />
                )}
                <span className="flex-1 truncate">{item.label}</span>
                {item.count !== undefined && (
                  <span className="text-[11px] font-mono text-foreground-muted tabular-nums">
                    {item.count} resultados
                  </span>
                )}
                {item.type === 'history' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Remove from history
                      const history = getStoredHistory();
                      const filtered = history.filter((q) => q !== item.label);
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
                      // Force re-render by triggering a state update
                      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
                    }}
                    className="ml-2 p-0.5 rounded text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors"
                    aria-label={`Eliminar "${item.label}" del historial`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </button>
            );
          })}

          {/* Clear history button */}
          {showRecentSearches && mergedRecentSearches.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-foreground-muted hover:text-danger hover:bg-danger/5 transition-colors border-t border-border-subtle"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar historial
            </button>
          )}

          {/* Empty state */}
          {!hasSelectableItems && (
            <div className="px-3 py-4 text-center text-sm text-foreground-muted">
              Escribe para buscar productos, categorías o marcas...
            </div>
          )}
        </div>
      )}

      {/* Focus ring for accessibility */}
      {isFocused && (
        <div
          className="absolute inset-0 rounded-lg ring-2 ring-brand/50 ring-offset-2 ring-offset-background pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
}