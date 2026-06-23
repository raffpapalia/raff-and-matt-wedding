'use client';

import { useRef, useState } from 'react';

interface RefTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface RefTabsProps {
  tabs: RefTab[];
}

// Accessible tablist (WAI-ARIA Authoring Practices "tabs" pattern): roving
// tabindex, arrow-key/Home/End navigation, aria-selected, and only the active
// panel rendered visible. Defaults to the first tab in the array.
export default function RefTabs({ tabs }: RefTabsProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function activate(index: number) {
    const tab = tabs[index];
    if (!tab) return;
    setActiveId(tab.id);
    tabRefs.current[tab.id]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      activate((index + 1) % tabs.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      activate((index - 1 + tabs.length) % tabs.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      activate(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      activate(tabs.length - 1);
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Reference" className="mr-tabs">
        {tabs.map((tab, i) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[tab.id] = el; }}
              type="button"
              role="tab"
              id={`mr-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`mr-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={e => handleKeyDown(e, i)}
              className={`mr-tab${selected ? ' is-active' : ''}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map(tab => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`mr-panel-${tab.id}`}
          aria-labelledby={`mr-tab-${tab.id}`}
          hidden={tab.id !== activeId}
          className="mr-tab-panel"
        >
          {tab.id === activeId && tab.content}
        </div>
      ))}
    </div>
  );
}
